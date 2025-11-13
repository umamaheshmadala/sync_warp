# Send Test FCM Notification using V1 API
# Prerequisites:
# 1. Your service account key JSON file from Firebase Console
# 2. A valid FCM token from the push_tokens table
# 3. Google Cloud SDK installed OR use the test token endpoint in Firebase Console

param(
    [Parameter(Mandatory=$true)]
    [string]$FcmToken,
    
    [Parameter(Mandatory=$false)]
    [string]$ProjectId = "sync-warp",  # Update with your Firebase project ID
    
    [Parameter(Mandatory=$false)]
    [string]$Title = "Test Notification",
    
    [Parameter(Mandatory=$false)]
    [string]$Body = "This is a test push notification from FCM V1 API"
)

Write-Host "📬 Sending test notification..." -ForegroundColor Cyan
Write-Host ""
Write-Host "FCM Token: $($FcmToken.Substring(0, 20))..." -ForegroundColor Yellow
Write-Host "Project: $ProjectId" -ForegroundColor Yellow
Write-Host ""

# Note: To actually send via V1 API, you need:
# 1. OAuth 2.0 access token from service account
# 2. Make HTTP POST to: https://fcm.googleapis.com/v1/projects/{project-id}/messages:send

Write-Host "⚠️  Manual Testing Options:" -ForegroundColor Yellow
Write-Host ""
Write-Host "Option 1: Firebase Console Notifications Composer" -ForegroundColor Green
Write-Host "  1. Go to: https://console.firebase.google.com/project/$ProjectId/notification" -ForegroundColor White
Write-Host "  2. Click 'Send your first message'" -ForegroundColor White
Write-Host "  3. Enter title and body" -ForegroundColor White
Write-Host "  4. Click 'Send test message'" -ForegroundColor White
Write-Host "  5. Paste your FCM token" -ForegroundColor White
Write-Host ""
Write-Host "Option 2: Use Supabase Edge Function (recommended)" -ForegroundColor Green
Write-Host "  Create an Edge Function that:" -ForegroundColor White
Write-Host "  - Fetches FCM server key from Supabase Vault" -ForegroundColor White
Write-Host "  - Uses Google Auth Library to get access token" -ForegroundColor White
Write-Host "  - Sends notification via FCM V1 API" -ForegroundColor White
Write-Host ""
Write-Host "Option 3: Local testing with gcloud CLI" -ForegroundColor Green
Write-Host "  Install gcloud CLI, then:" -ForegroundColor White
Write-Host "  gcloud auth application-default login" -ForegroundColor White
Write-Host "  # Use the access token to send FCM request" -ForegroundColor White
Write-Host ""

# Copy token to clipboard for easy testing
Set-Clipboard -Value $FcmToken
Write-Host "✅ FCM token copied to clipboard!" -ForegroundColor Green
Write-Host "   Paste it into Firebase Console test notification sender" -ForegroundColor Green
