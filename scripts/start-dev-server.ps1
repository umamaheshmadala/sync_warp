# Enhanced Development Server Launcher with Live Monitoring
# Allows Warp to monitor dev server output while keeping terminal interactive

param(
    [string]$Command = "npm run dev"
)

$LogFile = "dev-server-output.log"
$ErrorFile = "dev-server-errors.log"

# Clean up any existing processes and log files
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
if (Test-Path $LogFile) { Remove-Item $LogFile -Force }
if (Test-Path $ErrorFile) { Remove-Item $ErrorFile -Force }

Write-Host "🚀 Starting Development Server with Live Monitoring" -ForegroundColor Green
Write-Host "📋 Output: $LogFile | ❌ Errors: $ErrorFile" -ForegroundColor Cyan
Write-Host "=" * 60

# Create the background job that runs the dev server
$jobScript = {
    param($cmd, $logPath, $errorPath, $workingDir)
    
    Set-Location $workingDir
    
    # Start process with output capture
    $process = Start-Process -FilePath "powershell" -ArgumentList "-Command", $cmd -NoNewWindow -PassThru -RedirectStandardOutput $logPath -RedirectStandardError $errorPath
    
    # Wait for the process to complete
    $process.WaitForExit()
    return $process.ExitCode
}

# Start the dev server as a background job
$global:DevServerJob = Start-Job -ScriptBlock $jobScript -ArgumentList $Command, $LogFile, $ErrorFile, (Get-Location).Path

Write-Host "✅ Development server started (Job ID: $($global:DevServerJob.Id))" -ForegroundColor Green

# Define helper functions
function Stop-DevServer {
    if ($global:DevServerJob) {
        Write-Host "🛑 Stopping development server..." -ForegroundColor Red
        Stop-Job $global:DevServerJob -ErrorAction SilentlyContinue
        Remove-Job $global:DevServerJob -ErrorAction SilentlyContinue
        $global:DevServerJob = $null
        
        # Kill any remaining node processes
        Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
        
        Write-Host "✅ Development server stopped" -ForegroundColor Green
    } else {
        Write-Host "ℹ️  No development server running" -ForegroundColor Yellow
    }
}

function Get-DevServerStatus {
    if ($global:DevServerJob) {
        $status = Get-Job $global:DevServerJob -ErrorAction SilentlyContinue
        if ($status) {
            Write-Host "📊 Status: $($status.State) | 🆔 Job ID: $($status.Id)" -ForegroundColor Cyan
            return $status
        }
    }
    Write-Host "❌ No development server job found" -ForegroundColor Red
    return $null
}

function Get-DevServerLogs {
    param([int]$Lines = 20)
    
    if (Test-Path $LogFile) {
        Write-Host "📜 Last $Lines lines from dev server:" -ForegroundColor Cyan
        Write-Host "-" * 50
        Get-Content $LogFile -Tail $Lines
        Write-Host "-" * 50
    } else {
        Write-Host "❌ No log file found yet" -ForegroundColor Red
    }
}

function Get-DevServerErrors {
    param([int]$Lines = 10)
    
    if (Test-Path $ErrorFile) {
        Write-Host "❌ Last $Lines errors from dev server:" -ForegroundColor Red
        Write-Host "-" * 50
        Get-Content $ErrorFile -Tail $Lines
        Write-Host "-" * 50
    } else {
        Write-Host "✅ No errors logged yet" -ForegroundColor Green
    }
}

function Watch-DevServerLogs {
    Write-Host "👀 Monitoring dev server logs (Press Ctrl+C to stop)..." -ForegroundColor Yellow
    
    $lastSize = 0
    while ($true) {
        if (Test-Path $LogFile) {
            $currentSize = (Get-Item $LogFile).Length
            if ($currentSize -gt $lastSize) {
                $newContent = Get-Content $LogFile -Raw
                if ($newContent -and $newContent.Length -gt $lastSize) {
                    $newLines = $newContent.Substring($lastSize)
                    Write-Host $newLines -NoNewline
                }
                $lastSize = $currentSize
            }
        }
        Start-Sleep -Seconds 1
    }
}

# Export functions to global scope for terminal use
Set-Variable -Name "Stop-DevServer" -Value ${function:Stop-DevServer} -Scope Global
Set-Variable -Name "Get-DevServerStatus" -Value ${function:Get-DevServerStatus} -Scope Global
Set-Variable -Name "Get-DevServerLogs" -Value ${function:Get-DevServerLogs} -Scope Global
Set-Variable -Name "Get-DevServerErrors" -Value ${function:Get-DevServerErrors} -Scope Global  
Set-Variable -Name "Watch-DevServerLogs" -Value ${function:Watch-DevServerLogs} -Scope Global

Write-Host ""
Write-Host "🎯 Dev server is running in background!" -ForegroundColor Green
Write-Host "💡 Available commands:" -ForegroundColor Cyan
Write-Host "   • Stop-DevServer         - Stop the server" -ForegroundColor White
Write-Host "   • Get-DevServerStatus    - Check server status" -ForegroundColor White  
Write-Host "   • Get-DevServerLogs      - View recent logs" -ForegroundColor White
Write-Host "   • Get-DevServerErrors    - View recent errors" -ForegroundColor White
Write-Host "   • Watch-DevServerLogs    - Monitor logs in real-time" -ForegroundColor White
Write-Host ""
Write-Host "🔍 Warp can now monitor logs while you work!" -ForegroundColor Green