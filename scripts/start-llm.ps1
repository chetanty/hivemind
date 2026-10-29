# Starts llama-server with the downloaded model on http://127.0.0.1:8080 (OpenAI-compatible API).
param([int]$Port = 8080, [int]$Context = 4096, [string]$Device = "Vulkan0")
$ErrorActionPreference = "Stop"
$root = Join-Path $PSScriptRoot "..\.local-llm"
$server = Get-ChildItem -Recurse -Filter "llama-server.exe" (Join-Path $root "bin") | Select-Object -First 1
$model = Get-ChildItem -Filter "*.gguf" $root | Sort-Object Length -Descending | Select-Object -First 1
if (-not $server -or -not $model) { throw "Run scripts/setup-llm.ps1 first." }
Write-Host "Serving $($model.Name) on port $Port"
& $server.FullName -m $model.FullName --port $Port -c $Context -ngl 99 --device $Device --jinja --alias $model.BaseName
