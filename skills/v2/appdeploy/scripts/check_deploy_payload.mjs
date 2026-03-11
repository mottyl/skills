#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const FRONTEND_TEMPLATES = new Set(["html-static", "react-vite", "nextjs-static"]);
const ALLOWED_ENCODINGS = new Set(["utf-8", "utf8", "base64"]);
const TOP_LEVEL_KEYS = new Set([
    "app_id",
    "app_type",
    "app_name",
    "description",
    "frontend_template",
    "files",
    "deletePaths",
    "model",
    "intent",
]);
const TEMPLATE_FILE_PATHS = {
    "html-static": new Set([
        "package.json",
        "vite.config.ts",
        "tsconfig.json",
        "postcss.config.js",
        "tailwind.config.js",
        "index.html",
        "src/styles.css",
        "src/main.ts",
    ]),
    "react-vite": new Set([
        "package.json",
        "vite.config.ts",
        "tsconfig.json",
        "postcss.config.js",
        "tailwind.config.js",
        "index.html",
        "src/main.tsx",
        "src/App.tsx",
        "src/index.css",
    ]),
    "nextjs-static": new Set([
        "package.json",
        "next.config.ts",
        "tsconfig.json",
        "postcss.config.js",
        "tailwind.config.js",
        "pages/_app.tsx",
        "pages/index.tsx",
        "styles/global.css",
    ]),
};
const BACKEND_TEMPLATE_FILE_PATHS = new Set([
    "backend/index.ts",
    "backend/realtime.ts",
]);
const DELETE_PROTECTED_PATHS = new Set([
    "package.json",
    "backend/index.ts",
    "vite.config.ts",
    "next.config.ts",
    "index.html",
    "src/main.ts",
    "src/main.tsx",
    "pages/index.tsx",
]);
const TEMPLATE_CSS_FILE_PATHS = new Set([
    "src/styles.css",
    "src/index.css",
    "styles/global.css",
]);

function usage() {
    console.error(
        "Usage: node check_deploy_payload.mjs <payload.json|-> [--jsonrpc] [--skip-auth]"
    );
}

function normalizePath(value) {
    return String(value ?? "")
        .trim()
        .replace(/\\/g, "/")
        .replace(/^\.\/+/, "")
        .replace(/^\/+/, "")
        .replace(/\/{2,}/g, "/")
        .replace(/\/+$/, "");
}

function isValidPath(value) {
    if (!value || typeof value !== "string") return false;
    if (value.startsWith("/") || value.startsWith("~")) return false;
    if (value.includes("\0")) return false;
    const segments = value.split("/");
    return !segments.some(segment => segment === "" || segment === "." || segment === "..");
}

function isPlainObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
}

function getStem(filePath) {
    return filePath.replace(/\.[^.\\/]+$/, "");
}

function hasTsJsExtension(filePath) {
    const ext = filePath.slice(getStem(filePath).length).toLowerCase();
    return new Set([".ts", ".js", ".tsx", ".jsx"]).has(ext);
}

function validateNoDuplicateStemDifferentExtension(paths) {
    const byStem = new Map();
    for (const filePath of paths.filter(hasTsJsExtension)) {
        const stem = getStem(filePath);
        const values = byStem.get(stem) ?? [];
        values.push(filePath);
        byStem.set(stem, values);
    }
    const errors = [];
    for (const values of byStem.values()) {
        if (values.length < 2) continue;
        const extensions = new Set(values.map(filePath => filePath.slice(getStem(filePath).length).toLowerCase()));
        if (extensions.size > 1) {
            errors.push(
                `Duplicate file stem with different .ts/.js/.tsx/.jsx extensions: ${values.sort().join(", ")}.`
            );
        }
    }
    return errors;
}

function validateViteConfigNoFullReplace(files) {
    const errors = [];
    for (const file of files) {
        if (!file || typeof file !== "object") continue;
        const rawPath = getDeclaredPath(file)?.normalizedPath ?? "";
        if (!/(^|\/)vite\.config\.(ts|js|mjs|cjs)$/i.test(rawPath)) continue;
        if (typeof file.content !== "undefined") {
            errors.push(
                `files[] ("${rawPath}"): do not replace vite.config.* with full content; use diffs[].`
            );
        }
    }
    return errors;
}

