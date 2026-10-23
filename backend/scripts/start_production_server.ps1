<#
.SYNOPSIS
  Script mestre de producao do SugarVision: sobe FastAPI (YOLO) + Cloudflare Tunnel com um unico comando.

.DESCRIPTION
  1. Verifica dependencias: best.pt, .env, Python/venv, pacotes (requirements.txt) e cloudflared.
  2. Verifica a integridade de GPU/CPU (CUDA + teste real de tensor, carga de CPU e RAM livre).
     Se a GPU estiver defeituosa, forca CPU (CUDA_VISIBLE_DEVICES=-1) em vez de derrubar a API.
  3. Libera a porta da API (padrao 8000): mata processos orfaos que a ocupam (ex.: filho do uvicorn
     --reload) e cloudflared antigos apontando para a mesma porta.
  4. Inicia o cloudflared (quick tunnel), captura a URL https://*.trycloudflare.com e inicia o
     uvicorn com BASE_URL=<url do tunel> (para que image_url funcione fora do localhost).
  5. Aguarda GET /api/health responder 200 e imprime o valor de NEXT_PUBLIC_API_URL (Vercel).
  6. Supervisiona os dois processos: reinicia a API se cair/travar e o tunel se o processo morrer
     ou ficar inacessivel por muito tempo. Oscilacoes curtas de rede sao absorvidas pela
     reconexao automatica do proprio cloudflared; o log registra quando o tunel volta.
  Ctrl+C encerra API e tunel.

.PARAMETER Port
  Porta local da API (padrao 8000).
.PARAMETER BindHost
  Interface do uvicorn (padrao 127.0.0.1; o tunel acessa via loopback). Use 0.0.0.0 para expor na LAN.
.PARAMETER MinFreeRamGB
  RAM livre minima recomendada para o YOLOv8x (apenas aviso).
.PARAMETER CheckIntervalSec
  Intervalo entre verificacoes do supervisor.
.PARAMETER TunnelFailThreshold
  Falhas consecutivas do healthcheck publico antes de reiniciar o cloudflared.
.PARAMETER ApiFailThreshold
  Falhas consecutivas do healthcheck local antes de reiniciar a API.
.PARAMETER MaxApiRestarts
  Maximo de reinicios automaticos da API antes de abortar.
.PARAMETER NoTunnel
  Sobe apenas a API (sem Cloudflare).
.PARAMETER AutoInstall
  Instala automaticamente pacotes ausentes via pip (senao apenas aborta informando).
.PARAMETER CheckOnly
  Executa so as verificacoes (dependencias, GPU/CPU, porta) sem matar processos nem iniciar nada.

.EXAMPLE
  .\backend\scripts\start_production_server.ps1
.EXAMPLE
  .\backend\scripts\start_production_server.ps1 -CheckOnly
#>
[CmdletBinding()]
param(
    [int]$Port = 8000,
    [string]$BindHost = "127.0.0.1",
    [double]$MinFreeRamGB = 3.0,
    [int]$CheckIntervalSec = 10,
    [int]$ApiStartTimeoutSec = 120,
    [int]$TunnelStartTimeoutSec = 30,
    [int]$TunnelFailThreshold = 6,
    [int]$ApiFailThreshold = 4,
    [int]$MaxApiRestarts = 5,
    [switch]$NoTunnel,
    [switch]$AutoInstall,
    [switch]$CheckOnly
)

$ErrorActionPreference = "Stop"
$BackendDir   = Split-Path -Parent $PSScriptRoot
$ModelPath    = Join-Path $BackendDir "best.pt"
$EnvFile      = Join-Path $BackendDir ".env"
$Requirements = Join-Path $BackendDir "requirements.txt"
$ProbeScript  = Join-Path $PSScriptRoot "check_environment.py"
$TunnelLog    = Join-Path $env:TEMP "sugarvision_cloudflared.log"
$LocalHealth  = "http://127.0.0.1:$Port/api/health"

# --- Utilitarios -------------------------------------------------------------
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $color = switch ($Level) { "OK" { "Green" } "WARN" { "Yellow" } "ERROR" { "Red" } default { "Gray" } }
    Write-Host ("[{0}] [{1,-5}] {2}" -f (Get-Date -Format "HH:mm:ss"), $Level, $Message) -ForegroundColor $color
}

