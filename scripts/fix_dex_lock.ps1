# fix_dex_lock.ps1
# Stops Java/ADB, deletes known locked folders, ensures gradle.properties setting, builds with no daemon

$projRoot = (Get-Item -Path .).FullName
$androidDir = Join-Path $projRoot "android"
$gradleProps = Join-Path $androidDir "gradle.properties"

Write-Host "🔧 Killing java/adb processes..."
taskkill /F /IM java.exe /T 2>$null
taskkill /F /IM adb.exe /T 2>$null
Start-Sleep -Milliseconds 800

Write-Host "Deleting dex/transforms/build folders (safe to ignore errors)..."
$paths = @(
    "$androidDir\app\build\intermediates\project_dex_archive",
    "$androidDir\build",
    "$androidDir\app\build",
    "$projRoot\node_modules\@capacitor\**\android\build"
)
foreach ($p in $paths) {
    Write-Host "Removing: $p"
    # Use Get-ChildItem to resolve globs
    try {
        Get-ChildItem -Path $p -Recurse -Force -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    } catch {
        # fallback: try Remove-Item directly
        Remove-Item -LiteralPath $p -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# Ensure gradle filewatcher disabled
if (-not (Test-Path $gradleProps)) {
    Write-Host "Creating gradle.properties..."
    New-Item -Path $gradleProps -ItemType File -Force | Out-Null
}
$gp = Get-Content $gradleProps -ErrorAction SilentlyContinue
if ($gp -notmatch "org.gradle.vfs.watch=false") {
    Add-Content -Path $gradleProps -Value "`norg.gradle.vfs.watch=false"
    Write-Host "Added org.gradle.vfs.watch=false to gradle.properties"
}

# Run gradle clean and build with --no-daemon
Write-Host "📦 Running gradle clean and assembleDebug (no daemon)..."
Set-Location $androidDir
& .\gradlew clean --no-daemon 2>&1 | Write-Host
& .\gradlew assembleDebug --no-daemon 2>&1 | Write-Host

Write-Host "✅ Done. Try Run in Android Studio now (Shift+F10)."
