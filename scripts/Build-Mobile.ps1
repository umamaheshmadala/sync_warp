<#
.SYNOPSIS
    Build and sync mobile app for different environments
.DESCRIPTION
    Builds the web app with environment-specific configuration and syncs with Capacitor platforms
.PARAMETER Env
    Environment to build for: dev, staging, or prod (default: dev)
.PARAMETER Platform
    Platform to build for: android or ios (default: android)
.PARAMETER Open
    Open the platform in IDE after sync (default: true)
.EXAMPLE
    .\scripts\Build-Mobile.ps1 -Env dev -Platform android
.EXAMPLE
    .\scripts\Build-Mobile.ps1 -Env prod -Platform android -Open $false
#>

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('dev', 'staging', 'prod')]
    [string]$Env = 'dev',
    
    [Parameter(Mandatory=$false)]
    [ValidateSet('android', 'ios')]
    [string]$Platform = 'android',
    
    [Parameter(Mandatory=$false)]
    [bool]$Open = $true
)

# Color output functions
function Write-Info { param($Message) Write-Host "ℹ️  $Message" -ForegroundColor Cyan }
function Write-Success { param($Message) Write-Host "✅ $Message" -ForegroundColor Green }
function Write-Error { param($Message) Write-Host "❌ $Message" -ForegroundColor Red }
function Write-Warning { param($Message) Write-Host "⚠️  $Message" -ForegroundColor Yellow }

# Script header
Write-Host ""
Write-Host "🚀 Mobile Build Script" -ForegroundColor Magenta
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Magenta
Write-Info "Environment: $Env"
Write-Info "Platform: $Platform"
Write-Info "Open IDE: $Open"
Write-Host ""

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Error "node_modules not found. Run 'npm install' first."
    exit 1
}

# Step 1: Build web app
Write-Info "Step 1: Building web app for $Env environment..."
try {
    npm run "build:$Env"
    if ($LASTEXITCODE -ne 0) {
        throw "Build failed"
    }
    Write-Success "Web app built successfully"
} catch {
    Write-Error "Failed to build web app: $_"
    exit 1
}

# Step 2: Sync with Capacitor
Write-Info "Step 2: Syncing with $Platform platform..."
try {
    npx cap sync $Platform
    if ($LASTEXITCODE -ne 0) {
        throw "Sync failed"
    }
    Write-Success "Platform synced successfully"
} catch {
    Write-Error "Failed to sync platform: $_"
    exit 1
}

# Step 3: Open in IDE (optional)
if ($Open) {
    Write-Info "Step 3: Opening $Platform in IDE..."
    try {
        npx cap open $Platform
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to open IDE"
        }
        Write-Success "IDE opened successfully"
    } catch {
        Write-Warning "Failed to open IDE automatically. Open manually."
    }
}

# Success message
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Success "Build complete!"
Write-Host ""

# Display next steps
Write-Host "📱 Next Steps:" -ForegroundColor Yellow
if ($Platform -eq "android") {
    Write-Host "   1. Wait for Android Studio to open" -ForegroundColor White
    Write-Host "   2. Select build variant: $Env" -ForegroundColor White
    Write-Host "      - Build → Select Build Variant → choose '${Env}Debug' or '${Env}Release'" -ForegroundColor Gray
    Write-Host "   3. Run on device or emulator" -ForegroundColor White
} else {
    Write-Host "   1. Wait for Xcode to open" -ForegroundColor White
    Write-Host "   2. Select appropriate scheme" -ForegroundColor White
    Write-Host "   3. Run on device or simulator" -ForegroundColor White
}

# Display app info
Write-Host ""
Write-Host "📦 App Information:" -ForegroundColor Yellow
switch ($Env) {
    "dev" {
        Write-Host "   Name: Sync Dev" -ForegroundColor White
        Write-Host "   ID: com.syncapp.mobile.dev" -ForegroundColor White
    }
    "staging" {
        Write-Host "   Name: Sync Staging" -ForegroundColor White
        Write-Host "   ID: com.syncapp.mobile.staging" -ForegroundColor White
    }
    "prod" {
        Write-Host "   Name: Sync App" -ForegroundColor White
        Write-Host "   ID: com.syncapp.mobile" -ForegroundColor White
    }
}
Write-Host ""
