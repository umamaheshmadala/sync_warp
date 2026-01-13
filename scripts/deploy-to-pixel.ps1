# Deploy to Pixel 9 Pro Emulator Script
# This script builds the latest web assets, syncs them to the Android project,
# and runs the app on the Pixel_9_Pro emulator.

Write-Host "Starting deployment to Pixel_9_Pro..." -ForegroundColor Cyan

# 1. Build the web application
Write-Host "Step 1: Building web assets (npm run build)..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "Build failed. Exiting."
    exit 1
}

# 2. Sync with Capacitor
Write-Host "Step 2: Syncing to Android (npx cap sync android)..." -ForegroundColor Yellow
npx cap sync android
if ($LASTEXITCODE -ne 0) {
    Write-Error "Sync failed. Exiting."
    exit 1
}

# 3. Run on Android Emulator
Write-Host "Step 3: deploying to Pixel_9_Pro (npx cap run android)..." -ForegroundColor Yellow
npx cap run android --target Pixel_9_Pro

Write-Host "Deployment command finished." -ForegroundColor Green
