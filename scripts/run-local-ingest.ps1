# Wrapper script for Windows Task Scheduler: runs local Ollama-based news ingestion.
# Checks whether Ollama is running (normally auto-started at Windows login),
# tries to start it if not, then runs `npm run ingest:local`.
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
$logFile = Join-Path $logDir ("ingest-local-{0:yyyyMMdd-HHmmss}.log" -f (Get-Date))

function Write-Log($message) {
    $line = "[{0:yyyy-MM-dd HH:mm:ss}] {1}" -f (Get-Date), $message
    Write-Output $line
    Add-Content -Path $logFile -Value $line
}

Write-Log "=== local ingest task started ==="

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

if ($ollamaReady) {
    Set-Location $projectDir
    Write-Log "Running npm run ingest:local ..."
    # Run through cmd.exe with chcp 65001 so npm.cmd/node's UTF-8 (Japanese)
    # console output round-trips correctly instead of becoming mojibake.
    $output = & cmd.exe /c "chcp 65001 >nul && npm run ingest:local 2>&1"
    $output | Out-String | Out-File -FilePath $logFile -Append -Encoding utf8
    Write-Log "=== local ingest task finished ==="
}
