#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./lib/auth.sh
source "$SCRIPT_DIR/lib/auth.sh"

if [ "${1:-}" = "" ]; then
  echo "Usage: deploy_app.sh <deploy-request.json>" >&2
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required for deploy_app.sh." >&2
  exit 1
fi

REQUEST_PATH="$1"
if [ ! -f "$REQUEST_PATH" ]; then
  echo "Request file not found: $REQUEST_PATH" >&2
  exit 1
fi

appdeploy_resolve_auth

FAIL_FLAG="--fail"
if curl --help all 2>/dev/null | grep -q -- '--fail-with-body'; then
  FAIL_FLAG="--fail-with-body"
fi

curl --silent --show-error \
  -X POST "$APPDEPLOY_ENDPOINT_RESOLVED" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer $APPDEPLOY_API_KEY_RESOLVED" \
  "$FAIL_FLAG" \
  -d @"$REQUEST_PATH"
