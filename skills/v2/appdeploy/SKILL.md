---
name: appdeploy
description: Deploy or update AppDeploy apps through the AppDeploy API by preparing `deploy_app` payloads locally, using bundled rules and optional local checks, and sending them directly. Use when the task is to publish or update a web app on AppDeploy with a self-contained skill bundle, diff-first payload guidance, template guidance, and direct API calls.
---

# AppDeploy

Deploy to AppDeploy by preparing a `deploy_app` payload locally, optionally validating it with bundled helpers, and then sending one direct AppDeploy API request.

## Workflow

1. Resolve authentication first.
2. Decide `app_type` and `frontend_template` from the bundled references.
3. For new apps, write `tests/tests.txt` first.
4. Build the local app files and the `deploy_app` payload.
5. Optionally validate the payload with the bundled script before sending it.
6. Send the `deploy_app` request to the AppDeploy API.
7. Poll `get_app_status` until deployment reaches `ready`, `failed`, or `deleted`.

## Project Boundaries

- Work from the current project only.
- Assume this skill bundle contains the AppDeploy-specific guidance needed for standard AppDeploy builds.
- Use only:
  - files inside the current project
  - the bundled skill references
- Do not search sibling repos, parent directories, home-directory folders, Downloads, or unrelated workspaces for AppDeploy examples, templates, or backend code unless the user explicitly asks.
- Do not scan the local filesystem for "how AppDeploy usually does this". The skill bundle is the default guidance.
- Do not browse `appdeploy.ai/mcp-docs` or call AppDeploy helper tools such as `get_app_template`, `get_deploy_instructions`, or `update_coding_progress`. This bundle already contains the standard template, deploy, and backend guidance needed for normal AppDeploy work.
- For template-backed files, use the exact bundled raw template files under `references/template-files/` as the diff base. Do not recover template text from MCP or web docs.
- If the bundled references and the current project still leave one critical gap, ask the user a focused question instead of exploring unrelated folders.

## Authentication

Look for credentials in this order:

- `APPDEPLOY_API_KEY` and optional `APPDEPLOY_ENDPOINT`
- `.appdeploy` in the current directory only
- `~/.appdeploy`

Expected `.appdeploy` shape:

```json
{
  "api_key": "ak_...",
  "endpoint": "https://api-v2.appdeploy.ai/mcp"
}
```

If no credentials exist, register a fresh API key automatically via AppDeploy:

```bash
curl -X POST https://api-v2.appdeploy.ai/mcp/api-key \
  -H "Content-Type: application/json" \
  -d '{"client_name": "codex"}'
```

Then use the returned `api_key` for deploy requests.

The helper scripts prefer `APPDEPLOY_API_KEY`, then `.appdeploy` in the current directory, then `~/.appdeploy`; if still missing, they fall back to automatic registration.

## Payload Strategy

- Treat the current project's local tree as the source of truth.
- New apps: use TDD. Write `tests/tests.txt` before implementation code.
- For new apps, set `app_id` to `null`, include `description`, and include `frontend_template`.
- For updates, set `app_id` to the existing app id and send only changed files or `deletePaths`.
- For updates, default to `diffs[]` for edits to existing text/code files. Use `content` only for genuinely new files, binary/blob-style payloads, or intentional full replacements.
- For new apps, do not resend template files verbatim. Use `diffs[]` for bundled template files and `content` for genuinely new files.
- For template-backed files, prefer small stable `diffs[]` anchors over whole-file `from`/`to` replacements. Anchor around placeholders, imports, helper declarations, route comments, or short existing blocks that are unlikely to drift.
- Do not use a whole template file as a single `diffs[].from` anchor for template-backed files. Break changes into smaller anchored diffs.
- For template-backed CSS files anchored on `/* STYLES */`, replace only that placeholder with the custom CSS body. Do not include the existing `@tailwind base;`, `@tailwind components;`, or `@tailwind utilities;` prelude again in the `to` text.
- Always include `tests/tests.txt` for new apps.
- Prefer one well-formed deploy request over iterative trial-and-error retries.
- Do not assume `npm` is available.
- If `npm` is already available and the current project clearly uses a Node-based frontend, a quick local install/build can be used as an optional preflight check when helpful.
- If `npm` is unavailable, slow, or unnecessary for the task, skip local framework build steps and rely on AppDeploy's remote deployment build.

Use these references only as needed:

- Direct workflow and execution details: `references/direct-workflow.md`
- Payload rules and constraints: `references/deploy-rules.md`
- Backend architecture and realtime/auth/API patterns: `references/backend-patterns.md`
- Template selection and template-backed files: `references/template-selection.md`
- Raw `html-static` template files for safe `diffs[]`: `references/template-files/html-static/`
- Raw `react-vite` template files for safe `diffs[]`: `references/template-files/react-vite/`
- Raw `nextjs-static` template files for safe `diffs[]`: `references/template-files/nextjs-static/`
- Raw `frontend+backend` backend scaffold for safe `diffs[]`: `references/template-files/frontend+backend/backend/`
- `tests/tests.txt` format: `references/tests-format.md`
- Request body shapes: `references/request-shapes.md`
- Windows/macOS execution paths: `references/runtime-matrix.md`

## Optional Local Validation

Set the skill path once:

```bash
export CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
export APPDEPLOY_SKILL="$CODEX_HOME/skills/appdeploy"
```

If Node is available and you want a local preflight check, write the `deploy_app` arguments to a local JSON file, then validate them:

```bash
node "$APPDEPLOY_SKILL/scripts/check_deploy_payload.mjs" deploy-payload.json
```

To emit the full AppDeploy API request body after validation:

```bash
node "$APPDEPLOY_SKILL/scripts/check_deploy_payload.mjs" deploy-payload.json --jsonrpc > deploy-request.json
```

If Node is unavailable, skip local validation and write `deploy-request.json` directly using `references/request-shapes.md`.

## Execution

Use the OS-native path from `references/runtime-matrix.md`:

- macOS or other curl-based shells:

```bash
"$APPDEPLOY_SKILL/scripts/deploy_app.sh" deploy-request.json
```

- Windows PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File "$env:CODEX_HOME\skills\appdeploy\scripts\deploy_app.ps1" deploy-request.json
```

After `deploy_app`, poll `get_app_status` until the deployment is terminal. Stop on the first terminal state (`ready`, `failed`, or `deleted`). Do not redeploy while status is still `deploying`.

## Optional Tooling

Use official AppDeploy documentation only if the user explicitly asks for it. Do not browse `appdeploy.ai/mcp-docs`, and do not call AppDeploy helper tools such as `get_app_template`, `get_deploy_instructions`, or `update_coding_progress` for standard builds.
