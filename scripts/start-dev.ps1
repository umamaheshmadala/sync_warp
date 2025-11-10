# Simple Working Solution: Background Dev Server for Warp
# This approach works reliably and gives Warp access to output monitoring

# Clean up any existing processes
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host "Starting npm run dev in background..." -ForegroundColor Green
Write-Host "Output will be redirected to dev-output.txt" -ForegroundColor Cyan
Write-Host "============================================="

# Start npm run dev in background with output redirection
$job = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    npm run dev 2>&1 | Tee-Object -FilePath "dev-output.txt"
}

Write-Host "Development server started as Job ID: $($job.Id)" -ForegroundColor Green

# Simple status check function
function global:Check-DevServer {
    $jobs = Get-Job -ErrorAction SilentlyContinue
    if ($jobs) {
        Write-Host "Background Jobs:" -ForegroundColor Cyan
        Get-Job | Format-Table -AutoSize
    } else {
        Write-Host "No background jobs running" -ForegroundColor Red
    }
}

# Function to view dev server output
function global:Show-DevOutput {
    param([int]$Lines = 20)
    
    if (Test-Path "dev-output.txt") {
        Write-Host "Development Server Output (last $Lines lines):" -ForegroundColor Cyan
        Write-Host "=============================================="
        Get-Content "dev-output.txt" -Tail $Lines
        Write-Host "=============================================="
    } else {
        Write-Host "Output file not found yet..." -ForegroundColor Yellow
    }
}

# Function to stop dev server
function global:Stop-Dev {
    Get-Job | Stop-Job -PassThru | Remove-Job -Force -ErrorAction SilentlyContinue
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Write-Host "Development server stopped" -ForegroundColor Green
}

Write-Host ""
Write-Host "Available commands:" -ForegroundColor Cyan
Write-Host "  Check-DevServer - Check job status"
Write-Host "  Show-DevOutput  - View recent output"
Write-Host "  Stop-Dev        - Stop the server"
Write-Host ""
Write-Host "Your terminal is now free for other commands!" -ForegroundColor Green