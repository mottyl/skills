param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$AppId,
    [Parameter(Position = 1)]
    [Nullable[long]]$Since,
    [Parameter(Position = 2)]
    [Nullable[int]]$Limit
)

Set-StrictMode -Version Latest

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $scriptDir 'lib/AppDeployAuth.ps1')

$auth = Resolve-AppDeployAuth
$headers = @{
    Accept = 'application/json, text/event-stream'
    Authorization = "Bearer $($auth.ApiKey)"
}

$arguments = @{
    app_id = $AppId
}
if ($null -ne $Since) {
    $arguments.since = $Since
}
if ($null -ne $Limit) {
    $arguments.limit = $Limit
}

$request = @{
    jsonrpc = '2.0'
    id = 1
    method = 'tools/call'
    params = @{
        name = 'get_app_status'
        arguments = $arguments
    }
}

$body = $request | ConvertTo-Json -Depth 10
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
