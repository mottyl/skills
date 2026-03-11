param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$RequestPath
)

Set-StrictMode -Version Latest

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $scriptDir 'lib/AppDeployAuth.ps1')

$auth = Resolve-AppDeployAuth
$resolvedRequest = (Resolve-Path -LiteralPath $RequestPath).Path
$body = Get-Content -LiteralPath $resolvedRequest -Raw
$headers = @{
    Accept = 'application/json, text/event-stream'
    Authorization = "Bearer $($auth.ApiKey)"
}

$response = Invoke-RestMethod `
    -Method Post `
    -Uri $auth.Endpoint `
    -Headers $headers `
    -ContentType 'application/json' `
    -Body $body

if ($response -is [string]) {
    Write-Output $response
} else {
    $response | ConvertTo-Json -Depth 100
}