function validateTemplateCssPlaceholderDiffs(files) {
    const errors = [];
    for (const file of files) {
        if (!file || typeof file !== "object") continue;
        const rawPath = getDeclaredPath(file)?.normalizedPath ?? "";
        if (!TEMPLATE_CSS_FILE_PATHS.has(rawPath)) continue;
        if (!Array.isArray(file.diffs)) continue;

        for (const diff of file.diffs) {
            if (!diff || typeof diff !== "object") continue;
            if (typeof diff.from !== "string" || typeof diff.to !== "string") continue;
            if (diff.from.trim() !== "/* STYLES */") continue;

            if (
                diff.to.includes("@tailwind base;") ||
                diff.to.includes("@tailwind components;") ||
                diff.to.includes("@tailwind utilities;")
            ) {
                errors.push(
                    `files[] ("${rawPath}"): when replacing the /* STYLES */ placeholder, diff.to must contain only the custom CSS body, not another @tailwind prelude.`
                );
            }
        }
    }
    return errors;
}

function getDeclaredPath(file) {
    const present = ["filename", "path", "file", "name"].filter(
        key => typeof file?.[key] !== "undefined"
    );
    if (present.length !== 1) {
        return {
            rawPath: "",
            normalizedPath: "",
            error:
                present.length === 0
                    ? "missing path field"
                    : `multiple path fields provided (${present.join(", ")})`,
        };
    }
    const rawPath = String(file[present[0]] ?? "");
    return {
        rawPath,
        normalizedPath: normalizePath(rawPath),
        error: null,
    };
}

function findAuthFile(startDir) {
    const candidate = path.join(path.resolve(startDir), ".appdeploy");
    if (fs.existsSync(candidate)) return candidate;
    const homeCandidate = path.join(os.homedir(), ".appdeploy");
    if (fs.existsSync(homeCandidate)) return homeCandidate;
    return null;
}

function resolveAuth() {
    if (process.env.APPDEPLOY_API_KEY) {
        return {
            apiKey: process.env.APPDEPLOY_API_KEY,
            endpoint: process.env.APPDEPLOY_ENDPOINT || "https://api-v2.appdeploy.ai/mcp",
            source: "environment",
        };
    }
    const authFile = findAuthFile(process.cwd());
    if (!authFile) return null;
    try {
        const parsed = JSON.parse(fs.readFileSync(authFile, "utf8"));
        if (typeof parsed?.api_key !== "string" || !parsed.api_key.trim()) return null;
        return {
            apiKey: parsed.api_key.trim(),
            endpoint:
                typeof parsed?.endpoint === "string" && parsed.endpoint.trim()
                    ? parsed.endpoint.trim()
                    : "https://api-v2.appdeploy.ai/mcp",
            source: authFile,
        };
    } catch {
        return null;
    }
}

function readPayload(inputPath) {
    if (inputPath === "-") {
        return JSON.parse(fs.readFileSync(0, "utf8"));
    }
    return JSON.parse(fs.readFileSync(path.resolve(inputPath), "utf8"));
}

function addError(errors, message) {
    errors.push(message);
}

function addWarning(warnings, message) {
    warnings.push(message);
}

