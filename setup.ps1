# ============================================
# SYNC APP - ONE-CLICK SETUP SCRIPT
# ============================================
# Run this on your new laptop in PowerShell (as Admin)
#
# Usage: 
#   1. Open PowerShell as Administrator
#   2. cd to where you want the project
#   3. Run: .\setup.ps1
# ============================================

Write-Host "🚀 SYNC APP - Automated Setup Starting..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Check if Node.js is installed
$nodeVersion = node --version 2>$null
if (-not $nodeVersion) {
    Write-Host "📦 Installing Node.js..." -ForegroundColor Yellow
    winget install OpenJS.NodeJS.LTS -e --silent
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    Write-Host "✅ Node.js installed" -ForegroundColor Green
} else {
    Write-Host "✅ Node.js already installed: $nodeVersion" -ForegroundColor Green
}

# Step 2: Check if Git is installed
$gitVersion = git --version 2>$null
if (-not $gitVersion) {
    Write-Host "📦 Installing Git..." -ForegroundColor Yellow
    winget install Git.Git -e --silent
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    Write-Host "✅ Git installed" -ForegroundColor Green
} else {
    Write-Host "✅ Git already installed: $gitVersion" -ForegroundColor Green
}

# Step 3: Clone repository (if not already in it)
if (-not (Test-Path ".git")) {
    Write-Host "📥 Cloning repository..." -ForegroundColor Yellow
    git clone https://github.com/umamaheshmadala/sync_warp.git
    Set-Location sync_warp
    Write-Host "✅ Repository cloned" -ForegroundColor Green
} else {
    Write-Host "✅ Already in repository" -ForegroundColor Green
}

# Step 4: Switch to development branch
Write-Host "🔀 Switching to development branch..." -ForegroundColor Yellow
git checkout mostly_antigravity_build
git pull origin mostly_antigravity_build
Write-Host "✅ On mostly_antigravity_build branch" -ForegroundColor Green

# Step 5: Install npm dependencies
Write-Host "📦 Installing dependencies (this takes 2-3 minutes)..." -ForegroundColor Yellow
npm install
Write-Host "✅ Dependencies installed" -ForegroundColor Green

# Step 6: Setup environment files
Write-Host "⚙️ Setting up environment files..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
}
if (-not (Test-Path ".env.development")) {
    Copy-Item ".env.example" ".env.development"
}
if (-not (Test-Path ".env.local")) {
    Copy-Item ".env.example" ".env.local"
}
Write-Host "✅ Environment files created" -ForegroundColor Green

# Step 7: Install Playwright browsers (for E2E tests)
Write-Host "🎭 Installing Playwright browsers..." -ForegroundColor Yellow
npx playwright install chromium
Write-Host "✅ Playwright ready" -ForegroundColor Green

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "🎉 SETUP COMPLETE!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "To start development:" -ForegroundColor White
Write-Host "  npm run dev" -ForegroundColor Yellow
Write-Host ""
Write-Host "To run on Android:" -ForegroundColor White
Write-Host "  npm run build && npx cap sync && npx cap run android" -ForegroundColor Yellow
Write-Host ""
Write-Host "To run tests:" -ForegroundColor White
Write-Host "  npm test" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Cyan
