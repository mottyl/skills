# Backend Patterns

This file is the bundled AppDeploy-specific backend guide for standard `frontend+backend` apps. Use it instead of searching local repos for examples.

## Core Rules

- Choose `frontend+backend` when the app needs persistence, secrets, auth-protected routes, realtime fanout, cron jobs, or AI work.
- New `frontend+backend` apps already include `backend/index.ts` and `backend/realtime.ts` in the template base.
- Modify template-backed backend files with `diffs[]`, not full `content`.
- Treat `@appdeploy/client` and `@appdeploy/sdk` as platform-provided. Do not add them to `package.json` and do not import them via URL/CDN.
- For exact diff anchors, load `references/template-files/frontend+backend/backend/`. Do not call `get_app_template`.

## Frontend and Backend Split

- Frontend imports AppDeploy client helpers from `@appdeploy/client`.
- Frontend must call the AppDeploy backend only through `api.<method>(...)` from `@appdeploy/client`.
- Treat `api` as axios-like. Backend JSON is typically available under `response.data`, so keep frontend DTO handling aligned with the exact route response shape.
- Do not use `fetch('/api/...')` or `axios('/api/...')` for AppDeploy backend routes.
- Backend imports server-side primitives from `@appdeploy/sdk`.
- Backend must never import `@appdeploy/client`.
- Frontend must never import `@appdeploy/sdk`.

## Frontend Realtime Pattern

- For shared entities, do an initial HTTP load first, then subscribe for live updates.
- Use connection-id based subscriptions with the template subscription routes.
- When subscribing to an entity, handle incoming `entity.update` messages by updating local state for that entity type.
- Unsubscribe when leaving the relevant view.
- Do not disconnect the shared socket on normal view changes; keep the connection stable until app teardown or explicit sign-out.

## Backend File Roles

- `backend/index.ts` is the single HTTP entrypoint for backend routes.
- Extend the existing router in `backend/index.ts`; do not invent a second backend entrypoint.
- `backend/realtime.ts` handles connection lifecycle and subscription cleanup.
- For most apps, keep the subscription cleanup behavior in `backend/realtime.ts` and focus changes in `backend/index.ts`.

## Template Helpers Already Present

The template-backed `backend/index.ts` already includes:

- `json(...)` and `error(...)` response helpers
- router scaffolding for route handlers
- auth middleware helpers such as `requireAuth()`, `withScopes(...)`, and `requireAdminEmailAllowlist(...)`
- subscription helpers and `notifySubscribers(...)`
- starter subscription routes for realtime fanout

Use those helpers in the template-backed files and anchor your `diffs[]` against the raw backend template files under `references/template-files/frontend+backend/backend/` instead of searching for other AppDeploy examples.

## Shared State and Realtime Pattern

For shared room state, multiplayer state, or any multi-client entity:

1. Store the canonical entity state in `db`.
2. Expose HTTP routes in `backend/index.ts` to read and mutate that state.
3. After each successful mutation, call `notifySubscribers(entity_type, entity_id, payload, excludeConnectionId)`.
4. Reuse the template's subscription routes (`/api/subscriptions` and `/api/subscriptions/remove`) for client subscription management.
5. Treat frontend state as a cache of backend state, not the source of truth.

## Auth Pattern

- Auth is opt-in. Only use it when the app needs user accounts or protected data.
- Frontend auth uses `auth` from `@appdeploy/client`.
- Protected backend routes use `[requireAuth(), ...]`.
- Use `ctx.user!.userId` to scope user-owned data in backend routes.
- For admin-only behavior, use `requireAdminEmailAllowlist(ADMIN_EMAILS)` with explicit emails supplied by the user.

## AI Pattern

- If the app needs AI, it must be `frontend+backend`.
- Call `ai.*` only in `backend/index.ts`.
- Frontend sends text/files to backend routes through `api`, and the backend performs the AI call.

## Cron Pattern

- Scheduled work is defined in `cron.json` at the project root.
- `cron.json` is a JSON array of cron definitions.
- Each entry uses `{ name, cron, handler, timezone?, payload? }`.
- Keep cron names unique within the app.
- Minimum interval is 5 minutes.
- Maximum 3 crons per app.
- Cron handlers are top-level named exports in `backend/index.ts`, not routes inside the router.

## Last Resort

Assume this bundle contains the AppDeploy-specific backend guidance you need for standard builds. If something still appears missing, ask the user a focused question instead of searching unrelated local folders.