function Get-HttpStatus {
    # Retorna o status HTTP (200, 503, ...) ou 0 se nao houve resposta (rede/timeout/DNS).
    param([string]$Url, [int]$TimeoutSec = 10)
    try {
        return [int](Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec $TimeoutSec).StatusCode
    }
    catch {
        $resp = $_.Exception.Response
        if ($resp -and $resp.StatusCode) { return [int]$resp.StatusCode.value__ }
        return 0
    }
}

function Stop-ProcessTree {
    param([int]$ProcessId)
    if ($ProcessId -le 4) { return }
    cmd.exe /c "taskkill /PID $ProcessId /T /F >nul 2>&1" | Out-Null
}

function Get-PortOwners {
    param([int]$LocalPort)
    @(Get-NetTCPConnection -LocalPort $LocalPort -State Listen -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique |
        Where-Object { $_ -gt 4 -and $_ -ne $PID })
}

function Clear-Port {
    # Mata processos (e filhos) que ocupam a porta; reporta apenas se $ReportOnly.
    param([int]$LocalPort, [switch]$ReportOnly)

    $owners = Get-PortOwners -LocalPort $LocalPort
    if ($owners.Count -eq 0) {
        Write-Log "Porta $LocalPort livre." "OK"
    }
    else {
        foreach ($ownerId in $owners) {
            $name = (Get-Process -Id $ownerId -ErrorAction SilentlyContinue).ProcessName
            if (-not $name) { $name = "desconhecido" }
            if ($ReportOnly) {
                Write-Log "Porta $LocalPort ocupada por PID $ownerId ($name) [CheckOnly: nao sera encerrado]." "WARN"
            }
            else {
                Write-Log "Porta $LocalPort ocupada por PID $ownerId ($name) -> encerrando processo orfao." "WARN"
                Stop-ProcessTree -ProcessId $ownerId
            }
        }
        if ($ReportOnly) { return }
        for ($i = 0; $i -lt 20 -and (Get-PortOwners -LocalPort $LocalPort).Count -gt 0; $i++) {
            Start-Sleep -Milliseconds 500
        }
        $left = Get-PortOwners -LocalPort $LocalPort
        if ($left.Count -gt 0) {
            throw "Nao foi possivel liberar a porta $LocalPort (PID(s): $($left -join ', ')). Execute como Administrador."
        }
        Write-Log "Porta $LocalPort liberada." "OK"
    }
}

function Clear-StaleTunnels {
    # cloudflared de execucoes anteriores apontando para esta porta.
    # Chamar SOMENTE na subida, antes de iniciar o tunel desta execucao.
    param([int]$LocalPort, [switch]$ReportOnly)

    $stale = @(Get-CimInstance Win32_Process -Filter "Name='cloudflared.exe'" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -match "127\.0\.0\.1:$LocalPort(\s|$)" })
    foreach ($proc in $stale) {
        if ($ReportOnly) {
            Write-Log "cloudflared antigo (PID $($proc.ProcessId)) apontando para a porta $LocalPort [CheckOnly]." "WARN"
        }
        else {
            Write-Log "Encerrando cloudflared antigo (PID $($proc.ProcessId))." "WARN"
            Stop-ProcessTree -ProcessId $proc.ProcessId
        }
    }
}

# --- 1. Dependencias ---------------------------------------------------------
Write-Log "=== SugarVision :: servidor de producao ==="
Write-Log "[1/4] Verificando dependencias..."

if (-not (Test-Path $ModelPath)) { throw "Pesos do modelo nao encontrados: $ModelPath" }
Write-Log ("Modelo best.pt encontrado ({0} MB)." -f [math]::Round((Get-Item $ModelPath).Length / 1MB, 1)) "OK"

if (-not (Test-Path $EnvFile)) {
    Write-Log ".env ausente em $BackendDir (copie de .env.example); banco/JWT ficarao sem configuracao." "WARN"
}

