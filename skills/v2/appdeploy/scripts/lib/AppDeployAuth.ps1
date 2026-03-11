Set-StrictMode -Version Latest

function Resolve-AppDeployAuth {
    param(
        [string]$StartDirectory = (Get-Location).Path
    )

    if ($env:APPDEPLOY_API_KEY) {
        return [pscustomobject]@{
            ApiKey = $env:APPDEPLOY_API_KEY
            Endpoint = if ($env:APPDEPLOY_ENDPOINT) { $env:APPDEPLOY_ENDPOINT } else { 'https://api-v2.appdeploy.ai/mcp' }
            Source = 'environment'
        }
    }

    $current = [System.IO.Path]::GetFullPath($StartDirectory)
    $candidate = Join-Path $current '.appdeploy'
    if (Test-Path -LiteralPath $candidate) {
        try {
            $parsed = Get-Content -LiteralPath $candidate -Raw | ConvertFrom-Json
            if ($parsed.api_key) {
                return [pscustomobject]@{
                    ApiKey = [string]$parsed.api_key
                    Endpoint = if ($parsed.endpoint) { [string]$parsed.endpoint } else { 'https://api-v2.appdeploy.ai/mcp' }
                    Source = $candidate
                }
            }
        } catch {
        }
    }

    $homeCandidate = Join-Path $HOME '.appdeploy'
    if (Test-Path -LiteralPath $homeCandidate) {
        try {
            $parsed = Get-Content -LiteralPath $homeCandidate -Raw | ConvertFrom-Json
            if ($parsed.api_key) {
                return [pscustomobject]@{
                    ApiKey = [string]$parsed.api_key
                    Endpoint = if ($parsed.endpoint) { [string]$parsed.endpoint } else { 'https://api-v2.appdeploy.ai/mcp' }
                    Source = $homeCandidate
                }
            }
        } catch {
        }
    }

    return Register-AppDeployApiKey
}

function Register-AppDeployApiKey {
    $endpoint = if ($env:APPDEPLOY_ENDPOINT) { $env:APPDEPLOY_ENDPOINT } else { 'https://api-v2.appdeploy.ai/mcp' }
    $base = $endpoint.TrimEnd('/')
    $url = "$base/api-key"

    $payload = @{ client_name = 'codex' } | ConvertTo-Json -Compress
    $response = Invoke-RestMethod -Uri $url -Method Post -ContentType 'application/json' -Body $payload

    if (-not $response.api_key) {
        throw 'Failed to parse api_key from auto-registration response.'
    }

    $appdeployFile = Join-Path (Get-Location).Path '.appdeploy'
    $resolvedEndpoint = if ($response.endpoint) { [string]$response.endpoint } else { $base }
    $json = @{
        api_key = [string]$response.api_key
        endpoint = $resolvedEndpoint
    } | ConvertTo-Json -Depth 2 -Compress
    Set-Content -LiteralPath $appdeployFile -Value $json -NoNewline

    return [pscustomobject]@{
        ApiKey = [string]$response.api_key
        Endpoint = $resolvedEndpoint
        Source = $appdeployFile
    }
}
