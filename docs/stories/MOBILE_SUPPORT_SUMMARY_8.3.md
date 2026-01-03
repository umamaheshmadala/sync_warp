# 📱 Mobile Support Summary for Epic 8.3 Stories

**Status**: 1/5 stories updated with mobile support

---

## ✅ **STORY 8.3.1: Image Upload & Compression** (COMPLETE)

**Mobile Changes Applied:**
- ✅ Capacitor Camera plugin integration
- ✅ iOS/Android permission configuration
- ✅ Platform-conditional image picker (web vs mobile)
- ✅ Native camera + photo library access
- ✅ Comprehensive mobile testing checklist
- ✅ Mobile success metrics

---

## 🔄 **STORY 8.3.2: Video Upload & Handling** (NEEDS UPDATE)

**Required Mobile Changes:**
1. **Capacitor Camera Plugin** (same as 8.3.1 but for video)
   - iOS: `Camera.getPhoto({ mediaType: CameraMediaType.Video })`
   - Android: Same API, different media type
   
2. **Permissions** (same as 8.3.1):
   - iOS: `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`
   - Android: `CAMERA`, `READ_MEDIA_VIDEO`

3. **Video-Specific Considerations**:
   - iOS: Videos saved as MOV, may need conversion to MP4
   - Android: Videos saved as MP4 by default
   - Max video size: 25MB (enforce on both platforms)
   - Video thumbnail extraction works same on web + mobile (Canvas API via WebView)

4. **Testing Checklist Addition**:
   - [ ] iOS: Record video with native camera → Upload succeeds
   - [ ] Android: Record video with native camera → Upload succeeds
   - [ ] iOS/Android: Select video from gallery → Upload succeeds
   - [ ] Mobile: Video duration detection works (< 60s limit)
   - [ ] Mobile: Thumbnail extracted from video frame

**Code Pattern:**
```typescript
if (Capacitor.isNativePlatform()) {
  const video = await Camera.getPhoto({
    resultType: CameraResultType.Uri,
    source: CameraSource.Camera,
    mediaType: CameraMediaType.Video,
    quality: 90
  })
  // Convert URI to File
}
```

---

## 🔄 **STORY 8.3.3: Link Preview Generation** (NEEDS UPDATE)

**Required Mobile Changes:**
1. **Native Deep Linking** (bonus feature):
   - iOS: Universal Links for SynC coupon/deal links
   - Android: App Links for SynC coupon/deal links
   - Use `@capacitor/app` plugin for URL handling

2. **Native Share Detection**:
   - iOS: Handle shared URLs from Safari/other apps
   - Android: Handle shared URLs from Chrome/other apps
   - Use `@capacitor/app` plugin's `appUrlOpen` listener

3. **Platform Considerations**:
   - Link preview generation is backend-heavy (works same on all platforms)
   - UI rendering differs: mobile optimized layouts (smaller screens)
   - Tap to open link: Use `@capacitor/browser` for in-app browser (iOS/Android)

4. **Testing Checklist Addition**:
   - [ ] iOS: Share SynC coupon link from Safari → App opens with preview
   - [ ] Android: Share SynC coupon link from Chrome → App opens with preview
   - [ ] Mobile: Tap external link → Opens in-app browser (not system browser)
   - [ ] Mobile: Long-press link → Shows "Copy Link" action sheet

**Code Pattern:**
```typescript
import { Browser } from '@capacitor/browser'

async function openLink(url: string) {
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url })  // In-app browser
  } else {
    window.open(url, '_blank')  // New tab
  }
}
```

**Required Plugin:**
```json
{
  "@capacitor/browser": "^5.0.0"
}
```

---

## 🔄 **STORY 8.3.4: Coupon/Deal Sharing** (NEEDS UPDATE)

**Required Mobile Changes:**
1. **Native Share Sheet** (CRITICAL):
   - iOS: `UIActivityViewController` for native sharing
   - Android: `Intent.ACTION_SEND` for native sharing
   - Use `@capacitor/share` plugin

2. **Deep Link Handling**:
   - Generate shareable links: `sync.app/coupon/{id}`
   - iOS/Android: Open app when link tapped (if installed)
   - Fallback: Open web app if native app not installed

3. **Share Tracking**:
   - Track shares from mobile apps (same `shares` table)
   - Add `share_platform` column: 'web' | 'ios' | 'android'

4. **Testing Checklist Addition**:
   - [ ] iOS: Tap share button → Native share sheet appears
   - [ ] iOS: Share to Messages/WhatsApp → Coupon link sent with preview
   - [ ] Android: Tap share button → Native share sheet appears
   - [ ] Android: Share to Messages/WhatsApp → Coupon link sent with preview
   - [ ] Mobile: Track share in database with platform identifier

