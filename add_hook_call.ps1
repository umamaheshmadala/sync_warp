# PowerShell script to add online status tracking hook call to App.tsx

$file = "src\App.tsx"
$content = Get-Content $file -Raw

# Add hook call after pushState line
$oldText = "  const pushState = usePushNotifications(user?.id ?? null)`r`n`r`n  // Handle notification routing"
$newText = "  const pushState = usePushNotifications(user?.id ?? null)`r`n`r`n  // Track user's online status in database`r`n  useUpdateOnlineStatus()`r`n`r`n  // Handle notification routing"

$content = $content.Replace($oldText, $newText)

# Write back to file
$content | Set-Content $file -NoNewline

Write-Host "✅ Successfully added useUpdateOnlineStatus() hook call to App.tsx"
