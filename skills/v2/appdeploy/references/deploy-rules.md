# Deploy Rules

## Required Fields

- Always send `app_id`, `app_name`, `app_type`, `model`, and `intent`.
- New app: `app_id` must be `null`.
- New app: `description` is required.
- New app: `frontend_template` is required.
- Any deploy: at least one of `files[]` or `deletePaths[]` is required.
- Update only: `deletePaths[]` is allowed only when `app_id` is not `null`.

## App Type

- `frontend-only`: no `backend/` files, no backend routes.
- `frontend+backend`: backend template files are part of the base and frontend must call backend routes through `@appdeploy/client`.
- If the app needs server-side secrets, third-party API calls, persistence, auth enforcement, realtime fanout, or AI work, choose `frontend+backend`.

## Template-Based New Apps

- `frontend_template` auto-includes the selected frontend template.
- For `frontend+backend`, backend template files are also auto-included.
- For new apps, use `diffs[]` to modify template-backed files.
- For new apps, use `content` only for files that do not exist in the selected template base.
- Do not send unmodified template files verbatim.

## File Rules

- Each file entry must specify exactly one path field: `filename`, `path`, `file`, or `name`.
- Each file entry must provide exactly one of `content` or `diffs`.
- For edits to existing text/code files, default to `diffs[]`.
- Use `content` for genuinely new files, JSON object content for `.json`, binary/blob payloads, or intentional full replacements.
- Valid encodings: `utf-8`, `utf8`, `base64`.
- Paths must be relative and must not contain `..`, empty segments, or leading `/`.
- `diffs[]` entries require non-empty `from`, string `to`, and optional boolean `multiple`.
- JSON object `content` is only valid for `.json` files.
- Do not full-replace `vite.config.*`; use `diffs[]` so required template settings survive.
- Do not create duplicate stems across `.ts`, `.js`, `.tsx`, and `.jsx` such as `src/App.tsx` plus `src/App.jsx`.

## Platform Package Rules

- Do not add `@appdeploy/client` or `@appdeploy/sdk` to `package.json` dependencies or devDependencies.
- Import `@appdeploy/client` and `@appdeploy/sdk` only via bare module specifiers.
- Do not import those packages through URL/CDN sources such as esm.sh, unpkg, or skypack.

## Template Customization Rules

- Replace `APP_TITLE` in template-backed `index.html` with the real `app_name`.
- For template-backed CSS files using the `/* STYLES */` placeholder anchor, set `to` to only the custom CSS body. Do not repeat the template's existing `@tailwind` prelude inside that replacement.
- For SPAs with client-side routing, use `HashRouter`.
- Do not use absolute client routes with leading `/` inside SPA navigation.

## Tests

- New apps must include `tests/tests.txt`.
- Keep tests aligned with visible behavior.
- Updates that materially change user-visible behavior should update `tests/tests.txt`.

## Update Semantics

- For updates, the remote AppDeploy snapshot is the source of truth.
- Send only changed files or explicit `deletePaths`.
- Do not resend unchanged files.

## Status Loop

- Treat `deploying` as a success-in-progress state.
- Do not redeploy while a matching deployment is already in progress.
- Poll `get_app_status` until terminal state, then react to the result.