function validatePayload(payload, { skipAuth = false } = {}) {
    const errors = [];
    const warnings = [];
    const auth = resolveAuth();

    if (!skipAuth && !auth) {
        addWarning(
            warnings,
            "Authentication not found locally. Validation can continue; the deploy scripts will auto-register a key if needed."
        );
    }

    if (!isPlainObject(payload)) {
        addError(errors, "Payload must be a JSON object.");
        return { errors, warnings, auth };
    }

    for (const key of Object.keys(payload)) {
        if (!TOP_LEVEL_KEYS.has(key)) {
            addWarning(warnings, `Unknown top-level key will be ignored by this checker: ${key}`);
        }
    }

    const isNewApp = payload.app_id === null;
    const isUpdate = typeof payload.app_id === "string" && payload.app_id.trim() !== "";

    if (!(isNewApp || isUpdate)) {
        addError(errors, "app_id must be null for new apps or a non-empty string for updates.");
    }
    if (payload.app_id === "undefined") {
        addError(errors, "app_id must never be the string 'undefined'.");
    }

    if (!["frontend-only", "frontend+backend"].includes(payload.app_type)) {
        addError(errors, "app_type must be 'frontend-only' or 'frontend+backend'.");
    }

    if (typeof payload.app_name !== "string" || !payload.app_name.trim()) {
        addError(errors, "app_name is required.");
    }

    if (typeof payload.model !== "string" || !payload.model.trim()) {
        addError(errors, "model is required.");
    }

    if (typeof payload.intent !== "string" || !payload.intent.trim()) {
        addError(errors, "intent is required.");
    }

    if (isNewApp) {
        if (typeof payload.description !== "string" || !payload.description.trim()) {
            addError(errors, "description is required for new apps.");
        }
        if (!FRONTEND_TEMPLATES.has(payload.frontend_template)) {
            addError(errors, "frontend_template is required for new apps.");
        }
    } else if (typeof payload.frontend_template !== "undefined") {
        addWarning(
            warnings,
            "frontend_template is ignored for updates. Keep it only for new-app payloads."
        );
    }

    const files = Array.isArray(payload.files) ? payload.files : [];
    const deletePaths = Array.isArray(payload.deletePaths) ? payload.deletePaths : [];

    if (files.length === 0 && deletePaths.length === 0) {
        addError(errors, "Provide at least one file or deletePaths entry.");
    }

    if (isNewApp && deletePaths.length > 0) {
        addError(errors, "deletePaths is only valid for updates.");
    }

    errors.push(...validateViteConfigNoFullReplace(files));
    errors.push(...validateTemplateCssPlaceholderDiffs(files));

    const seenFilePaths = new Set();
    const normalizedFilePaths = [];
    const templatePaths = new Set([
        ...(TEMPLATE_FILE_PATHS[payload.frontend_template] ?? []),
        ...(payload.app_type === "frontend+backend" ? BACKEND_TEMPLATE_FILE_PATHS : []),
    ]);

    let hasTestsFile = false;

    for (const [index, file] of files.entries()) {
        if (!file || typeof file !== "object") {
            addError(errors, `files[${index}] must be an object.`);
            continue;
        }

        const declared = getDeclaredPath(file);
        if (declared.error) {
            addError(errors, `files[${index}] ${declared.error}.`);
            continue;
        }

        const filePath = declared.normalizedPath;
        if (!isValidPath(filePath)) {
            addError(errors, `files[${index}] has invalid path: ${declared.rawPath}`);
            continue;
        }

        if (seenFilePaths.has(filePath)) {
            addError(errors, `Duplicate file path in files[]: ${filePath}`);
        }
        seenFilePaths.add(filePath);
        normalizedFilePaths.push(filePath);

        if (filePath === "tests/tests.txt") {
            hasTestsFile = true;
        }

        const hasContent = typeof file.content !== "undefined";
        const hasDiffs = Array.isArray(file.diffs) && file.diffs.length > 0;
        if (!hasContent && !hasDiffs) {
            addError(errors, `files[] (${filePath}) must include content or diffs.`);
            continue;
        }
        if (hasContent && hasDiffs) {
            addError(errors, `files[] (${filePath}) cannot include both content and diffs.`);
            continue;
        }

        if (file.encoding && !ALLOWED_ENCODINGS.has(file.encoding)) {
            addError(errors, `files[] (${filePath}) has invalid encoding: ${file.encoding}`);
        }

        if (hasContent) {
            const contentIsString = typeof file.content === "string";
            const contentIsJsonObject = isPlainObject(file.content);
            if (!contentIsString && !contentIsJsonObject) {
                addError(errors, `files[] (${filePath}) content must be a string or JSON object.`);
            }
            if (contentIsJsonObject && !filePath.endsWith(".json")) {
                addError(errors, `files[] (${filePath}) only .json files may use object content.`);
            }
            if (isNewApp && templatePaths.has(filePath)) {
                addError(
                    errors,
                    `files[] (${filePath}) is template-backed for new apps. Use diffs[] instead of full content.`
                );
            }
        }

        if (hasDiffs) {
            for (const [diffIndex, diff] of file.diffs.entries()) {
                if (!diff || typeof diff !== "object") {
                    addError(errors, `files[] (${filePath}) diff ${diffIndex} must be an object.`);
                    continue;
                }
                if (typeof diff.from !== "string" || diff.from.length === 0) {
                    addError(errors, `files[] (${filePath}) diff ${diffIndex} requires non-empty from.`);
                }
                if (typeof diff.to !== "string") {
                    addError(errors, `files[] (${filePath}) diff ${diffIndex} requires string to.`);
                }
                if (typeof diff.multiple !== "undefined" && typeof diff.multiple !== "boolean") {
                    addError(
                        errors,
                        `files[] (${filePath}) diff ${diffIndex} multiple must be boolean when provided.`
                    );
                }
                if (
                    isNewApp &&
                    templatePaths.has(filePath) &&
                    typeof diff.from === "string" &&
                    diff.from.length > 500
                ) {
                    addWarning(
                        warnings,
                        `files[] (${filePath}) diff ${diffIndex} looks like a large template anchor. Prefer smaller stable anchors over whole-file replacements.`
                    );
                }
            }
        }

        if (payload.app_type === "frontend-only" && filePath.startsWith("backend/")) {
            addError(errors, "frontend-only payloads must not include backend/ files.");
        }
    }

    const normalizedDeletePaths = [];
    const seenDeletePaths = new Set();
    for (const [index, rawEntry] of deletePaths.entries()) {
        if (typeof rawEntry !== "string") {
            addError(errors, `deletePaths[${index}] must be a string path.`);
            continue;
        }
        const normalizedPath = normalizePath(rawEntry);
        if (!isValidPath(normalizedPath)) {
            addError(errors, `deletePaths[${index}] has invalid path: ${rawEntry}`);
            continue;
        }
        if (seenDeletePaths.has(normalizedPath)) {
            addError(errors, `Duplicate path in deletePaths[]: ${normalizedPath}`);
            continue;
        }
        seenDeletePaths.add(normalizedPath);
        if (seenFilePaths.has(normalizedPath)) {
            addError(errors, `deletePaths overlaps files[]: ${normalizedPath}`);
        }
        if (DELETE_PROTECTED_PATHS.has(normalizedPath)) {
            addError(errors, `deletePaths may not remove protected entry point: ${normalizedPath}`);
        }
        normalizedDeletePaths.push(normalizedPath);
    }

    if (isNewApp && !hasTestsFile) {
        addError(errors, "New apps must include tests/tests.txt in files[].");
    }

    errors.push(...validateNoDuplicateStemDifferentExtension(normalizedFilePaths));

    return { errors, warnings, auth };
}

