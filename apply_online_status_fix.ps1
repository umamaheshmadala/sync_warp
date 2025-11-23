# PowerShell script to add online status tracking to App.tsx

$file = "src\App.tsx"
$content = Get-Content $file -Raw

# Add import after DevMenu line
$content = $content -replace "(import DevMenu from './components/DevMenu')", "`$1`nimport { useUpdateOnlineStatus } from './hooks/useUpdateOnlineStatus'"

# Add hook call after pushState
$content = $content -replace "(const pushState = usePushNotifications\(user\?\?\.id \?\? null\))", "`$1`n`n  // Track user's online status in database`n  useUpdateOnlineStatus()"

# Write back to file
$content | Set-Content $file -NoNewline

Write-Host "✅ Successfully updated App.tsx with online status tracking"
