# Generate Android Icons from Logo
# This script resizes the Sync Logo Transparent.png to all required Android icon sizes

Add-Type -AssemblyName System.Drawing

$sourceLogo = "C:\Users\umama\Documents\GitHub\sync_warp\Logo\Sync Logo Transparent.png"
$androidResPath = "C:\Users\umama\Documents\GitHub\sync_warp\android\app\src\main\res"

# Android icon sizes (mipmap densities)
$iconSizes = @{
    "mipmap-mdpi" = 48
    "mipmap-hdpi" = 72
    "mipmap-xhdpi" = 96
    "mipmap-xxhdpi" = 144
    "mipmap-xxxhdpi" = 192
}

# Foreground icon sizes (for adaptive icons)
$foregroundSizes = @{
    "mipmap-mdpi" = 108
    "mipmap-hdpi" = 162
    "mipmap-xhdpi" = 216
    "mipmap-xxhdpi" = 324
    "mipmap-xxxhdpi" = 432
}

function Resize-Image {
    param(
        [string]$SourcePath,
        [string]$DestPath,
        [int]$Width,
        [int]$Height
    )
    
    $sourceImage = [System.Drawing.Image]::FromFile($SourcePath)
    $destImage = New-Object System.Drawing.Bitmap($Width, $Height)
    $graphics = [System.Drawing.Graphics]::FromImage($destImage)
    
    # High quality settings
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    
    $graphics.DrawImage($sourceImage, 0, 0, $Width, $Height)
    
    $destImage.Save($DestPath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    $graphics.Dispose()
    $destImage.Dispose()
    $sourceImage.Dispose()
}

Write-Host "Generating Android icons from Sync Logo..." -ForegroundColor Cyan

# Generate ic_launcher.png for each density
foreach ($density in $iconSizes.Keys) {
    $size = $iconSizes[$density]
    $destPath = Join-Path $androidResPath "$density\ic_launcher.png"
    
    Write-Host "  Generating $density/ic_launcher.png (${size}x${size}px)..." -ForegroundColor Yellow
    Resize-Image -SourcePath $sourceLogo -DestPath $destPath -Width $size -Height $size
}

# Generate ic_launcher_round.png for each density (same as launcher)
foreach ($density in $iconSizes.Keys) {
    $size = $iconSizes[$density]
    $destPath = Join-Path $androidResPath "$density\ic_launcher_round.png"
    
    Write-Host "  Generating $density/ic_launcher_round.png (${size}x${size}px)..." -ForegroundColor Yellow
    Resize-Image -SourcePath $sourceLogo -DestPath $destPath -Width $size -Height $size
}

# Generate ic_launcher_foreground.png for adaptive icons
foreach ($density in $foregroundSizes.Keys) {
    $size = $foregroundSizes[$density]
    $destPath = Join-Path $androidResPath "$density\ic_launcher_foreground.png"
    
    Write-Host "  Generating $density/ic_launcher_foreground.png (${size}x${size}px)..." -ForegroundColor Yellow
    Resize-Image -SourcePath $sourceLogo -DestPath $destPath -Width $size -Height $size
}

Write-Host ""
Write-Host "✅ Android icons generated successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Generated icons:" -ForegroundColor Cyan
Write-Host "  • ic_launcher.png (standard icons)" -ForegroundColor White
Write-Host "  • ic_launcher_round.png (round icons)" -ForegroundColor White
Write-Host "  • ic_launcher_foreground.png (adaptive icon foreground)" -ForegroundColor White
Write-Host ""
Write-Host "Densities:" -ForegroundColor Cyan
Write-Host "  • mdpi:    48x48px   (baseline)" -ForegroundColor White
Write-Host "  • hdpi:    72x72px   (1.5x)" -ForegroundColor White
Write-Host "  • xhdpi:   96x96px   (2x)" -ForegroundColor White
Write-Host "  • xxhdpi:  144x144px (3x)" -ForegroundColor White
Write-Host "  • xxxhdpi: 192x192px (4x)" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. npx cap sync android" -ForegroundColor Yellow
Write-Host "  2. Rebuild your Android app" -ForegroundColor Yellow
