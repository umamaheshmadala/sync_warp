# ContactsSidebar Test Helper
Write-Host "ContactsSidebar Testing Helper" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan

# Check Node processes
Write-Host ""
Write-Host "1. Checking dev server..." -ForegroundColor Yellow
$nodeProcesses = Get-Process -Name *node* -ErrorAction SilentlyContinue
if ($nodeProcesses.Count -gt 0) {
    Write-Host "✅ Dev server is running" -ForegroundColor Green
} else {
    Write-Host "❌ Dev server not found" -ForegroundColor Red
    Write-Host "Run: npm run dev" -ForegroundColor Blue
    exit
}

# Check ports
Write-Host ""
Write-Host "2. Checking ports..." -ForegroundColor Yellow
$port5173 = netstat -an | Select-String ":5173.*LISTENING"
$port5174 = netstat -an | Select-String ":5174.*LISTENING"

if ($port5173) {
    Write-Host "✅ Port 5173 is active" -ForegroundColor Green
    $serverUrl = "http://localhost:5173"
} elseif ($port5174) {
    Write-Host "✅ Port 5174 is active" -ForegroundColor Green
    $serverUrl = "http://localhost:5174"
} else {
    Write-Host "❌ No dev server ports found" -ForegroundColor Red
    exit
}

# Check key files
Write-Host ""
Write-Host "3. Checking files..." -ForegroundColor Yellow
if (Test-Path "src\components\business\BusinessDashboard.tsx") {
    Write-Host "✅ BusinessDashboard.tsx" -ForegroundColor Green
} else {
    Write-Host "❌ BusinessDashboard.tsx missing" -ForegroundColor Red
}

if (Test-Path "src\components\ContactsSidebar.tsx") {
    Write-Host "✅ ContactsSidebar.tsx" -ForegroundColor Green
} else {
    Write-Host "❌ ContactsSidebar.tsx missing" -ForegroundColor Red
}

# Ready to test
Write-Host ""
Write-Host "Ready to Test!" -ForegroundColor Yellow
Write-Host "Server: $serverUrl" -ForegroundColor Cyan
Write-Host ""
Write-Host "Testing Steps:" -ForegroundColor White
Write-Host "1. Open: $serverUrl" -ForegroundColor Cyan
Write-Host "2. Log in (or sign up)" -ForegroundColor Cyan
Write-Host "3. Go to: $serverUrl/business/dashboard" -ForegroundColor Cyan
Write-Host "4. Look for Friends button in header (Users icon)" -ForegroundColor Cyan
Write-Host "5. Click it to open ContactsSidebar!" -ForegroundColor Cyan

Write-Host ""
Write-Host "Open browser now? (Y/N): " -ForegroundColor Yellow -NoNewline
$response = Read-Host

if ($response -match "^[Yy]") {
    Write-Host "Opening browser..." -ForegroundColor Green
    Start-Process $serverUrl
    Start-Sleep -Seconds 2
    Write-Host "Opening business dashboard..." -ForegroundColor Green
    Start-Process "$serverUrl/business/dashboard"
}

Write-Host ""
Write-Host "See TESTING_GUIDE.md for more details" -ForegroundColor Blue