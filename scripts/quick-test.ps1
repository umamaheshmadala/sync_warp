# Simple ContactsSidebar Test Helper
Write-Host "🧪 ContactsSidebar Testing Helper" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# Check Node processes
Write-Host "`n1. Checking dev server..." -ForegroundColor Yellow
$nodeProcesses = Get-Process -Name *node* -ErrorAction SilentlyContinue
if ($nodeProcesses.Count -gt 0) {
    Write-Host "✅ Dev server is running" -ForegroundColor Green
} else {
    Write-Host "❌ Dev server not found" -ForegroundColor Red
    Write-Host "💡 Run: npm run dev" -ForegroundColor Blue
    exit
}

# Check port 5173
Write-Host "`n2. Checking port 5173..." -ForegroundColor Yellow
$port5173 = netstat -an | Select-String ":5173.*LISTENING"
if ($port5173) {
    Write-Host "✅ Port 5173 is active" -ForegroundColor Green
    $serverUrl = "http://localhost:5173"
} else {
    # Try 5174
    $port5174 = netstat -an | Select-String ":5174.*LISTENING"
    if ($port5174) {
        Write-Host "✅ Port 5174 is active" -ForegroundColor Green
        $serverUrl = "http://localhost:5174"
    } else {
        Write-Host "❌ No dev server ports found" -ForegroundColor Red
        exit
    }
}

# Check key files
Write-Host "`n3. Checking key files..." -ForegroundColor Yellow
$files = @(
    "src\components\business\BusinessDashboard.tsx",
    "src\components\ContactsSidebar.tsx"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "✅ $file" -ForegroundColor Green
    } else {
        Write-Host "❌ $file missing" -ForegroundColor Red
    }
}

# Ready to test
Write-Host "`n🚀 Ready to Test!" -ForegroundColor Yellow
Write-Host "Server URL: $serverUrl" -ForegroundColor Cyan
Write-Host "`nTesting Steps:" -ForegroundColor White
Write-Host "1. Open: $serverUrl" -ForegroundColor Cyan
Write-Host "2. Log in (or sign up)" -ForegroundColor Cyan
Write-Host "3. Go to: $serverUrl/business/dashboard" -ForegroundColor Cyan
Write-Host "4. Look for 👥 Friends button in header" -ForegroundColor Cyan
Write-Host "5. Click it to open ContactsSidebar!" -ForegroundColor Cyan

Write-Host "`n🌐 Open browser now? (Y/N): " -ForegroundColor Yellow -NoNewline
$response = Read-Host

if ($response -match "^[Yy]") {
    Write-Host "🚀 Opening browser..." -ForegroundColor Green
    Start-Process $serverUrl
}

Write-Host "`n📖 See TESTING_GUIDE.md for detailed instructions" -ForegroundColor Blue