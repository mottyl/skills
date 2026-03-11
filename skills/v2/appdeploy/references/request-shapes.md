# Request Shapes

Use these JSON-RPC envelopes when skipping the local Node checker or when writing request files directly.

## `deploy_app`

Write `deploy-request.json` as:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "deploy_app",
    "arguments": {
      "app_id": null,
      "app_name": "Your App Name",
      "app_type": "frontend-only",
      "description": "Short description for a new app",
      "frontend_template": "react-vite",
      "model": "gpt-5",
      "intent": "Create or update the app as described by the current project files.",
      "files": [
        {
          "path": "tests/tests.txt",
          "content": "# Tests\n\n## Test 1 - App loads [sanity]\nViewport: desktop\nDescription: Verify the app loads and shows the main UI.\n\nSteps:\n1. Navigate to the app\n2. Wait for the main screen\n\nExpected: The primary heading and action are visible.\n"
        },
        {
          "path": "index.html",
          "diffs": [
            {
              "from": "APP_TITLE",
              "to": "Your App Name"
            }
          ]
        }
      ]
    }
  }
}
```

Notes:

- New app: `app_id` is `null`, and include `description` plus `frontend_template`.
- New app: include `tests/tests.txt`, and use `diffs[]` for template-backed files such as `index.html`.
- For template-backed files, prefer short stable anchors such as `APP_TITLE`, placeholder comments, import lines, or small existing JSX/CSS blocks. Avoid whole-file `from` anchors.
- For template-backed CSS placeholder diffs using `/* STYLES */`, make `to` only the custom CSS body. Do not include the template's `@tailwind` prelude again in that replacement.
- Update: set `app_id` to the existing app id and omit `frontend_template`.
- `files[]` entries use exactly one path key and exactly one of `content` or `diffs`.

## `get_app_status`

Write `status-request.json` as:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "get_app_status",
    "arguments": {
      "app_id": "241858788e824de084"
    }
  }
}
```

Optional `arguments` fields:

- `since`: numeric timestamp for incremental log fetches
- `limit`: numeric log limit
