# Wrapper script for Windows Task Scheduler: runs AI radio episode generation
# (npm run radio:generate). Checks whether Ollama and VOICEVOX are running
# (starting Ollama if needed; VOICEVOX is not auto-started since its install
# location varies -- if it's not already running, this run is skipped).
# Output is logged to a file since Task Scheduler does not keep console output.

$ErrorActionPreference = "Continue"
$env:PATH += ";C:\Program Files\nodejs"

# Windows PowerShell 5.1 decodes captured native-process output using this
# property; without it, UTF-8 (Japanese) output from npm/node gets misread
# as the system codepage and turns into mojibake in the log file.
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$projectDir = "C:\Users\ritou\Documents\ai-news-site"
$logDir = Join-Path $projectDir "logs"
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }
$logFile = Join-Path $logDir ("radio-generate-{0:yyyyMMdd-HHmmss}.log" -f (Get-Date))

function Write-Log($message) {
    $line = "[{0:yyyy-MM-dd HH:mm:ss}] {1}" -f (Get-Date), $message
    Write-Output $line
    Add-Content -Path $logFile -Value $line
}

Write-Log "=== radio generate task started ==="

$ollamaReady = $false
try {
    $null = Invoke-WebRequest -Uri "http://127.0.0.1:11434/api/version" -UseBasicParsing -TimeoutSec 5
    $ollamaReady = $true
    Write-Log "Ollama: already running"
} catch {
    Write-Log "Ollama not responding, attempting to start it..."
    Start-Process -FilePath "Ollama" -WindowStyle Hidden -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 8
    try {
        $null = Invoke-WebRequest -Uri "http://127.0.0.1:11434/api/version" -UseBasicParsing -TimeoutSec 5
        $ollamaReady = $true
        Write-Log "Ollama: started successfully"
    } catch {
        Write-Log "Failed to start Ollama. Skipping this run."
    }
}

$voicevoxReady = $false
if ($ollamaReady) {
    try {
        $null = Invoke-WebRequest -Uri "http://127.0.0.1:50021/version" -UseBasicParsing -TimeoutSec 5
        $voicevoxReady = $true
        Write-Log "VOICEVOX: already running"
    } catch {
        Write-Log "VOICEVOX is not running. Skipping this run (start the VOICEVOX app manually and it will be picked up next time)."
    }
}

if ($ollamaReady -and $voicevoxReady) {
    Set-Location $projectDir
    Write-Log "Running npm run radio:generate ..."
    # Run through cmd.exe with chcp 65001 so npm.cmd/node's UTF-8 (Japanese)
    # console output round-trips correctly instead of becoming mojibake.
    $output = & cmd.exe /c "chcp 65001 >nul && npm run radio:generate 2>&1"
    $output | Out-String | Out-File -FilePath $logFile -Append -Encoding utf8
    Write-Log "=== radio generate task finished ==="
}
