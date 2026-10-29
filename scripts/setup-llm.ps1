# Downloads llama.cpp (Vulkan build, works on NVIDIA/AMD/Intel GPUs) and a small open model into .local-llm/.
# Usage: powershell -ExecutionPolicy Bypass -File scripts/setup-llm.ps1
param(
  [string]$Build = "b11946",
  [string]$ModelUrl = "https://huggingface.co/unsloth/Qwen3-0.6B-GGUF/resolve/main/Qwen3-0.6B-Q4_K_M.gguf"
)
$ErrorActionPreference = "Stop"
$root = Join-Path $PSScriptRoot "..\.local-llm"
New-Item -ItemType Directory -Force $root | Out-Null

$bin = Join-Path $root "bin"
if (-not (Test-Path (Join-Path $bin "llama-server.exe"))) {
  $zip = Join-Path $root "llama.zip"
  Write-Host "Downloading llama.cpp $Build (Vulkan)..."
  curl.exe -L --fail -C - -o $zip "https://github.com/ggml-org/llama.cpp/releases/download/$Build/llama-$Build-bin-win-vulkan-x64.zip"
  Expand-Archive -Force $zip $bin
  Remove-Item $zip
}

$model = Join-Path $root (Split-Path $ModelUrl -Leaf)
Write-Host "Downloading model $(Split-Path $ModelUrl -Leaf) (resumable)..."
# Connections to the CDN drop now and then; resume until the file is complete.
for ($try = 1; $try -le 50; $try++) {
  curl.exe -L --fail -C - --retry 5 --retry-all-errors --retry-delay 3 -o $model $ModelUrl
  if ($LASTEXITCODE -eq 0) { break }
  Write-Host "Download interrupted (curl $LASTEXITCODE), resuming... ($try)"
  Start-Sleep -Seconds 3
}
if ($LASTEXITCODE -ne 0) { throw "Model download failed. Re-run this script to resume." }
Write-Host "Done. Start it with: npm run llm"