**Code Pattern:**
```typescript
import { Share } from '@capacitor/share'

async function shareCoupon(couponId: string) {
  if (Capacitor.isNativePlatform()) {
    await Share.share({
      title: 'Check out this coupon!',
      text: `I found a great deal on SynC`,
      url: `https://sync.app/coupon/${couponId}`,
      dialogTitle: 'Share Coupon'
    })
  } else {
    // Web Share API or fallback to copy link
    if (navigator.share) {
      await navigator.share({ url: `https://sync.app/coupon/${couponId}` })
    }
  }
}
```

**Required Plugin:**
```json
{
  "@capacitor/share": "^5.0.0"
}
```

---

## 🔄 **STORY 8.3.5: Media Display Components** (NEEDS UPDATE)

**Required Mobile Changes:**
1. **Native Image Viewer**:
   - iOS: Pinch-to-zoom gestures (UIScrollView)
   - Android: Pinch-to-zoom gestures (Gesture Detector)
   - Use React Native-style gesture handling or `react-zoom-pan-pinch` library

2. **Native Video Player**:
   - iOS: Use AVPlayer via WebView video element (works natively)
   - Android: Use ExoPlayer via WebView video element (works natively)
   - Full-screen mode: Use `@capacitor/screen-orientation` for landscape

3. **Long-Press Actions** (mobile UX):
   - iOS: Long-press image → Action sheet (Save, Copy, Share)
   - Android: Long-press image → Bottom sheet (Save, Copy, Share)
   - Use `@capacitor/haptics` for tactile feedback

4. **Testing Checklist Addition**:
   - [ ] iOS: Tap image → Opens full-screen viewer with pinch-to-zoom
   - [ ] Android: Tap image → Opens full-screen viewer with pinch-to-zoom
   - [ ] iOS: Long-press image → Shows action sheet (Save/Share)
   - [ ] Android: Long-press image → Shows bottom sheet (Save/Share)
   - [ ] Mobile: Tap video → Plays inline
   - [ ] Mobile: Tap fullscreen on video → Rotates to landscape
   - [ ] Mobile: Haptic feedback on long-press

**Code Pattern:**
```typescript
import { Haptics, ImpactStyle } from '@capacitor/haptics'

async function handleImageLongPress() {
  if (Capacitor.isNativePlatform()) {
    await Haptics.impact({ style: ImpactStyle.Medium })
    // Show native action sheet
  }
}
```

**Required Plugins:**
```json
{
  "@capacitor/haptics": "^5.0.0",
  "@capacitor/screen-orientation": "^5.0.0",
  "@capacitor/filesystem": "^5.0.0"  // For saving images
}
```

---

## 📋 **Update Priority**

### Phase 1 (Critical - 2-3 days):
1. ✅ **STORY 8.3.1** (DONE)
2. **STORY 8.3.2** (Video) - Similar to 8.3.1, reuse patterns
3. **STORY 8.3.4** (Sharing) - Native share sheet is key USP

### Phase 2 (Important - 1-2 days):
4. **STORY 8.3.3** (Link Preview) - Deep linking support
5. **STORY 8.3.5** (Display) - Enhanced mobile UX

---

## 🎯 **Common Mobile Patterns**

### Pattern 1: Platform Detection
```typescript
import { Capacitor } from '@capacitor/core'

if (Capacitor.isNativePlatform()) {
  // iOS or Android
} else {
  // Web
}
```

### Pattern 2: Permission Requests
```typescript
import { Camera } from '@capacitor/camera'

const permissions = await Camera.requestPermissions()
if (permissions.camera === 'granted') {
  // Access granted
}
```

### Pattern 3: Native Plugin Usage
```typescript
import { Capacitor } from '@capacitor/core'

async function uploadMedia() {
  if (Capacitor.isNativePlatform()) {
    // Use Capacitor Camera plugin
    const photo = await Camera.getPhoto(...)
  } else {
    // Use browser file input
    const file = await getFileFromInput()
  }
}
```

---

## 📦 **Required Capacitor Plugins (Epic 8.3)**

```json
{
  "@capacitor/camera": "^5.0.0",
  "@capacitor/filesystem": "^5.0.0",
  "@capacitor/share": "^5.0.0",
  "@capacitor/browser": "^5.0.0",
  "@capacitor/haptics": "^5.0.0",
  "@capacitor/screen-orientation": "^5.0.0"
}
```

**Install all:**
```bash
npm install @capacitor/camera @capacitor/filesystem @capacitor/share @capacitor/browser @capacitor/haptics @capacitor/screen-orientation
npx cap sync
```

---

## ✅ **Next Steps**

1. Update STORY 8.3.2 with video mobile support
2. Update STORY 8.3.3 with deep linking
3. Update STORY 8.3.4 with native share sheets
4. Update STORY 8.3.5 with mobile gestures
5. Test all stories on iOS simulator + physical device
6. Test all stories on Android emulator + physical device
7. Update Epic 8.3 Coverage Audit with mobile testing results

---

**Last Updated:** 2025-01-13  
**Status:** 1/5 stories mobile-ready, 4/5 pending updates
