# Runtime Matrix

Use the built-in OS path first. Local validation is optional.

## Windows

- Default runtime: PowerShell
- Send deploy requests with `scripts/deploy_app.ps1`
- Poll status with `scripts/get_app_status.ps1`
- Use `Invoke-RestMethod` for HTTP

## macOS

- Default runtime: shell + `curl`
- Send deploy requests with `scripts/deploy_app.sh`
- Poll status with `scripts/get_app_status.sh`

## Optional Tooling

- If Node is available, `scripts/check_deploy_payload.mjs` can validate `deploy-payload.json` and emit `deploy-request.json`.
- If Node is not available, write the JSON-RPC request directly using `references/request-shapes.md`.
