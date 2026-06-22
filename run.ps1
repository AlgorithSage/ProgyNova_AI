# ============================================================
#  ProgyNovaAI - One-click launcher
#  Usage:  Right-click > "Run with PowerShell"  OR  .\run.ps1
# ============================================================

$ErrorActionPreference = "Stop"
$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Definition

# -- Paths ----------------------------------------------------
$API_DIR = Join-Path $ROOT "progynova-api"
$DASH_DIR = Join-Path $ROOT "progynova-dashboard"
$VENV_DIR = Join-Path $API_DIR ".venv"
$VENV_PY = Join-Path $VENV_DIR "Scripts\python.exe"
$REQ_FILE = Join-Path $API_DIR "requirements.txt"

# -- Helpers --------------------------------------------------
function Write-Banner($msg) {
    Write-Host ""
    Write-Host "  =========================================" -ForegroundColor Cyan
    Write-Host "    $msg" -ForegroundColor Cyan
    Write-Host "  =========================================" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Step($label, $msg) {
    Write-Host "  [$label]  $msg" -ForegroundColor Yellow
}

# -- Pre-flight checks ----------------------------------------
Write-Banner "ProgyNovaAI - Starting up..."

# -- Release ports and clean existing processes ---------------
Write-Step "CLEAN" "Checking and releasing ports 8000 & 5173..."
$portsToKill = @(8000, 5173)
foreach ($port in $portsToKill) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connections) {
        foreach ($conn in $connections) {
            $pidToKill = $conn.OwningProcess
            if ($pidToKill -and $pidToKill -ne 0 -and $pidToKill -ne $PID) {
                $proc = Get-Process -Id $pidToKill -ErrorAction SilentlyContinue
                if ($proc) {
                    Write-Step "CLEAN" "Killing process $($proc.Name) ($pidToKill) on port $port..."
                    Stop-Process -Id $pidToKill -Force -ErrorAction SilentlyContinue
                }
            }
        }
    }
}
Get-Job | Stop-Job -ErrorAction SilentlyContinue
Get-Job | Remove-Job -Force -ErrorAction SilentlyContinue

# 1. Python venv
if (-not (Test-Path $VENV_PY)) {
    Write-Step "VENV" "Creating Python virtual environment..."
    if (Get-Command uv -ErrorAction SilentlyContinue) {
        uv venv $VENV_DIR
    }
    else {
        python -m venv $VENV_DIR
    }
}

# 2. Install / update Python deps
Write-Step "PIP" "Checking Python dependencies..."
$depsOk = & $VENV_PY -c "import uvicorn, fastapi, xgboost, shap, pandas, numpy; print('ok')" 2>&1
$depsOkStr = "$depsOk".Trim()
if ($depsOkStr -ne "ok") {
    Write-Step "PIP" "Installing Python dependencies..."
    if (Get-Command uv -ErrorAction SilentlyContinue) {
        uv pip install -r $REQ_FILE --python $VENV_PY
    }
    else {
        & $VENV_PY -m pip install -q -r $REQ_FILE
    }
}
else {
    Write-Step "PIP" "All Python dependencies already installed."
}

# 3. Node modules
if (-not (Test-Path (Join-Path $DASH_DIR "node_modules"))) {
    Write-Step "NPM" "Installing Node dependencies..."
    Push-Location $DASH_DIR
    npm install
    Pop-Location
}

# -- Launch both servers --------------------------------------
Write-Step "API"  "Starting FastAPI backend   -> http://localhost:8000"
Write-Step "DASH" "Starting Vite frontend     -> http://localhost:5173"
Write-Host ""

# Start backend as a background job
$apiJob = Start-Job -ScriptBlock {
    param($venvPy, $apiDir)
    Set-Location $apiDir
    & $venvPy -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
} -ArgumentList $VENV_PY, $API_DIR

# Start frontend as a background job
$dashJob = Start-Job -ScriptBlock {
    param($dashDir)
    Set-Location $dashDir
    npm run dev
} -ArgumentList $DASH_DIR

# -- Stream logs and handle Ctrl+C ----------------------------
Write-Host "  [OK]  Both servers running. Press Ctrl+C to stop." -ForegroundColor Green
Write-Host "  -------------------------------------------------" -ForegroundColor DarkGray
Write-Host ""

try {
    while ($true) {
        Receive-Job -Job $apiJob  -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "[API]  $_" -ForegroundColor Magenta }
        Receive-Job -Job $dashJob -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "[DASH] $_" -ForegroundColor Blue }

        if ($apiJob.State -eq "Failed") {
            Write-Host "  [ERR] Backend crashed. Check errors above." -ForegroundColor Red
            Receive-Job -Job $apiJob -ErrorAction SilentlyContinue
            break
        }
        if ($dashJob.State -eq "Failed") {
            Write-Host "  [ERR] Frontend crashed. Check errors above." -ForegroundColor Red
            Receive-Job -Job $dashJob -ErrorAction SilentlyContinue
            break
        }

        Start-Sleep -Milliseconds 500
    }
}
finally {
    Write-Host ""
    Write-Step "STOP" "Shutting down servers..."
    Stop-Job  -Job $apiJob, $dashJob  -ErrorAction SilentlyContinue
    Remove-Job -Job $apiJob, $dashJob -Force -ErrorAction SilentlyContinue
    Write-Host "  Goodbye!" -ForegroundColor Green
}
