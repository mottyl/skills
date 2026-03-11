# Template Selection

## Choose `app_type`

- Use `frontend-only` unless the app needs backend logic.
- Use `frontend+backend` if the app needs persistence, secrets, auth-protected routes, realtime fanout, cron work, or AI calls.
- For features like shared room state, choose `frontend+backend` and implement the backend flow inside the current project rather than searching other local AppDeploy apps for examples.

## Choose `frontend_template`

- `html-static`: simple sites and light interactivity
- `react-vite`: SPAs, dashboards, tools, games
- `nextjs-static`: multi-page apps and static export

## Template-Backed Files

These files already exist in the template base for new apps. Modify them with `diffs[]`, not full `content`.

When you need exact diff anchors, load the matching raw template files under `references/template-files/` instead of calling `get_app_template`.

### `html-static`

- `package.json`
- `vite.config.ts`
- `tsconfig.json`
- `postcss.config.js`
- `tailwind.config.js`
- `index.html`
- `src/styles.css`
- `src/main.ts`

### `react-vite`

- `package.json`
- `vite.config.ts`
- `tsconfig.json`
- `postcss.config.js`
- `tailwind.config.js`
- `index.html`
- `src/main.tsx`
- `src/App.tsx`
- `src/index.css`

### `nextjs-static`

- `package.json`
- `next.config.ts`
- `tsconfig.json`
- `postcss.config.js`
- `tailwind.config.js`
- `pages/_app.tsx`
- `pages/index.tsx`
- `styles/global.css`

### `frontend+backend` auto-included backend files

- `backend/index.ts`
- `backend/realtime.ts`

## Practical Rule

For a new app, the payload should usually contain:

- one or more `diffs[]` entries for template-backed files
- `content` entries for new files such as `tests/tests.txt`, new components, images, or data files

Exact template references:

- `html-static`: `references/template-files/html-static/`
- `react-vite`: `references/template-files/react-vite/`
- `nextjs-static`: `references/template-files/nextjs-static/`
- `frontend+backend` backend scaffold: `references/template-files/frontend+backend/backend/`

Prefer small stable anchors over whole-file replacements when patching these template-backed files. Do not use an entire template file as a single `from` anchor. For AppDeploy-specific backend behavior, rely on `references/backend-patterns.md` plus the exact bundled template files. Do not browse `appdeploy.ai/mcp-docs`, do not call AppDeploy helper tools such as `get_app_template`, and do not search unrelated local folders for example code. Only use official AppDeploy docs if the user explicitly asks.

For template-backed CSS files such as `src/styles.css`, `src/index.css`, and `styles/global.css`, the bundled template already contains the Tailwind prelude plus the `/* STYLES */` placeholder. When anchoring on `/* STYLES */`, replace only that placeholder with the custom CSS body. Do not inject another full file that repeats the `@tailwind` lines.
