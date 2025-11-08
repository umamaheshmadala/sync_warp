# Monitor FCM Token Registration Logs
# Run this after launching the app on your device

Write-Host "🔍 Monitoring FCM token registration logs..." -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop monitoring" -ForegroundColor Yellow
Write-Host ""

# Clear old logs
adb logcat -c

# Monitor relevant logs
adb logcat -v time | Select-String -Pattern "FCM|FirebaseMessaging|PushNotification|onMessageReceived|onNewToken|sync_warp"
