# Final Working Dev Server Background Monitor for Warp
# This script runs npm run dev in background and provides monitoring commands

param([string]$Command = "npm run dev")

# Define file paths
$global:DevLogFile = "dev-output.log"
$global:DevPidFile = "dev-pid.txt"

# Cleanup function
function Cleanup-DevServer {
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Get-Job | Where-Object { $_.Name -eq "DevServer" } | Stop-Job -PassThru | Remove-Job -Force -ErrorAction SilentlyContinue
    Remove-Item $global:DevLogFile -Force -ErrorAction SilentlyContinue
    Remove-Item $global:DevPidFile -Force -ErrorAction SilentlyContinue
}

# Clean up before starting
Cleanup-DevServer

Write-Host "Starting Development Server in Background..." -ForegroundColor Green
Write-Host "Log file: $global:DevLogFile" -ForegroundColor Cyan
Write-Host "=============================================="

# Start the dev server job
$job = Start-Job -Name "DevServer" -ScriptBlock {
    param($command, $logPath, $workingDir)
    
    Set-Location $workingDir
    
    # Use Invoke-Expression to run the command and capture output
    try {
        $output = Invoke-Expression "$command 2>&1" | Out-String
        $output | Out-File -FilePath $logPath -Encoding UTF8
    } catch {
        "Error running command: $($_.Exception.Message)" | Out-File -FilePath $logPath -Encoding UTF8
    }
    
} -ArgumentList $Command, $global:DevLogFile, (Get-Location).Path

# Save job info
$job.Id | Out-File -FilePath $global:DevPidFile

Write-Host "Development server started (Job ID: $($job.Id))" -ForegroundColor Green

# Define monitoring functions
function global:Stop-DevServer {
    $devJobs = Get-Job -Name "DevServer" -ErrorAction SilentlyContinue
    if ($devJobs) {
        Write-Host "Stopping development server..." -ForegroundColor Yellow
        $devJobs | Stop-Job -PassThru | Remove-Job -Force
        Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
        Remove-Item $global:DevPidFile -ErrorAction SilentlyContinue
        Write-Host "Development server stopped" -ForegroundColor Green
    } else {
        Write-Host "No development server running" -ForegroundColor Red
    }
}

function global:Get-DevStatus {
    $devJobs = Get-Job -Name "DevServer" -ErrorAction SilentlyContinue
    if ($devJobs) {
        $job = $devJobs[0]
        Write-Host "Status: $($job.State) | ID: $($job.Id) | Started: $($job.PSBeginTime)" -ForegroundColor Cyan
        return $job
    } else {
        Write-Host "No development server running" -ForegroundColor Red
        return $null
    }
}

function global:Get-DevLogs {
    param([int]$Lines = 30)
    
    if (Test-Path $global:DevLogFile) {
        Write-Host "Development Server Output (last $Lines lines):" -ForegroundColor Cyan
        Write-Host "================================================"
        Get-Content $global:DevLogFile -Tail $Lines -ErrorAction SilentlyContinue
        Write-Host "================================================"
    } else {
        Write-Host "Log file not found yet. Server may still be starting..." -ForegroundColor Yellow
    }
}

function global:Watch-DevLogs {
    Write-Host "Live monitoring dev server output (Ctrl+C to stop)..." -ForegroundColor Yellow
    Write-Host "======================================================"
    
    $lastSize = 0
    while ($true) {
        if (Test-Path $global:DevLogFile) {
            $fileInfo = Get-Item $global:DevLogFile
            if ($fileInfo.Length -gt $lastSize) {
                $content = Get-Content $global:DevLogFile -Raw -ErrorAction SilentlyContinue
                if ($content -and $content.Length -gt $lastSize) {
                    $newContent = $content.Substring($lastSize)
                    Write-Host $newContent -NoNewline
                }
                $lastSize = $fileInfo.Length
            }
        } else {
            Write-Host "." -NoNewline -ForegroundColor Gray
        }
        Start-Sleep -Seconds 1
    }
}

function global:Get-DevErrors {
    if (Test-Path $global:DevLogFile) {
        Write-Host "Searching for errors in dev server output..." -ForegroundColor Yellow
        $content = Get-Content $global:DevLogFile -ErrorAction SilentlyContinue
        $errors = $content | Where-Object { $_ -match "error|Error|ERROR|failed|Failed|FAILED" }
        if ($errors) {
            Write-Host "Found errors:" -ForegroundColor Red
            Write-Host "============="
            $errors | ForEach-Object { Write-Host $_ -ForegroundColor Red }
        } else {
            Write-Host "No errors found in output" -ForegroundColor Green
        }
    } else {
        Write-Host "No log file available yet" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "SUCCESS: Development server is running in background!" -ForegroundColor Green
Write-Host ""
Write-Host "Available Commands:" -ForegroundColor Cyan
Write-Host "  Stop-DevServer  - Stop the development server"
Write-Host "  Get-DevStatus   - Check server status"
Write-Host "  Get-DevLogs     - View recent output"
Write-Host "  Watch-DevLogs   - Monitor output in real-time" 
Write-Host "  Get-DevErrors   - Show any errors"
Write-Host ""
Write-Host "Your terminal is now free! Warp can monitor the dev server while you work." -ForegroundColor Green
Write-Host "The dev server output is being logged to: $global:DevLogFile" -ForegroundColor Cyan