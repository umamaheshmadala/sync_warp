# ContactsSidebar Testing Helper Script
# Run this script to help with testing: .\test-helper.ps1

Write-Host "🧪 ContactsSidebar Testing Helper" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# Check if Node.js processes are running
Write-Host "`n1. 🔍 Checking dev server status..." -ForegroundColor Yellow
$nodeProcesses = Get-Process -Name *node* -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "✅ Dev server is running (PIDs: $($nodeProcesses.Id -join ', '))" -ForegroundColor Green
    
    # Check if port 5173 is listening
    $portCheck = netstat -an | Select-String ":5173"
    if ($portCheck) {
        Write-Host "✅ Port 5173 is active" -ForegroundColor Green
        $serverUrl = "http://localhost:5173"
    } else {
        Write-Host "⚠️  Port 5173 not found, checking for other ports..." -ForegroundColor Yellow
        $otherPorts = netstat -an | Select-String ":517[0-9]" | Select-Object -First 1
        if ($otherPorts) {
            $portMatch = [regex]::Match($otherPorts.ToString(), ':(517[0-9])')
            if ($portMatch.Success) {
                $port = $portMatch.Groups[1].Value
                $serverUrl = "http://localhost:$port"
                Write-Host "📍 Found server on port $port" -ForegroundColor Yellow
            } else {
                Write-Host "❌ Could not extract port number" -ForegroundColor Red
                $serverUrl = $null
            }
        } else {
            Write-Host "❌ No dev server ports found" -ForegroundColor Red
            $serverUrl = $null
        }
    }
} else {
    Write-Host "❌ No Node.js processes found - dev server may not be running" -ForegroundColor Red
    Write-Host "💡 Run 'npm run dev' to start the server" -ForegroundColor Blue
    $serverUrl = $null
}

# Check for recent changes
Write-Host "`n2. 📁 Checking for unsaved changes..." -ForegroundColor Yellow
try {
    $gitStatus = git status --porcelain 2>$null
    if ($gitStatus) {
        Write-Host "⚠️  Found unsaved changes:" -ForegroundColor Yellow
        $gitStatus | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }
    } else {
        Write-Host "✅ All changes are saved" -ForegroundColor Green
    }
} catch {
    Write-Host "📝 Git status check skipped (not a git repository)" -ForegroundColor Gray
}

# Show current directory and key files
Write-Host "`n3. 📂 Verifying key files..." -ForegroundColor Yellow
$keyFiles = @(
    "src\router\Router.tsx",
    "src\components\business\BusinessDashboard.tsx",
    "src\components\ContactsSidebar.tsx",
    "src\components\NotificationHub.tsx"
)

foreach ($file in $keyFiles) {
    if (Test-Path $file) {
        Write-Host "✅ $file exists" -ForegroundColor Green
    } else {
        Write-Host "❌ $file missing" -ForegroundColor Red
    }
}

# Provide next steps
Write-Host "`n4. 🚀 Ready to test!" -ForegroundColor Yellow
Write-Host "=================================" -ForegroundColor Cyan

if ($serverUrl) {
    Write-Host "📋 Testing Steps:" -ForegroundColor White
    Write-Host "1. Open browser to: $serverUrl" -ForegroundColor Cyan
    Write-Host "2. Log in to your account (or sign up)" -ForegroundColor Cyan  
    Write-Host "3. Navigate to: $serverUrl/business/dashboard" -ForegroundColor Cyan
    Write-Host "4. Look for the 👥 Friends button in the header" -ForegroundColor Cyan
    Write-Host "5. Click it to open ContactsSidebar!" -ForegroundColor Cyan
    
    # Ask if user wants to open browser automatically
    Write-Host "`n🌐 Would you like to open the browser now? (Y/N)" -ForegroundColor Yellow
    $openBrowser = Read-Host
    
    if ($openBrowser -match "^[Yy]") {
        Write-Host "🚀 Opening browser..." -ForegroundColor Green
        Start-Process $serverUrl
        
        # Wait a moment then open business dashboard
        Start-Sleep -Seconds 2
        Write-Host "📱 Opening business dashboard..." -ForegroundColor Green
        Start-Process "$serverUrl/business/dashboard"
    }
} else {
    Write-Host "❌ Cannot proceed - dev server is not running" -ForegroundColor Red
    Write-Host "💡 Please run 'npm run dev' first, then run this script again" -ForegroundColor Blue
}

Write-Host "`n📖 For detailed testing instructions, see: TESTING_GUIDE.md" -ForegroundColor Blue
Write-Host "🆘 If you encounter issues, check the troubleshooting section in the guide" -ForegroundColor Blue

# Ask if they want to enable quick test mode (bypass auth)
if ($serverUrl) {
    Write-Host "`n🔓 Quick Test Mode" -ForegroundColor Yellow
    Write-Host "Would you like to temporarily disable authentication for easier testing? (Y/N)" -ForegroundColor Yellow
    Write-Host "Note: This will allow you to access the business dashboard without logging in." -ForegroundColor Gray
    
    $quickTest = Read-Host
    if ($quickTest -match "^[Yy]") {
        Write-Host "⚙️  Enabling quick test mode..." -ForegroundColor Yellow
        Write-Host "This will modify the router temporarily. Remember to log in normally after testing!" -ForegroundColor Red
        
        # This would modify the router file to set protected: false
        # For now, just provide instructions
        Write-Host "📝 To enable quick test mode manually:" -ForegroundColor Blue
        Write-Host "1. Open src\router\Router.tsx" -ForegroundColor Gray
        Write-Host "2. Find the '/business/dashboard' route (around line 167)" -ForegroundColor Gray
        Write-Host "3. Change 'protected: true' to 'protected: false'" -ForegroundColor Gray
        Write-Host "4. Save the file and refresh your browser" -ForegroundColor Gray
        Write-Host "5. Navigate to $serverUrl/business/dashboard" -ForegroundColor Gray
        Write-Host "`n⚠️  Remember to change it back to 'protected: true' when done testing!" -ForegroundColor Red
    }
}