function printSummary(payload, auth, warnings) {
    const mode = payload.app_id === null ? "new app" : "update";
    const fileCount = Array.isArray(payload.files) ? payload.files.length : 0;
    const deleteCount = Array.isArray(payload.deletePaths) ? payload.deletePaths.length : 0;
    console.error(`Payload OK: ${mode}, app_type=${payload.app_type}, files=${fileCount}, deletePaths=${deleteCount}`);
    if (auth) {
        console.error(`Auth OK: ${auth.source}`);
        console.error(`Endpoint: ${auth.endpoint}`);
    }
    if (warnings.length > 0) {
        console.error("Warnings:");
        for (const warning of warnings) {
            console.error(`- ${warning}`);
        }
    }
}

function main() {
    const args = process.argv.slice(2);
    const jsonrpc = args.includes("--jsonrpc");
    const skipAuth = args.includes("--skip-auth");
    const positional = args.filter(arg => !arg.startsWith("--"));
    const inputPath = positional[0];

    if (!inputPath) {
        usage();
        process.exit(1);
    }

    let payload;
    try {
        payload = readPayload(inputPath);
    } catch (error) {
        console.error(`Failed to read payload: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    }

    const { errors, warnings, auth } = validatePayload(payload, { skipAuth });
    if (errors.length > 0) {
        console.error("Payload invalid:");
        for (const error of errors) {
            console.error(`- ${error}`);
        }
        if (warnings.length > 0) {
            console.error("Warnings:");
            for (const warning of warnings) {
                console.error(`- ${warning}`);
            }
        }
        process.exit(1);
    }

    printSummary(payload, auth, warnings);

    if (jsonrpc) {
        process.stdout.write(
            JSON.stringify(
                {
                    jsonrpc: "2.0",
                    id: 1,
                    method: "tools/call",
                    params: {
                        name: "deploy_app",
                        arguments: payload,
                    },
                },
                null,
                2
            ) + "\n"
        );
    }
}

main();
