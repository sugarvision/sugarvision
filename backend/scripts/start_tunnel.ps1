<#
.SYNOPSIS
  Sobe o FastAPI (YOLOv8x) localmente e o expõe via Cloudflare Tunnel (HTTPS público).

.DESCRIPTION
  1. Valida RAM livre e presença dos pesos best.pt (136 MB).
  2. Inicia `cloudflared tunnel --url http://127.0.0.1:8000` e captura a URL https://*.trycloudflare.com.
  3. Exporta BASE_URL=<url do túnel> para que `image_url` devolvido pela API seja acessível
     pelo navegador (senão apontaria para 127.0.0.1 e quebraria no frontend da Vercel).
  4. Inicia o uvicorn (sem --reload, para não duplicar o modelo na RAM) na porta 8000.
  5. Imprime o valor a configurar em NEXT_PUBLIC_API_URL na Vercel.

.EXAMPLE
  .\backend\scripts\start_tunnel.ps1
#>
param(
    [int]$Port = 8000,
    [double]$MinFreeRamGB = 3.0
)

$ErrorActionPreference = "Stop"
$BackendDir = Split-Path -Parent $PSScriptRoot
$ModelPath  = Join-Path $BackendDir "best.pt"
$TunnelLog  = Join-Path $env:TEMP "sugarvision_cloudflared.log"

# --- 1. Pré-requisitos ---------------------------------------------------------
if (-not (Test-Path $ModelPath)) { throw "Pesos não encontrados: $ModelPath" }

$freeGB = [math]::Round((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory / 1MB, 2)
Write-Host "RAM livre: $freeGB GB (mínimo recomendado: $MinFreeRamGB GB)"
if ($freeGB -lt $MinFreeRamGB) {
    Write-Warning "RAM livre baixa para carregar o YOLOv8x. Feche outros programas."
}

if (-not (Get-Command cloudflared -ErrorAction SilentlyContinue)) {
    throw "cloudflared não encontrado. Instale com: winget install --id Cloudflare.cloudflared -e"
}

$python = Join-Path $BackendDir "venv\Scripts\python.exe"
if (-not (Test-Path $python)) { $python = "python" }

# --- 2. Túnel ------------------------------------------------------------------
if (Test-Path $TunnelLog) { Remove-Item $TunnelLog -Force }
$tunnel = Start-Process cloudflared `
    -ArgumentList "tunnel", "--url", "http://127.0.0.1:$Port", "--no-autoupdate", "--logfile", $TunnelLog `
    -PassThru -WindowStyle Hidden

$publicUrl = $null
for ($i = 0; $i -lt 40 -and -not $publicUrl; $i++) {
    Start-Sleep -Milliseconds 500
    if (Test-Path $TunnelLog) {
        $m = Select-String -Path $TunnelLog -Pattern "https://[a-z0-9-]+\.trycloudflare\.com" -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($m) { $publicUrl = $m.Matches[0].Value }
    }
}
if (-not $publicUrl) {
    Stop-Process -Id $tunnel.Id -Force -ErrorAction SilentlyContinue
    throw "Não foi possível obter a URL do túnel. Veja: $TunnelLog"
}

Write-Host ""
Write-Host "==================================================================" -ForegroundColor Green
Write-Host " URL pública do túnel : $publicUrl" -ForegroundColor Green
Write-Host " Configure na Vercel  : NEXT_PUBLIC_API_URL=$publicUrl" -ForegroundColor Green
Write-Host " (Settings > Environment Variables > Redeploy)" -ForegroundColor Green
Write-Host "==================================================================" -ForegroundColor Green
Write-Host ""

# --- 3. API --------------------------------------------------------------------
$env:BASE_URL = $publicUrl
Push-Location $BackendDir
try {
    & $python -m uvicorn main:app --host 0.0.0.0 --port $Port
}
finally {
    Pop-Location
    Stop-Process -Id $tunnel.Id -Force -ErrorAction SilentlyContinue
    Write-Host "Túnel encerrado."
}
