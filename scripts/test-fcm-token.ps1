# Verify FCM Token Registration in Supabase
# This script checks if the FCM token was successfully registered

Write-Host "🔍 Checking FCM token registration in Supabase..." -ForegroundColor Cyan
Write-Host ""

# Note: Run this after logging into the app on your device
Write-Host "Instructions:" -ForegroundColor Yellow
Write-Host "1. Make sure you've logged into the app" -ForegroundColor Yellow
Write-Host "2. Grant notification permissions when prompted" -ForegroundColor Yellow
Write-Host "3. Wait a few seconds for token registration" -ForegroundColor Yellow
Write-Host ""

# You'll need to check the push_tokens table in Supabase Dashboard
# Or create a simple Edge Function to query it

Write-Host "✅ Go to Supabase Dashboard > Table Editor > push_tokens" -ForegroundColor Green
Write-Host "   Look for a new row with:" -ForegroundColor Green
Write-Host "   - platform: 'android'" -ForegroundColor Green
Write-Host "   - Your user_id" -ForegroundColor Green
Write-Host "   - A valid FCM token (long string)" -ForegroundColor Green
Write-Host ""
Write-Host "Alternative: Query via SQL Editor:" -ForegroundColor Cyan
Write-Host "SELECT * FROM push_tokens WHERE platform = 'android' ORDER BY created_at DESC LIMIT 5;" -ForegroundColor White
