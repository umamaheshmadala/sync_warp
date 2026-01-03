# Simple Background Dev Server Monitor for Warp
# Runs npm run dev in background with output capture

param([string]$Command = "npm run dev")

$LogFile = "dev-output.log"
$PidFile = "dev-pid.txt"

# Clean up any existing processes and files
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Job | Where-Object { $_.Name -eq "DevServer" } | Stop-Job -PassThru | Remove-Job -Force -ErrorAction SilentlyContinue
if (Test-Path $LogFile) { Remove-Item $LogFile -Force -ErrorAction SilentlyContinue }
if (Test-Path $PidFile) { Remove-Item $PidFile -Force -ErrorAction SilentlyContinue }

Write-Host "Starting Background Dev Server..." -ForegroundColor Green
Write-Host "Output will be logged to: $LogFile" -ForegroundColor Cyan
Write-Host "=========================================="

# Simple job script that works reliably
$job = Start-Job -Name "DevServer" -ScriptBlock {
    param($cmd, $logFile, $workDir)
    
    Set-Location $workDir
    
    # Start the command and capture all output
    $output = & cmd /c "$cmd 2>&1"
    $output | Out-File -FilePath $logFile -Encoding UTF8
    
} -ArgumentList $Command, $LogFile, (Get-Location).Path

Write-Host "Dev server started as background job (ID: $($job.Id))" -ForegroundColor Green
$job.Id | Out-File -FilePath $PidFile

# Simple utility functions
function Stop-DevServer {
    $devJobs = Get-Job -Name "DevServer" -ErrorAction SilentlyContinue
    if ($devJobs) {
        Write-Host "Stopping dev server..." -ForegroundColor Yellow
        $devJobs | Stop-Job -PassThru | Remove-Job -Force
        Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
        Remove-Item $PidFile -ErrorAction SilentlyContinue
        Write-Host "Dev server stopped" -ForegroundColor Green
    } else {
        Write-Host "No dev server running" -ForegroundColor Red
    }
}

function Get-DevStatus {
    $devJobs = Get-Job -Name "DevServer" -ErrorAction SilentlyContinue
    if ($devJobs) {
        Write-Host "Dev Server Status: $($devJobs[0].State)" -ForegroundColor Cyan
        Write-Host "Job ID: $($devJobs[0].Id)" -ForegroundColor Gray
        return $devJobs[0]
    } else {
        Write-Host "No dev server running" -ForegroundColor Red
        return $null
    }
}

function Get-DevLogs {
    param([int]$Lines = 30)
    if (Test-Path $LogFile) {
        Write-Host "Dev Server Output (last $Lines lines):" -ForegroundColor Cyan
        Write-Host "-----------------------------------"
        Get-Content $LogFile -Tail $Lines -ErrorAction SilentlyContinue
        Write-Host "-----------------------------------"
    } else {
        Write-Host "No log file found yet" -ForegroundColor Yellow
    }
}

function Watch-DevLogs {
    Write-Host "Monitoring dev server output (Ctrl+C to stop)..." -ForegroundColor Yellow
    
    $lastSize = 0
    while ($true) {
        if (Test-Path $LogFile) {
            $file = Get-Item $LogFile
            if ($file.Length -gt $lastSize) {
                $newContent = Get-Content $LogFile -Raw -ErrorAction SilentlyContinue
                if ($newContent -and $newContent.Length -gt $lastSize) {
                    $newText = $newContent.Substring($lastSize)
                    Write-Host $newText -NoNewline
                }
                $lastSize = $file.Length
            }
        }
        Start-Sleep -Seconds 1
    }
}

# Make functions globally available
Set-Item function:global:Stop-DevServer -Value ${function:Stop-DevServer}
Set-Item function:global:Get-DevStatus -Value ${function:Get-DevStatus}
Set-Item function:global:Get-DevLogs -Value ${function:Get-DevLogs}
Set-Item function:global:Watch-DevLogs -Value ${function:Watch-DevLogs}

Write-Host ""
Write-Host "Dev server is now running in background!" -ForegroundColor Green
Write-Host ""
Write-Host "Commands available:" -ForegroundColor Cyan
Write-Host "  Stop-DevServer  - Stop the server"
Write-Host "  Get-DevStatus   - Check server status"  
Write-Host "  Get-DevLogs     - View recent output"
Write-Host "  Watch-DevLogs   - Monitor output live"
Write-Host ""
Write-Host "Terminal is now free for other commands while server runs!" -ForegroundColor Green