# Robust Development Server Monitor for Warp
# Monitors npm run dev with persistent background execution

param([string]$Command = "npm run dev")

$LogFile = "dev-server-output.log"
$ErrorFile = "dev-server-errors.log"
$JobFile = "dev-server-job.txt"

# Clean up
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Job | Where-Object { $_.Name -like "*DevServer*" } | Remove-Job -Force -ErrorAction SilentlyContinue
if (Test-Path $LogFile) { Remove-Item $LogFile -Force }
if (Test-Path $ErrorFile) { Remove-Item $ErrorFile -Force }
if (Test-Path $JobFile) { Remove-Item $JobFile -Force }

Write-Host "Starting Development Server Monitor..." -ForegroundColor Green
Write-Host "Logs: $LogFile | Errors: $ErrorFile" -ForegroundColor Cyan
Write-Host "==============================================="

# Enhanced job script with better error handling
$jobScript = {
    param($cmd, $logPath, $errorPath, $workingDir, $jobFile)
    
    try {
        Set-Location $workingDir
        
        # Create initial log entry
        "Starting dev server at $(Get-Date)" | Out-File -FilePath $logPath
        
        # Start npm process directly with proper output capture
        $processInfo = New-Object System.Diagnostics.ProcessStartInfo
        $processInfo.FileName = "npm"
        $processInfo.Arguments = "run dev"
        $processInfo.RedirectStandardOutput = $true
        $processInfo.RedirectStandardError = $true
        $processInfo.UseShellExecute = $false
        $processInfo.CreateNoWindow = $true
        
        $process = New-Object System.Diagnostics.Process
        $process.StartInfo = $processInfo
        
        # Event handlers for real-time output capture
        $outputAction = {
            $line = $Event.SourceEventArgs.Data
            if ($line) {
                "[$(Get-Date -Format 'HH:mm:ss')] $line" | Out-File -FilePath $using:logPath -Append
            }
        }
        
        $errorAction = {
            $line = $Event.SourceEventArgs.Data
            if ($line) {
                "[$(Get-Date -Format 'HH:mm:ss')] ERROR: $line" | Out-File -FilePath $using:errorPath -Append
                "[$(Get-Date -Format 'HH:mm:ss')] ERROR: $line" | Out-File -FilePath $using:logPath -Append
            }
        }
        
        # Register events
        Register-ObjectEvent -InputObject $process -EventName OutputDataReceived -Action $outputAction
        Register-ObjectEvent -InputObject $process -EventName ErrorDataReceived -Action $errorAction
        
        # Start process
        $process.Start()
        $process.BeginOutputReadLine()
        $process.BeginErrorReadLine()
        
        # Save process ID to job file
        $process.Id | Out-File -FilePath $jobFile
        
        # Wait for process
        $process.WaitForExit()
        
        return $process.ExitCode
        
    } catch {
        "Job failed: $($_.Exception.Message)" | Out-File -FilePath $errorPath -Append
        return -1
    }
}

# Start the background job
$job = Start-Job -Name "DevServerMonitor" -ScriptBlock $jobScript -ArgumentList $Command, $LogFile, $ErrorFile, (Get-Location).Path, $JobFile

# Save job ID
$job.Id | Out-File -FilePath "job-id.txt"

Write-Host "Development server started (Job: $($job.Name), ID: $($job.Id))" -ForegroundColor Green

# Wait a moment for the job to initialize
Start-Sleep -Seconds 2

# Create management functions
function Stop-DevServer {
    $jobs = Get-Job -Name "DevServerMonitor" -ErrorAction SilentlyContinue
    if ($jobs) {
        Write-Host "Stopping development server..." -ForegroundColor Red
        $jobs | Stop-Job
        $jobs | Remove-Job -Force
        
        # Kill npm/node processes
        Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
        Get-Process -Name "npm" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
        
        # Clean up job files
        Remove-Item "job-id.txt" -ErrorAction SilentlyContinue
        Remove-Item $JobFile -ErrorAction SilentlyContinue
        
        Write-Host "Development server stopped" -ForegroundColor Green
    } else {
        Write-Host "No development server running" -ForegroundColor Yellow
    }
}

function Get-DevServerStatus {
    $jobs = Get-Job -Name "DevServerMonitor" -ErrorAction SilentlyContinue
    if ($jobs) {
        foreach ($job in $jobs) {
            Write-Host "Server Status: $($job.State) | Job ID: $($job.Id)" -ForegroundColor Cyan
            Write-Host "Started: $($job.PSBeginTime)" -ForegroundColor Gray
        }
        return $jobs
    } else {
        Write-Host "No development server running" -ForegroundColor Red
        return $null
    }
}

function Get-DevServerLogs {
    param([int]$Lines = 20)
    if (Test-Path $LogFile) {
        Write-Host "Recent dev server output ($Lines lines):" -ForegroundColor Cyan
        Write-Host "----------------------------------------"
        Get-Content $LogFile -Tail $Lines
        Write-Host "----------------------------------------"
    } else {
        Write-Host "No log file found" -ForegroundColor Red
    }
}

function Get-DevServerErrors {
    param([int]$Lines = 10)
    if (Test-Path $ErrorFile) {
        Write-Host "Recent errors ($Lines lines):" -ForegroundColor Red
        Write-Host "----------------------------------------"
        Get-Content $ErrorFile -Tail $Lines
        Write-Host "----------------------------------------"
    } else {
        Write-Host "No errors logged" -ForegroundColor Green
    }
}

function Watch-DevServerLogs {
    Write-Host "Live monitoring (Ctrl+C to stop)..." -ForegroundColor Yellow
    Write-Host "===================================="
    
    if (-not (Test-Path $LogFile)) {
        Write-Host "Waiting for log file to be created..." -ForegroundColor Gray
    }
    
    $lastPosition = 0
    while ($true) {
        if (Test-Path $LogFile) {
            $content = Get-Content $LogFile -Raw -ErrorAction SilentlyContinue
            if ($content -and $content.Length -gt $lastPosition) {
                $newContent = $content.Substring($lastPosition)
                Write-Host $newContent -NoNewline
                $lastPosition = $content.Length
            }
        }
        Start-Sleep -Milliseconds 500
    }
}

# Export functions globally
Set-Item -Path function:global:Stop-DevServer -Value ${function:Stop-DevServer}
Set-Item -Path function:global:Get-DevServerStatus -Value ${function:Get-DevServerStatus}
Set-Item -Path function:global:Get-DevServerLogs -Value ${function:Get-DevServerLogs}
Set-Item -Path function:global:Get-DevServerErrors -Value ${function:Get-DevServerErrors}
Set-Item -Path function:global:Watch-DevServerLogs -Value ${function:Watch-DevServerLogs}

Write-Host ""
Write-Host "SUCCESS: Dev server is now running in background!" -ForegroundColor Green
Write-Host ""
Write-Host "Available Commands:" -ForegroundColor Cyan
Write-Host "  Stop-DevServer      - Stop the development server" -ForegroundColor White
Write-Host "  Get-DevServerStatus - Check if server is running" -ForegroundColor White
Write-Host "  Get-DevServerLogs   - View recent output" -ForegroundColor White
Write-Host "  Get-DevServerErrors - View recent errors" -ForegroundColor White
Write-Host "  Watch-DevServerLogs - Monitor output in real-time" -ForegroundColor White
Write-Host ""
Write-Host "READY: Warp can now monitor your dev server while you continue working!" -ForegroundColor Green