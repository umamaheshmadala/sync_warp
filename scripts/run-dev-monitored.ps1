# PowerShell script to run npm run dev with live output monitoring and terminal interaction
# This solution allows Warp to monitor dev server output while keeping terminal responsive

param(
    [string]$Command = "npm run dev"
)

$LogFile = "dev-server-output.log"
$ErrorFile = "dev-server-errors.log"

# Clean up any existing log files
if (Test-Path $LogFile) { Remove-Item $LogFile -Force }
if (Test-Path $ErrorFile) { Remove-Item $ErrorFile -Force }

Write-Host "🚀 Starting development server with live monitoring..." -ForegroundColor Green
Write-Host "📋 Output logged to: $LogFile" -ForegroundColor Cyan
Write-Host "❌ Errors logged to: $ErrorFile" -ForegroundColor Cyan
Write-Host "🛑 Use 'Stop-DevServer' command to stop the server" -ForegroundColor Yellow
Write-Host "📊 Use 'Get-DevServerStatus' to check server status" -ForegroundColor Yellow
Write-Host "📜 Use 'Get-DevServerLogs' to view recent logs" -ForegroundColor Yellow
Write-Host "=" * 60

# Create the job script block that will run the dev server
$jobScript = {
    param($cmd, $logPath, $errorPath)
    
    # Start the npm process with output redirection
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "powershell.exe"
    $psi.Arguments = "-Command `"$cmd`""
    $psi.UseShellExecute = $false
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.CreateNoWindow = $true
    
    $process = [System.Diagnostics.Process]::Start($psi)
    
    # Create event handlers for output
    $outputAction = {
        $line = $Event.SourceEventArgs.Data
        if ($line) {
            Add-Content -Path $using:logPath -Value "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $line"
        }
    }
    
    $errorAction = {
        $line = $Event.SourceEventArgs.Data
        if ($line) {
            Add-Content -Path $using:errorPath -Value "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] ERROR: $line"
            Add-Content -Path $using:logPath -Value "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] ERROR: $line"
        }
    }
    
    # Register event handlers
    Register-ObjectEvent -InputObject $process -EventName OutputDataReceived -Action $outputAction
    Register-ObjectEvent -InputObject $process -EventName ErrorDataReceived -Action $errorAction
    
    # Start reading output
    $process.BeginOutputReadLine()
    $process.BeginErrorReadLine()
    
    # Wait for process to exit
    $process.WaitForExit()
    
    return $process.ExitCode
}

# Start the dev server as a background job
$global:DevServerJob = Start-Job -ScriptBlock $jobScript -ArgumentList $Command, $LogFile, $ErrorFile

Write-Host "✅ Development server started as background job (ID: $($global:DevServerJob.Id))" -ForegroundColor Green

# Function to stop the dev server
function Stop-DevServer {
    if ($global:DevServerJob) {
        Write-Host "🛑 Stopping development server..." -ForegroundColor Red
        Stop-Job $global:DevServerJob -PassThru | Remove-Job
        $global:DevServerJob = $null
        
        # Kill any remaining node processes
        Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.ProcessName -eq "node" } | Stop-Process -Force -ErrorAction SilentlyContinue
        
        Write-Host "✅ Development server stopped." -ForegroundColor Green
    } else {
        Write-Host "ℹ️  No development server job found." -ForegroundColor Yellow
    }
}

# Function to check dev server status
function Get-DevServerStatus {
    if ($global:DevServerJob) {
        $status = Get-Job $global:DevServerJob
        Write-Host "📊 Dev Server Status: $($status.State)" -ForegroundColor Cyan
        Write-Host "🆔 Job ID: $($status.Id)" -ForegroundColor Gray
        Write-Host "⏰ Started: $($status.PSBeginTime)" -ForegroundColor Gray
        return $status
    } else {
        Write-Host "❌ No development server job found." -ForegroundColor Red
        return $null
    }
}

# Function to get recent logs
function Get-DevServerLogs {
    param([int]$Lines = 20)
    
    if (Test-Path $LogFile) {
        Write-Host "📜 Last $Lines lines from dev server:" -ForegroundColor Cyan
        Write-Host "=" * 50
        Get-Content $LogFile -Tail $Lines | Write-Host
        Write-Host "=" * 50
    } else {
        Write-Host "❌ No log file found yet." -ForegroundColor Red
    }
}

# Function to get recent errors
function Get-DevServerErrors {
    param([int]$Lines = 10)
    
    if (Test-Path $ErrorFile) {
        Write-Host "❌ Last $Lines errors from dev server:" -ForegroundColor Red
        Write-Host "=" * 50
        Get-Content $ErrorFile -Tail $Lines | Write-Host
        Write-Host "=" * 50
    } else {
        Write-Host "✅ No errors logged yet." -ForegroundColor Green
    }
}

# Function to monitor logs in real-time
function Watch-DevServerLogs {
    Write-Host "👀 Watching dev server logs in real-time (Press Ctrl+C to stop watching)..." -ForegroundColor Yellow
    
    $lastSize = 0
    
    while ($true) {
        if (Test-Path $LogFile) {
            $currentSize = (Get-Item $LogFile).Length
            if ($currentSize -gt $lastSize) {
                $newContent = Get-Content $LogFile -Raw
                if ($newContent.Length -gt $lastSize) {
                    $newLines = $newContent.Substring($lastSize)
                    Write-Host $newLines -NoNewline
                }
                $lastSize = $currentSize
            }
        }
        Start-Sleep -Seconds 1
    }
}

# Export functions to global scope
$global:Stop-DevServer = ${function:Stop-DevServer}
$global:Get-DevServerStatus = ${function:Get-DevServerStatus} 
$global:Get-DevServerLogs = ${function:Get-DevServerLogs}
$global:Get-DevServerErrors = ${function:Get-DevServerErrors}
$global:Watch-DevServerLogs = ${function:Watch-DevServerLogs}

Write-Host "🎯 Dev server is now running in the background!" -ForegroundColor Green
Write-Host "💡 Available commands:" -ForegroundColor Cyan
Write-Host "   • Stop-DevServer         - Stop the development server" -ForegroundColor White
Write-Host "   • Get-DevServerStatus    - Check server status" -ForegroundColor White  
Write-Host "   • Get-DevServerLogs      - View recent logs" -ForegroundColor White
Write-Host "   • Get-DevServerErrors    - View recent errors" -ForegroundColor White
Write-Host "   • Watch-DevServerLogs    - Monitor logs in real-time" -ForegroundColor White
