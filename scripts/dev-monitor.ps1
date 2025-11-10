# Development Server Monitor - Allows Warp to monitor output while terminal stays interactive
param([string]$Command = "npm run dev")

$LogFile = "dev-server-output.log"
$ErrorFile = "dev-server-errors.log"

# Clean up existing processes and files
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
if (Test-Path $LogFile) { Remove-Item $LogFile -Force }
if (Test-Path $ErrorFile) { Remove-Item $ErrorFile -Force }

Write-Host "Starting Development Server with Monitoring..." -ForegroundColor Green
Write-Host "Output log: $LogFile | Error log: $ErrorFile" -ForegroundColor Cyan
Write-Host "============================================================"

# Background job script
$jobScript = {
    param($cmd, $logPath, $errorPath, $workingDir)
    Set-Location $workingDir
    
    # Use cmd.exe to run npm with output redirection
    $process = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", $cmd -PassThru -RedirectStandardOutput $logPath -RedirectStandardError $errorPath -WindowStyle Hidden
    $process.WaitForExit()
    return $process.ExitCode
}

# Start the dev server job
$global:DevServerJob = Start-Job -ScriptBlock $jobScript -ArgumentList $Command, $LogFile, $ErrorFile, (Get-Location).Path

Write-Host "Development server started successfully (Job ID: $($global:DevServerJob.Id))" -ForegroundColor Green

# Helper functions
function Stop-DevServer {
    if ($global:DevServerJob) {
        Write-Host "Stopping development server..." -ForegroundColor Red
        Stop-Job $global:DevServerJob -ErrorAction SilentlyContinue
        Remove-Job $global:DevServerJob -ErrorAction SilentlyContinue
        $global:DevServerJob = $null
        Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
        Write-Host "Development server stopped" -ForegroundColor Green
    } else {
        Write-Host "No development server running" -ForegroundColor Yellow
    }
}

function Get-DevServerStatus {
    if ($global:DevServerJob) {
        $status = Get-Job $global:DevServerJob -ErrorAction SilentlyContinue
        if ($status) {
            Write-Host "Status: $($status.State) | Job ID: $($status.Id)" -ForegroundColor Cyan
            return $status
        }
    }
    Write-Host "No development server job found" -ForegroundColor Red
    return $null
}

function Get-DevServerLogs {
    param([int]$Lines = 20)
    if (Test-Path $LogFile) {
        Write-Host "Last $Lines lines from dev server:" -ForegroundColor Cyan
        Write-Host "----------------------------------------------------"
        Get-Content $LogFile -Tail $Lines
        Write-Host "----------------------------------------------------"
    } else {
        Write-Host "No log file found yet" -ForegroundColor Red
    }
}

function Get-DevServerErrors {
    param([int]$Lines = 10)
    if (Test-Path $ErrorFile) {
        Write-Host "Last $Lines errors:" -ForegroundColor Red
        Write-Host "----------------------------------------------------"
        Get-Content $ErrorFile -Tail $Lines
        Write-Host "----------------------------------------------------"
    } else {
        Write-Host "No errors logged yet" -ForegroundColor Green
    }
}

function Watch-DevServerLogs {
    Write-Host "Monitoring logs in real-time (Press Ctrl+C to stop)..." -ForegroundColor Yellow
    $lastSize = 0
    while ($true) {
        if (Test-Path $LogFile) {
            $currentSize = (Get-Item $LogFile).Length
            if ($currentSize -gt $lastSize) {
                $content = Get-Content $LogFile -Raw
                if ($content -and $content.Length -gt $lastSize) {
                    $newContent = $content.Substring($lastSize)
                    Write-Host $newContent -NoNewline
                }
                $lastSize = $currentSize
            }
        }
        Start-Sleep -Seconds 1
    }
}

# Make functions available globally
Set-Item -Path "function:global:Stop-DevServer" -Value ${function:Stop-DevServer}
Set-Item -Path "function:global:Get-DevServerStatus" -Value ${function:Get-DevServerStatus}
Set-Item -Path "function:global:Get-DevServerLogs" -Value ${function:Get-DevServerLogs}
Set-Item -Path "function:global:Get-DevServerErrors" -Value ${function:Get-DevServerErrors}
Set-Item -Path "function:global:Watch-DevServerLogs" -Value ${function:Watch-DevServerLogs}

Write-Host ""
Write-Host "Dev server is running in background!" -ForegroundColor Green
Write-Host "Available commands:" -ForegroundColor Cyan
Write-Host "  - Stop-DevServer         : Stop the server" -ForegroundColor White
Write-Host "  - Get-DevServerStatus    : Check server status" -ForegroundColor White  
Write-Host "  - Get-DevServerLogs      : View recent logs" -ForegroundColor White
Write-Host "  - Get-DevServerErrors    : View recent errors" -ForegroundColor White
Write-Host "  - Watch-DevServerLogs    : Monitor logs in real-time" -ForegroundColor White
Write-Host ""
Write-Host "Warp can now monitor your dev server while you work!" -ForegroundColor Green