# Story 7.5.1: App Icons & Splash Screens ⚪ PLANNED

**Epic**: EPIC 7.5 - App Store Preparation, Testing & Environment Management  
**Story Points**: 5  
**Estimated Time**: 4-5 hours  
**Dependencies**: None

---

## 📋 Overview

**What**: Design and generate professional app icons and splash screens for all required sizes on iOS and Android platforms.

**Why**: App stores require high-quality icons in specific sizes. Professional branding creates trust and improves discoverability. Icons are the first impression users have of your app.

**User Value**: Users see a polished, professional app icon on their home screen and a branded splash screen when launching the app.

---

## 🎯 Acceptance Criteria

- [ ] 1024x1024 app icon designed
- [ ] All iOS icon sizes generated
- [ ] All Android icon sizes generated
- [ ] 2732x2732 splash screen created
- [ ] Splash screen plugin configured
- [ ] Icons appear correctly on iOS
- [ ] Icons appear correctly on Android
- [ ] Splash screen displays on app launch
- [ ] Documentation created
- [ ] Changes committed to git

---

## 📝 Implementation Steps

### Step 1: Design 1024x1024 App Icon

**Design Requirements**:
- **Size**: 1024x1024 pixels
- **Format**: PNG (no transparency for iOS)
- **Content**: Simple, recognizable design
- **Text**: Minimal or no text (must be readable at small sizes)
- **Safe area**: Keep important content within center 80%

**Design Options**:

**Option 1**: Use Figma/Adobe XD
1. Create 1024x1024 artboard
2. Design icon following iOS/Android guidelines
3. Export as PNG

**Option 2**: Use Canva (free)
1. Go to canva.com
2. Create 1024x1024 custom size
3. Use templates or design from scratch
4. Download as PNG

**Option 3**: Hire designer on Fiverr ($5-20)

**Save file as**: `resources/icon.png`

**Acceptance**: ✅ Icon designed

---

### Step 2: Generate All Icon Sizes

**Use icon.kitchen** (free tool):

1. Go to https://icon.kitchen/
2. Upload your `icon.png` (1024x1024)
3. Configure:
   - **Background**: Choose color or keep transparent
   - **Padding**: 10-20% recommended
   - **iOS**: Enable
   - **Android**: Enable
   - **Web**: Optional
4. Click **Download**
5. Extract ZIP file

**Generated files include**:
- `ios/` - All iOS icon sizes (App Store Connect)
- `android/` - All Android mipmap densities
- `web/` - PWA icons

**Acceptance**: ✅ All sizes generated

---

### Step 3: Add Icons to iOS Project

**Copy iOS icons**:
```powershell
# Copy all icon files to iOS project
Copy-Item "path\to\downloaded\ios\*" "ios\App\App\Assets.xcassets\AppIcon.appiconset\" -Force
```

**Verify in Xcode**:
```bash
npx cap open ios
```

1. In Xcode, select **App** → **Assets.xcassets** → **AppIcon**
2. ✅ All icon slots should be filled
3. If missing, drag icons manually

**Acceptance**: ✅ iOS icons added

---

### Step 4: Add Icons to Android Project

**Copy Android icons**:
```powershell
# Copy mipmap folders
Copy-Item "path\to\downloaded\android\res\*" "android\app\src\main\res\" -Recurse -Force
```

**Verify structure**:
```
android/app/src/main/res/
  mipmap-hdpi/ic_launcher.png
  mipmap-mdpi/ic_launcher.png
  mipmap-xhdpi/ic_launcher.png
  mipmap-xxhdpi/ic_launcher.png
  mipmap-xxxhdpi/ic_launcher.png
```

**Update AndroidManifest.xml** (if needed):
```xml
<application
    android:icon="@mipmap/ic_launcher"
    android:roundIcon="@mipmap/ic_launcher_round"
    ...>
```

**Acceptance**: ✅ Android icons added

---

### Step 5: Create Splash Screen

**Design splash screen**:
- **Size**: 2732x2732 pixels (iOS maximum)
- **Format**: PNG
- **Content**: Logo/brand centered
- **Background**: Solid color matching brand
- **Safe area**: Keep logo within center 1024x1024

**Design tips**:
- Simple is better (loads faster)
- Match app's main color theme
- Logo should be visible on both light/dark backgrounds

**Save as**: `resources/splash.png`

