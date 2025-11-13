# Android App Icon Update

## ✅ Completed

The Android app icon has been successfully updated to use the official Sync logo.

## Changes Made

### 1. Source Logo
**File Used:** `Logo/Sync Logo Transparent.png`
- Dimensions: 464x464px
- Format: PNG with transparency
- Perfect square ratio

### 2. Android Icons Generated

All required Android icon densities have been generated from the source logo:

#### Standard Icons (`ic_launcher.png`)
- **mdpi** (baseline): 48x48px
- **hdpi** (1.5x): 72x72px
- **xhdpi** (2x): 96x96px
- **xxhdpi** (3x): 144x144px
- **xxxhdpi** (4x): 192x192px

#### Round Icons (`ic_launcher_round.png`)
- Same sizes as standard icons
- For devices that use circular launcher icons

#### Adaptive Icon Foreground (`ic_launcher_foreground.png`)
- **mdpi**: 108x108px
- **hdpi**: 162x162px
- **xhdpi**: 216x216px
- **xxhdpi**: 324x324px
- **xxxhdpi**: 432x432px

### 3. PWA Icons Updated

Also updated Progressive Web App icons for consistency:
- `public/pwa-192x192.png` - 192x192px (for app manifest)
- `public/pwa-512x512.png` - 512x512px (for app manifest)
- `public/apple-touch-icon.png` - 180x180px (for iOS home screen)

## File Locations

### Android Native Icons
```
android/app/src/main/res/
├── mipmap-mdpi/
│   ├── ic_launcher.png
│   ├── ic_launcher_round.png
│   └── ic_launcher_foreground.png
├── mipmap-hdpi/
│   ├── ic_launcher.png
│   ├── ic_launcher_round.png
│   └── ic_launcher_foreground.png
├── mipmap-xhdpi/
│   ├── ic_launcher.png
│   ├── ic_launcher_round.png
│   └── ic_launcher_foreground.png
├── mipmap-xxhdpi/
│   ├── ic_launcher.png
│   ├── ic_launcher_round.png
│   └── ic_launcher_foreground.png
└── mipmap-xxxhdpi/
    ├── ic_launcher.png
    ├── ic_launcher_round.png
    └── ic_launcher_foreground.png
```

### PWA Icons
```
public/
├── pwa-192x192.png
├── pwa-512x512.png
└── apple-touch-icon.png
```

## Generation Script

A PowerShell script has been created for future icon updates:

**File:** `generate-android-icons.ps1`

**Usage:**
```powershell
powershell.exe -ExecutionPolicy Bypass -File generate-android-icons.ps1
```

This script will:
1. Read the source logo from `Logo/Sync Logo Transparent.png`
2. Generate all required Android icon sizes
3. Use high-quality bicubic interpolation for resizing
4. Save icons directly to the Android resource folders

## Next Steps

### To Apply Icons to Android App:

1. **Sync Capacitor** (Already done):
   ```bash
   npx cap sync android
   ```

2. **Rebuild the Android app**:
   - Open Android Studio
   - Clean and rebuild project
   - OR use command line:
   ```bash
   cd android
   ./gradlew clean
   ./gradlew assembleDebug
   ```

3. **Install on device/emulator**:
   ```bash
   npx cap run android
   ```

### To Test:

1. **Uninstall the old app** from your device/emulator
2. **Install the new build**
3. **Check the home screen** - you should see the new Sync logo
4. **Check app drawer** - icon should appear with new logo
5. **Test adaptive icon** (Android 8.0+) - icon should adapt to device theme

## Icon Design Notes

### Transparency
- The logo has a transparent background
- Works well on all launcher backgrounds
- No white box or background color issues

### Visibility
- Logo is clearly visible at small sizes (48x48px)
- Good contrast and recognizable design
- Works in both light and dark themes

### Adaptive Icons
- Android 8.0+ uses adaptive icons
- Foreground layer is the full logo
- Background is transparent (can be themed by launcher)
- Safe zone respected (inner 66% contains critical content)

## Troubleshooting

### Icons not updating after rebuild?
1. Uninstall the app completely
2. Clear Android Studio cache
3. Clean and rebuild project
4. Reinstall fresh

### Icons look blurry?
- Ensure you're using the correct density for your device
- Script generates high-quality icons with proper interpolation
- Source logo is high resolution (464x464px)

### Round icons not showing?
- Round icons only show on launchers that support them
- Most modern Android launchers do (Pixel, Samsung, etc.)
- Falls back to standard icon if not supported

## Future Updates

To update icons in the future:

1. Replace `Logo/Sync Logo Transparent.png` with new logo
2. Run `generate-android-icons.ps1`
3. Run `npx cap sync android`
4. Rebuild app

## References

- [Android Icon Guidelines](https://developer.android.com/guide/practices/ui_guidelines/icon_design_launcher)
- [Adaptive Icons](https://developer.android.com/develop/ui/views/launch/icon_design_adaptive)
- [Material Design Icons](https://material.io/design/iconography/product-icons.html)

---

**Updated:** 2025-01-07
**Source Logo:** `Logo/Sync Logo Transparent.png` (464x464px)
**Densities Generated:** mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi
**Status:** ✅ Complete and synced