$python = Join-Path $BackendDir "venv\Scripts\python.exe"
if (-not (Test-Path $python)) {
    $fallback = Get-Command python -ErrorAction SilentlyContinue
    if (-not $fallback) { throw "Python nao encontrado (venv em $BackendDir\venv ou 'python' no PATH)." }
    $python = $fallback.Source
    Write-Log "venv nao encontrado; usando Python do sistema: $python" "WARN"
}

$cloudflared = $null
if (-not $NoTunnel) {
    $cmd = Get-Command cloudflared -ErrorAction SilentlyContinue
    if (-not $cmd) { throw "cloudflared nao encontrado. Instale com: winget install --id Cloudflare.cloudflared -e" }
    $cloudflared = $cmd.Source
    Write-Log "cloudflared: $cloudflared" "OK"
}

$probe = $null
try { $probe = (& $python $ProbeScript 2>$null | Select-Object -Last 1) | ConvertFrom-Json }
catch { throw "Falha ao executar $ProbeScript : $($_.Exception.Message)" }
if (-not $probe) { throw "check_environment.py nao retornou diagnostico (verifique o Python/venv)." }

if ($probe.missing.Count -gt 0) {
    $list = $probe.missing -join ", "
    if ($AutoInstall) {
        Write-Log "Pacotes ausentes ($list); instalando via pip..." "WARN"
        & $python -m pip install -r $Requirements
        if ($LASTEXITCODE -ne 0) { throw "pip install falhou (codigo $LASTEXITCODE)." }
    }
    else {
        throw "Pacotes Python ausentes: $list. Rode: $python -m pip install -r `"$Requirements`" (ou use -AutoInstall)."
    }
}
else {
    Write-Log "Pacotes Python OK (Python $($probe.python))." "OK"
}

# --- 2. Integridade GPU/CPU --------------------------------------------------
Write-Log "[2/4] Verificando integridade de GPU/CPU e memoria..."

$freeGB = [math]::Round((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory / 1MB, 2)
if ($freeGB -lt $MinFreeRamGB) {
    Write-Log "RAM livre: $freeGB GB (< $MinFreeRamGB GB recomendados para o YOLOv8x). Feche outros programas." "WARN"
}
else {
    Write-Log "RAM livre: $freeGB GB." "OK"
}

$cpuLoad = [math]::Round((Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average, 0)
if ($cpuLoad -ge 90) { Write-Log "CPU sob carga alta: $cpuLoad %." "WARN" } else { Write-Log "CPU: carga atual $cpuLoad %." "OK" }

$compute = $probe.compute
$forceCpu = $false
if ($compute.self_test -eq "ok") {
    if ($compute.cuda_available) {
        Write-Log "GPU OK: $($compute.gpu_name) ($($compute.vram_total_gb) GB VRAM) - teste de tensor aprovado." "OK"
    }
    else {
        Write-Log "Sem GPU CUDA; a inferencia rodara na CPU (torch $($compute.torch))." "WARN"
    }
}
else {
    Write-Log "Teste de $($compute.device) FALHOU ($($compute.self_test)): $($compute.error)" "ERROR"
    if ($compute.cuda_available) {
        Write-Log "GPU com defeito: forcando CPU (CUDA_VISIBLE_DEVICES=-1)." "WARN"
        $forceCpu = $true
    }
    else {
        Write-Log "CPU/torch com problema; a API sobe, mas a inferencia pode falhar." "ERROR"
    }
}
$smi = Get-Command nvidia-smi -ErrorAction SilentlyContinue
if ($smi) {
    $smiOut = (& $smi.Source --query-gpu=name,temperature.gpu,memory.used,memory.total --format=csv,noheader 2>$null | Select-Object -First 1)
    if ($smiOut) { Write-Log "nvidia-smi: $smiOut" }
}

# --- 3. Porta ----------------------------------------------------------------
Write-Log "[3/4] Verificando porta $Port..."
Clear-Port -LocalPort $Port -ReportOnly:$CheckOnly
if (-not $NoTunnel) { Clear-StaleTunnels -LocalPort $Port -ReportOnly:$CheckOnly }

if ($CheckOnly) {
    Write-Log "CheckOnly concluido: ambiente pronto." "OK"
    return
}

# --- 4. Subida + supervisao --------------------------------------------------
function Start-TunnelProcess {
    # Inicia o cloudflared e devolve @{ Process; Url } (ou $null se nao obteve a URL).
    if (Test-Path $TunnelLog) { Remove-Item $TunnelLog -Force -ErrorAction SilentlyContinue }
    $proc = Start-Process -FilePath $cloudflared `
        -ArgumentList @("tunnel", "--url", "http://127.0.0.1:$Port", "--no-autoupdate", "--logfile", $TunnelLog) `
        -PassThru -WindowStyle Hidden
    $url = $null
    $deadline = (Get-Date).AddSeconds($TunnelStartTimeoutSec)
    while (-not $url -and (Get-Date) -lt $deadline -and -not $proc.HasExited) {
        Start-Sleep -Milliseconds 500
        if (Test-Path $TunnelLog) {
            $m = Select-String -Path $TunnelLog -Pattern "https://[a-z0-9-]+\.trycloudflare\.com" -ErrorAction SilentlyContinue |
                Select-Object -First 1
            if ($m) { $url = $m.Matches[0].Value }
        }
    }
    if (-not $url) {
        Stop-ProcessTree -ProcessId $proc.Id
        Write-Log "Nao foi possivel obter a URL do tunel. Veja: $TunnelLog" "ERROR"
        return $null
    }
    return @{ Process = $proc; Url = $url }
}

function Start-ApiProcess {
    param([string]$PublicUrl)
    if ($PublicUrl) { $env:BASE_URL = $PublicUrl }
    if ($forceCpu) { $env:CUDA_VISIBLE_DEVICES = "-1" }
    # Sem --reload: evita duplicar o modelo na RAM e filhos orfaos na porta.
    return Start-Process -FilePath $python `
        -ArgumentList @("-m", "uvicorn", "main:app", "--host", $BindHost, "--port", "$Port") `
        -WorkingDirectory $BackendDir -NoNewWindow -PassThru
}

function Wait-ApiHealthy {
    param($ApiProcess)
    $deadline = (Get-Date).AddSeconds($ApiStartTimeoutSec)
    while ((Get-Date) -lt $deadline) {
        if ($ApiProcess.HasExited) { return $false }
        if ((Get-HttpStatus -Url $LocalHealth -TimeoutSec 8) -eq 200) { return $true }
        Start-Sleep -Seconds 2
    }
    return $false
}

function Show-PublicUrl {
    param([string]$Url)
    Write-Host ""
    Write-Host "==================================================================" -ForegroundColor Green
    Write-Host " API local            : http://127.0.0.1:$Port" -ForegroundColor Green
    Write-Host " URL publica do tunel : $Url" -ForegroundColor Green
    Write-Host " Configure na Vercel  : NEXT_PUBLIC_API_URL=$Url" -ForegroundColor Green
    Write-Host " (Settings > Environment Variables > Redeploy)" -ForegroundColor Green
    Write-Host "==================================================================" -ForegroundColor Green
    Write-Host ""
}

$api = $null
$tunnel = $null
$publicUrl = $null
$apiRestarts = 0

try {
    Write-Log "[4/4] Iniciando servicos..."

    if (-not $NoTunnel) {
        $tunnel = Start-TunnelProcess
        if (-not $tunnel) { throw "Tunel Cloudflare nao iniciou." }
        $publicUrl = $tunnel.Url
        Write-Log "Tunel conectado: $publicUrl" "OK"
    }

    $api = Start-ApiProcess -PublicUrl $publicUrl
    if (-not (Wait-ApiHealthy -ApiProcess $api)) {
        throw "A API nao respondeu 200 em /api/health em $ApiStartTimeoutSec s."
    }
    Write-Log "API saudavel em $LocalHealth" "OK"

    if ($publicUrl) {
        $pub = Get-HttpStatus -Url "$publicUrl/api/health" -TimeoutSec 15
        if ($pub -eq 200) { Write-Log "Healthcheck publico via tunel: 200." "OK" }
        else { Write-Log "Healthcheck publico via tunel ainda retornou $pub (a propagacao do DNS pode levar alguns segundos)." "WARN" }
        Show-PublicUrl -Url $publicUrl
    }
    Write-Log "Supervisor ativo (verificacao a cada $CheckIntervalSec s). Ctrl+C para encerrar."

    $apiFails = 0
    $tunnelFails = 0
    $tunnelDownSince = $null

    while ($true) {
        Start-Sleep -Seconds $CheckIntervalSec

        # --- API ---
        $apiDead = $api.HasExited
        if (-not $apiDead) {
            if ((Get-HttpStatus -Url $LocalHealth -TimeoutSec 10) -eq 200) { $apiFails = 0 }
            else {
                $apiFails++
                Write-Log "Healthcheck local falhou ($apiFails/$ApiFailThreshold)." "WARN"
            }
        }
        if ($apiDead -or $apiFails -ge $ApiFailThreshold) {
            $apiRestarts++
            if ($apiRestarts -gt $MaxApiRestarts) { throw "API excedeu $MaxApiRestarts reinicios automaticos; abortando." }
            Write-Log "API indisponivel; reiniciando ($apiRestarts/$MaxApiRestarts)..." "ERROR"
            if (-not $api.HasExited) { Stop-ProcessTree -ProcessId $api.Id }
            Clear-Port -LocalPort $Port
            $api = Start-ApiProcess -PublicUrl $publicUrl
            if (Wait-ApiHealthy -ApiProcess $api) { Write-Log "API restabelecida." "OK" } else { Write-Log "API ainda nao respondeu apos o reinicio." "ERROR" }
            $apiFails = 0
        }

        # --- Tunel ---
        if ($NoTunnel) { continue }

        $needRestart = $false
        if ($tunnel.Process.HasExited) {
            Write-Log "Processo do cloudflared encerrou (codigo $($tunnel.Process.ExitCode))." "ERROR"
            $needRestart = $true
        }
        else {
            $code = Get-HttpStatus -Url "$publicUrl/api/health" -TimeoutSec 10
            if ($code -eq 200 -or $code -eq 503) {
                if ($tunnelFails -gt 0) {
                    $secs = [int]((Get-Date) - $tunnelDownSince).TotalSeconds
                    Write-Log "Tunel reconectado automaticamente apos ~$secs s de oscilacao." "OK"
                }
                $tunnelFails = 0
                $tunnelDownSince = $null
            }
            else {
                if ($tunnelFails -eq 0) { $tunnelDownSince = Get-Date }
                $tunnelFails++
                Write-Log "Tunel inacessivel (HTTP $code) - aguardando reconexao do cloudflared ($tunnelFails/$TunnelFailThreshold)." "WARN"
                if ($tunnelFails -ge $TunnelFailThreshold) { $needRestart = $true }
            }
        }

        if ($needRestart) {
            Write-Log "Reiniciando o tunel..." "WARN"
            if (-not $tunnel.Process.HasExited) { Stop-ProcessTree -ProcessId $tunnel.Process.Id }
            $newTunnel = Start-TunnelProcess
            if (-not $newTunnel) {
                Write-Log "Novo tunel nao subiu; nova tentativa no proximo ciclo." "ERROR"
                continue
            }
            $tunnel = $newTunnel
            $tunnelFails = 0
            $tunnelDownSince = $null
            if ($tunnel.Url -ne $publicUrl) {
                Write-Log "A URL publica MUDOU (quick tunnel): $publicUrl -> $($tunnel.Url). Reiniciando a API com o novo BASE_URL." "WARN"
                $publicUrl = $tunnel.Url
                if (-not $api.HasExited) { Stop-ProcessTree -ProcessId $api.Id }
                Clear-Port -LocalPort $Port
                $api = Start-ApiProcess -PublicUrl $publicUrl
                [void](Wait-ApiHealthy -ApiProcess $api)
                Show-PublicUrl -Url $publicUrl
            }
            else {
                Write-Log "Tunel reiniciado com a mesma URL." "OK"
            }
        }
    }
}
finally {
    Write-Log "Encerrando servicos..." "WARN"
    if ($api -and -not $api.HasExited) { Stop-ProcessTree -ProcessId $api.Id }
    if ($tunnel -and $tunnel.Process -and -not $tunnel.Process.HasExited) { Stop-ProcessTree -ProcessId $tunnel.Process.Id }
    Write-Log "API e tunel encerrados."
}