**Acceptance**: ✅ Splash screen designed

---

### Step 6: Configure Splash Screen Plugin

**Install Capacitor Splash Screen**:
```powershell
npm install @capacitor/splash-screen
npx cap sync
```

**File to Edit**: `capacitor.config.ts`

```typescript
import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.sync.app',
  appName: 'SynC',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'small',
      spinnerColor: '#999999',
      splashFullScreen: true,
      splashImmersive: true,
      layoutName: 'launch_screen',
      useDialog: true
    }
  }
}

export default config
```

**Acceptance**: ✅ Plugin configured

---

### Step 7: Add Splash Screen to iOS

**Copy splash to iOS**:
```powershell
# Copy splash.png to iOS assets
Copy-Item "resources\splash.png" "ios\App\App\Assets.xcassets\Splash.imageset\splash.png"
```

**Create/Update Splash.imageset/Contents.json**:
```json
{
  "images": [
    {
      "idiom": "universal",
      "filename": "splash.png",
      "scale": "1x"
    },
    {
      "idiom": "universal",
      "filename": "splash.png",
      "scale": "2x"
    },
    {
      "idiom": "universal",
      "filename": "splash.png",
      "scale": "3x"
    }
  ],
  "info": {
    "version": 1,
    "author": "xcode"
  }
}
```

**Acceptance**: ✅ iOS splash added

---

### Step 8: Add Splash Screen to Android

**Create splash resource**:

**File to Create**: `android/app/src/main/res/drawable/splash.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:drawable="@color/splash_background"/>
    <item>
        <bitmap
            android:gravity="center"
            android:src="@drawable/splash_image"/>
    </item>
</layer-list>
```

**Add splash image**:
```powershell
# Copy splash to Android drawables
Copy-Item "resources\splash.png" "android\app\src\main\res\drawable\splash_image.png"
```

**Add background color**: `android/app/src/main/res/values/colors.xml`
```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="splash_background">#ffffff</color>
</resources>
```

**Acceptance**: ✅ Android splash added

---

### Step 9: Test Icons and Splash Screens

**Test on Android**:
```powershell
npm run build
npx cap sync android
npm run mobile:android
```

**Verify**:
- ✅ Splash screen appears on launch
- ✅ Icon appears in app launcher
- ✅ Icon appears in settings
- ✅ Splash hides after 2 seconds

**Test on iOS** (Mac only):
```bash
npm run build
npx cap sync ios
npm run mobile:ios
```

**Verify**:
- ✅ Splash screen appears on launch
- ✅ Icon appears on home screen
- ✅ Icon appears in App Switcher
- ✅ Splash transitions smoothly

**Acceptance**: ✅ All tested

---

### Step 10: Create Documentation

**Create new file**: `docs/APP_ICONS_SPLASH.md`

```markdown
# App Icons & Splash Screens 🎨

## Icon Specifications

### Master Icon
- **Size**: 1024x1024 px
- **Format**: PNG
- **Location**: `resources/icon.png`
- **Used for**: App Store, Google Play

### iOS Icons
- **Sizes**: 20pt to 1024pt (2x, 3x variants)
- **Location**: `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
- **Tool**: icon.kitchen

### Android Icons
- **Densities**: mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi
- **Location**: `android/app/src/main/res/mipmap-*/`
- **Tool**: icon.kitchen

---

## Splash Screen Specifications

### Master Splash
- **Size**: 2732x2732 px
- **Format**: PNG
- **Location**: `resources/splash.png`
- **Design**: Logo centered, solid background

### Configuration
- **Plugin**: @capacitor/splash-screen
- **Duration**: 2000ms
- **Auto-hide**: Yes
- **Background**: #ffffff

---

## Updating Icons

1. Edit `resources/icon.png`
2. Generate sizes: https://icon.kitchen/
3. Copy to iOS: `ios/App/App/Assets.xcassets/`
4. Copy to Android: `android/app/src/main/res/`
5. Run: `npx cap sync`
6. Test on devices

---

## Updating Splash Screen

1. Edit `resources/splash.png`
2. Copy to iOS assets
3. Copy to Android drawable
4. Update colors if needed
5. Run: `npx cap sync`
6. Test on devices

---

## Design Guidelines

### Icons
- Simple, recognizable design
- No small text
- High contrast
- Works at small sizes
- Unique/memorable

