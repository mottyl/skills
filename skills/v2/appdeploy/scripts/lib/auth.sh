#!/usr/bin/env bash

appdeploy_find_auth_file() {
  local current candidate

  current="$(pwd -P)"
  candidate="$current/.appdeploy"
  if [ -f "$candidate" ]; then
    printf '%s\n' "$candidate"
    return 0
  fi

  candidate="$HOME/.appdeploy"
  if [ -f "$candidate" ]; then
    printf '%s\n' "$candidate"
    return 0
  fi

  return 1
}

appdeploy_extract_json_value() {
  local key="$1"
  local file_path="$2"

  if command -v node >/dev/null 2>&1; then
    node -e '
const fs = require("fs");
const [filePath, key] = process.argv.slice(1);
try {
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const value = parsed && parsed[key];
  if (typeof value === "string") process.stdout.write(value);
} catch {}
' "$file_path" "$key"
    return 0
  fi

  sed -nE "s/.*\"${key}\"[[:space:]]*:[[:space:]]*\"([^\"]*)\".*/\\1/p" "$file_path" | head -n 1
}

appdeploy_extract_json_value_from_string() {
  local key="$1"
  local json="$2"

  if command -v node >/dev/null 2>&1; then
    APPDEPLOY_JSON_INPUT="$json" node -e '
const key = process.argv[1];
try {
  const parsed = JSON.parse(process.env.APPDEPLOY_JSON_INPUT || "");
  const value = parsed && parsed[key];
  if (typeof value === "string") process.stdout.write(value);
} catch {}
' "$key"
    return 0
  fi

  printf '%s' "$json" | sed -nE "s/.*\"${key}\"[[:space:]]*:[[:space:]]*\"([^\"]*)\".*/\\1/p" | head -n 1
}

appdeploy_json_escape() {
  local value="$1"

  value="${value//\\/\\\\}"
  value="${value//\"/\\\"}"
  value="${value//$'\n'/\\n}"
  value="${value//$'\r'/\\r}"
  value="${value//$'\t'/\\t}"

  printf '%s' "$value"
}

appdeploy_register_api_key() {
  local response
  local api_key
  local endpoint="${APPDEPLOY_ENDPOINT_RESOLVED%/}"

  if ! command -v curl >/dev/null 2>&1; then
    echo "curl is required for auto-registration. Install curl or set APPDEPLOY_API_KEY." >&2
    return 1
  fi

  response="$(curl --silent --show-error --fail -X POST "${endpoint}/api-key" \
    -H "Content-Type: application/json" \
    -d '{"client_name":"codex"}')"

  api_key="$(appdeploy_extract_json_value_from_string "api_key" "$response")"
  if [ -z "$api_key" ]; then
    echo "Failed to parse api_key from registration response." >&2
    return 1
  fi

  APPDEPLOY_API_KEY_RESOLVED="$api_key"
  APPDEPLOY_AUTH_SOURCE="registered:${PWD}/.appdeploy"

  local escaped_api_key escaped_endpoint
  escaped_api_key="$(appdeploy_json_escape "$APPDEPLOY_API_KEY_RESOLVED")"
  escaped_endpoint="$(appdeploy_json_escape "$endpoint")"

  printf '%s\n' "{\"api_key\":\"${escaped_api_key}\",\"endpoint\":\"${escaped_endpoint}\"}" > ./.appdeploy
  chmod 600 ./.appdeploy

  export APPDEPLOY_API_KEY_RESOLVED APPDEPLOY_AUTH_SOURCE
  echo "Generated new AppDeploy key and saved to ./.appdeploy" >&2
  return 0
}

appdeploy_resolve_auth() {
  APPDEPLOY_AUTH_SOURCE=""
  APPDEPLOY_API_KEY_RESOLVED="${APPDEPLOY_API_KEY:-}"
  APPDEPLOY_ENDPOINT_RESOLVED="${APPDEPLOY_ENDPOINT:-https://api-v2.appdeploy.ai/mcp}"

  if [ -n "$APPDEPLOY_API_KEY_RESOLVED" ]; then
    APPDEPLOY_AUTH_SOURCE="environment"
    export APPDEPLOY_AUTH_SOURCE APPDEPLOY_API_KEY_RESOLVED APPDEPLOY_ENDPOINT_RESOLVED
    return 0
  fi

  local auth_file api_key endpoint
  if auth_file="$(appdeploy_find_auth_file)"; then
    api_key="$(appdeploy_extract_json_value "api_key" "$auth_file")"
    endpoint="$(appdeploy_extract_json_value "endpoint" "$auth_file")"
    if [ -n "$api_key" ]; then
      APPDEPLOY_API_KEY_RESOLVED="$api_key"
      if [ -n "$endpoint" ]; then
        APPDEPLOY_ENDPOINT_RESOLVED="$endpoint"
      fi
      APPDEPLOY_AUTH_SOURCE="$auth_file"
      export APPDEPLOY_AUTH_SOURCE APPDEPLOY_API_KEY_RESOLVED APPDEPLOY_ENDPOINT_RESOLVED
      return 0
    fi
  fi

  if ! appdeploy_register_api_key; then
    echo "Authentication not found and automatic registration failed. Set APPDEPLOY_API_KEY or create a .appdeploy file." >&2
    return 1
  fi

  export APPDEPLOY_API_KEY_RESOLVED APPDEPLOY_ENDPOINT_RESOLVED APPDEPLOY_AUTH_SOURCE
  return 0
}
