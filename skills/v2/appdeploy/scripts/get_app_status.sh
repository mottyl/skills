#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./lib/auth.sh
source "$SCRIPT_DIR/lib/auth.sh"

APP_ID="${1:-}"
SINCE="${2:-}"
LIMIT="${3:-}"

if [ -z "$APP_ID" ]; then
  echo "Usage: get_app_status.sh <app_id> [since] [limit]" >&2
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required for get_app_status.sh." >&2
  exit 1
fi

if [ -n "$SINCE" ] && ! [[ "$SINCE" =~ ^[0-9]+$ ]]; then
  echo "since must be numeric." >&2
  exit 1
fi

if [ -n "$LIMIT" ] && ! [[ "$LIMIT" =~ ^[0-9]+$ ]]; then
  echo "limit must be numeric." >&2
  exit 1
fi

appdeploy_resolve_auth

APP_ID_ESCAPED="$(appdeploy_json_escape "$APP_ID")"

ARGS=$(
  cat <<EOF
{
  "app_id": "$APP_ID_ESCAPED"$( [ -n "$SINCE" ] && printf ',\n  "since": %s' "$SINCE" )$( [ -n "$LIMIT" ] && printf ',\n  "limit": %s' "$LIMIT" )
}
EOF
)

REQUEST_BODY=$(
  cat <<EOF
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "get_app_status",
    "arguments": $ARGS
  }
}
EOF
)

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
  -d "$REQUEST_BODY"