### Splash Screens
- Match brand colors
- Logo centered
- Fast loading
- Smooth transition
- Professional appearance

---

## Tools

- **icon.kitchen**: https://icon.kitchen/
- **Figma**: https://figma.com/
- **Canva**: https://canva.com/
- **Capacitor Assets**: https://capacitorjs.com/docs/guides/splash-screens-and-icons
```

**Save as**: `docs/APP_ICONS_SPLASH.md`

**Acceptance**: ✅ Documentation created

---

### Step 11: Commit Icons and Splash

**Terminal Commands**:
```powershell
git add resources/
git add ios/App/App/Assets.xcassets/
git add android/app/src/main/res/
git add capacitor.config.ts
git add docs/APP_ICONS_SPLASH.md
git add package.json

git commit -m "feat: Add app icons and splash screens - Story 7.5.1

- Created 1024x1024 master app icon
- Generated all iOS icon sizes
- Generated all Android icon sizes  
- Created 2732x2732 splash screen
- Configured Capacitor splash screen plugin
- Added icons to iOS Assets.xcassets
- Added icons to Android mipmap resources
- Added splash screens for both platforms
- Tested on iOS and Android devices
- Created comprehensive documentation

Changes:
- resources/icon.png: Master app icon (1024x1024)
- resources/splash.png: Master splash screen (2732x2732)
- ios/App/App/Assets.xcassets/: iOS icons and splash
- android/app/src/main/res/: Android icons and splash
- capacitor.config.ts: Splash screen configuration
- docs/APP_ICONS_SPLASH.md: Documentation
- package.json: Added @capacitor/splash-screen

Epic: 7.5 - App Store Preparation
Story: 7.5.1 - App Icons & Splash Screens

Features:
- Professional branding
- Cross-platform icons
- Branded splash screens
- App store ready assets"

git push origin mobile-app-setup
```

**Acceptance**: ✅ All changes committed

---

## ✅ Verification Checklist

- [ ] 1024x1024 icon designed
- [ ] icon.kitchen used to generate sizes
- [ ] iOS icons added to Assets.xcassets
- [ ] Android icons added to mipmap folders
- [ ] 2732x2732 splash screen created
- [ ] Splash screen plugin installed
- [ ] Splash configured in capacitor.config.ts
- [ ] iOS splash added to assets
- [ ] Android splash drawable created
- [ ] Tested on Android device
- [ ] Tested on iOS device
- [ ] Icons display correctly
- [ ] Splash displays and hides correctly
- [ ] Documentation created
- [ ] All changes committed

**All items checked?** ✅ Story 7.5.1 is COMPLETE

---

## 🚨 Troubleshooting

### Issue: Icons not showing on iOS
**Solution**:
- Clean build folder in Xcode (Cmd+Shift+K)
- Delete app from device
- Rebuild and reinstall

### Issue: Splash screen not appearing
**Solution**:
- Verify plugin installed: `npm list @capacitor/splash-screen`
- Check capacitor.config.ts configuration
- Run `npx cap sync`
- Rebuild app

### Issue: Icon sizes wrong
**Solution**:
- Use icon.kitchen with correct settings
- Verify 1024x1024 source is high quality
- Check all size variants generated

---

## 📚 Additional Notes

### What We Built
- ✅ Master icon (1024x1024)
- ✅ iOS icon set (all sizes)
- ✅ Android icon set (all densities)
- ✅ Master splash (2732x2732)
- ✅ iOS splash screen
- ✅ Android splash screen
- ✅ Plugin configuration

### Design Tips
- Keep it simple
- High contrast
- Recognizable at small sizes
- Unique but professional
- Consistent branding

### What's Next
- **Story 7.5.2**: App Permissions Configuration
- **Story 7.5.3**: Environment Configuration

---

## 🔗 Related Documentation

- [iOS Icon Guidelines](https://developer.apple.com/design/human-interface-guidelines/app-icons)
- [Android Icon Guidelines](https://developer.android.com/google-play/resources/icon-design-specifications)
- [Capacitor Splash Screen](https://capacitorjs.com/docs/apis/splash-screen)
- [icon.kitchen](https://icon.kitchen/)

---

**Story Status**: ⚪ PLANNED  
**Next Story**: [STORY_7.5.2_App_Permissions.md](./STORY_7.5.2_App_Permissions.md)  
**Epic Progress**: Story 1/8 complete (0% → 12.5%)
