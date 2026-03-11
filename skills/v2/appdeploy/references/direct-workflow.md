# Direct Workflow

## Default Path

Work inside the current project only. Assume the bundled skill files contain the AppDeploy-specific guidance needed for standard builds. Do not search sibling repos or unrelated local folders for AppDeploy examples.

1. Resolve auth from `APPDEPLOY_API_KEY`, `.appdeploy` in the current project, or `~/.appdeploy`. If nothing exists, auto-register a fresh key and write a local `.appdeploy`.
2. Decide `app_type` and `frontend_template`.
3. For new apps, write `tests/tests.txt` first.
4. Build the local project files that represent the intended app.
5. If you will modify template-backed files, load the exact raw template files from `references/template-files/` that match the chosen frontend template and app type.
6. Prepare a `deploy_app` arguments object in `deploy-payload.json`.
7. Optionally validate it with `scripts/check_deploy_payload.mjs` if Node is available.
8. Create `deploy-request.json` from the bundled request shape reference or the checker output.
9. Send exactly one `deploy_app` request using the OS-native script path from `references/runtime-matrix.md`.
10. Poll `get_app_status` every few seconds until `ready`, `failed`, or `deleted`, then stop immediately.

Do not assume `npm` is available. If `npm` is already available and the project clearly uses a Node-based frontend, a quick local install/build can be used as an optional preflight check when helpful. If `npm` is unavailable, slow, or unnecessary for the task, skip local framework build steps and rely on AppDeploy's remote deployment build. When modifying template-backed files, prefer small stable anchors instead of replacing whole template files in one diff. If one exact detail still appears missing after checking the bundled references, ask the user a focused question. The exact template text lives in `references/template-files/`, so do not browse `appdeploy.ai/mcp-docs`, do not call AppDeploy helper tools such as `get_app_template`, `get_deploy_instructions`, or `update_coding_progress`, and do not inspect other local projects to infer the answer. Only use official AppDeploy docs if the user explicitly asks.

## API Request

Send the validated request body to the AppDeploy API endpoint from the resolved auth source:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "deploy_app",
    "arguments": {}
  }
}
```

The bundled checker can emit this wrapper with `--jsonrpc`.
