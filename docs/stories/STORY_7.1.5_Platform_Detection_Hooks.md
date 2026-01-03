# Story 7.1.5: Mobile Platform Detection & Hooks ⚪ PLANNED

**Epic**: EPIC 7.1 - Capacitor Setup & Mobile Platform Integration  
**Story Points**: 4  
**Estimated Time**: 2-3 hours  
**Dependencies**: Story 7.1.1 complete (Capacitor installed)

---

## 📋 Overview

**What**: Create React hooks to detect platform (iOS/Android/Web) and enable conditional rendering.

**Why**: Apps need to behave differently on mobile vs web. Platform detection allows us to show/hide features, adjust UI, and optimize for each platform.

**User Value**: Better user experience with platform-appropriate features and UI.

---

## 🎯 Acceptance Criteria

- [x] `usePlatform` hook created and working
- [x] Hook detects iOS, Android, and web correctly
- [x] `index.html` updated with mobile meta tags
- [x] Components can conditionally render based on platform
- [x] Platform detection tested on all platforms
- [x] Documentation created
- [x] Changes committed to git

---

## 📝 Implementation Steps

### Step 1: Create usePlatform Hook

**Create new file**: `src/hooks/usePlatform.ts`

```typescript
import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

export interface PlatformInfo {
  isNative: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isWeb: boolean;
  platform: 'ios' | 'android' | 'web';
}

export const usePlatform = (): PlatformInfo => {
  const [platformInfo] = useState<PlatformInfo>(() => ({
    isNative: Capacitor.isNativePlatform(),
    isIOS: Capacitor.getPlatform() === 'ios',
    isAndroid: Capacitor.getPlatform() === 'android',
    isWeb: Capacitor.getPlatform() === 'web',
    platform: Capacitor.getPlatform() as 'ios' | 'android' | 'web'
  }));

  return platformInfo;
};

// Helper function for one-off checks
export const isPlatform = (platform: 'ios' | 'android' | 'web' | 'native'): boolean => {
  if (platform === 'native') {
    return Capacitor.isNativePlatform();
  }
  return Capacitor.getPlatform() === platform;
};

// Get platform-specific styles
export const getPlatformStyles = () => {
  const platform = Capacitor.getPlatform();
  return {
    isIOS: platform === 'ios',
    isAndroid: platform === 'android',
    isWeb: platform === 'web',
    // Platform-specific spacing
    statusBarHeight: platform === 'ios' ? '44px' : platform === 'android' ? '24px' : '0px',
    // Safe area insets
    safeAreaTop: platform === 'ios' ? 'env(safe-area-inset-top)' : '0px',
    safeAreaBottom: platform === 'ios' ? 'env(safe-area-inset-bottom)' : '0px'
  };
};
```

**Save the file.**

**Acceptance**: ✅ `usePlatform` hook created

---

### Step 2: Create Platform Detection Utility

**Create new file**: `src/utils/platform.ts`

```typescript
import { Capacitor } from '@capacitor/core';

export class Platform {
  static get isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  static get isIOS(): boolean {
    return Capacitor.getPlatform() === 'ios';
  }

  static get isAndroid(): boolean {
    return Capacitor.getPlatform() === 'android';
  }

  static get isWeb(): boolean {
    return Capacitor.getPlatform() === 'web';
  }

  static get name(): string {
    return Capacitor.getPlatform();
  }

  // Check if specific plugin is available
  static isPluginAvailable(pluginName: string): boolean {
    return Capacitor.isPluginAvailable(pluginName);
  }

  // Get device info
  static getDeviceInfo() {
    return {
      platform: this.name,
      isNative: this.isNative,
      userAgent: navigator.userAgent,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio
    };
  }

  // Check if running in mobile browser (not native app)
  static get isMobileBrowser(): boolean {
    return !this.isNative && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }
}
```

**Save the file.**

**Acceptance**: ✅ Platform utility class created

---

### Step 3: Update index.html with Mobile Meta Tags

**File to Edit**: `index.html`

**Add these meta tags inside `<head>`** (after existing meta tags):

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Sync App</title>
    
    <!-- Mobile Web App Capable -->
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Sync App" />
    
    <!-- Theme Color -->
    <meta name="theme-color" content="#6366f1" />
    <meta name="msapplication-TileColor" content="#6366f1" />
    
    <!-- Disable Auto-Detection -->
    <meta name="format-detection" content="telephone=no" />
    <meta name="format-detection" content="date=no" />
    <meta name="format-detection" content="address=no" />
    <meta name="format-detection" content="email=no" />
    
    <!-- iOS Specific -->
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    
    <!-- Android Specific -->
    <meta name="mobile-web-app-capable" content="yes" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**Save the file.**

**Acceptance**: ✅ Mobile meta tags added

---

### Step 4: Create Platform-Aware Component Example

**Create new file**: `src/components/PlatformBadge.tsx`

```typescript
import React from 'react';
import { usePlatform } from '../hooks/usePlatform';

export const PlatformBadge: React.FC = () => {
  const { platform, isNative } = usePlatform();

  // Only show in development
  if (import.meta.env.PROD) return null;

  const badgeColors = {
    ios: 'bg-blue-500',
    android: 'bg-green-500',
    web: 'bg-purple-500'
  };

  return (
    <div className={`fixed bottom-4 right-4 ${badgeColors[platform]} text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg z-50`}>
      {isNative ? '📱' : '🌐'} {platform.toUpperCase()}
    </div>
  );
};
```

**Save the file.**

**Usage in Layout**:
```typescript
import { PlatformBadge } from './components/PlatformBadge';

// In your Layout component:
<PlatformBadge />
```

**Acceptance**: ✅ Platform badge component created

---

### Step 5: Add Conditional Rendering Example

**File to Edit**: `src/components/Layout.tsx`

**Add platform-specific rendering**:

```typescript
import { usePlatform } from '../hooks/usePlatform';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isNative, isIOS, isAndroid, isWeb } = usePlatform();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* iOS Safe Area */}
      {isIOS && (
        <div className="h-[env(safe-area-inset-top)] bg-indigo-600" />
      )}

      {/* Header - different on mobile vs web */}
      <header className={`${
        isNative ? 'px-4 py-3' : 'px-6 py-4'
      } bg-indigo-600 text-white`}>
        <h1 className="text-xl font-bold">
          Sync App {isNative && '📱'}
        </h1>
      </header>

      {/* Main Content */}
      <main className={`${
        isNative ? 'px-4' : 'container mx-auto px-4'
      }`}>
        {children}
      </main>

      {/* Platform-specific features */}
      {isNative && (
        <div className="text-xs text-gray-500 text-center py-2">
          Running on {isIOS ? 'iOS' : isAndroid ? 'Android' : 'mobile'}
        </div>
      )}

      {/* iOS Bottom Safe Area */}
      {isIOS && (
        <div className="h-[env(safe-area-inset-bottom)] bg-white" />
      )}
    </div>
  );
};
```

**Acceptance**: ✅ Conditional rendering working

---

### Step 6: Create Platform-Specific CSS Variables

**Create new file**: `src/styles/platform.css`

```css
/* Platform-specific CSS variables */
:root {
  --safe-area-top: env(safe-area-inset-top, 0px);
  --safe-area-right: env(safe-area-inset-right, 0px);
  --safe-area-bottom: env(safe-area-inset-bottom, 0px);
  --safe-area-left: env(safe-area-inset-left, 0px);
  
  --status-bar-height: 0px;
  --nav-bar-height: 56px;
}

/* iOS specific */
.platform-ios {
  --status-bar-height: 44px;
  --nav-bar-height: 44px;
}

/* Android specific */
.platform-android {
  --status-bar-height: 24px;
  --nav-bar-height: 56px;
}

/* Apply safe areas */
.safe-area-top {
  padding-top: var(--safe-area-top);
}

.safe-area-bottom {
  padding-bottom: var(--safe-area-bottom);
}

.safe-area-left {
  padding-left: var(--safe-area-left);
}

.safe-area-right {
  padding-right: var(--safe-area-right);
}

/* Prevent text selection on mobile */
.platform-ios *,
.platform-android * {
  -webkit-user-select: none;
  user-select: none;
}

/* Allow text selection in inputs */
.platform-ios input,
.platform-android input,
.platform-ios textarea,
.platform-android textarea {
  -webkit-user-select: text;
  user-select: text;
}

/* Disable tap highlight on mobile */
.platform-ios *,
.platform-android * {
  -webkit-tap-highlight-color: transparent;
}

/* Smooth scrolling on iOS */
.platform-ios {
  -webkit-overflow-scrolling: touch;
}
```

**Import in**: `src/main.tsx`

```typescript
import './styles/platform.css';
```

**Acceptance**: ✅ Platform CSS created

---

### Step 7: Add Platform Class to Body

**File to Edit**: `src/main.tsx`

**Add platform detection to body class**:

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './styles/platform.css';
import { Capacitor } from '@capacitor/core';

// Add platform class to body
const platform = Capacitor.getPlatform();
document.body.classList.add(`platform-${platform}`);

if (Capacitor.isNativePlatform()) {
  document.body.classList.add('platform-native');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

**Acceptance**: ✅ Platform class added to body

---

### Step 8: Test Platform Detection on All Platforms

**Test on Web**:
```powershell
npm run dev
# Open http://localhost:5173
# Console: Capacitor.getPlatform() should return 'web'
```

**Test on Android**:
```powershell
npm run mobile:android
# Run app in emulator
# Console: Capacitor.getPlatform() should return 'android'
# Badge should show "ANDROID"
```

**Test on iOS** (Mac):
```bash
npm run mobile:ios
# Run app in simulator
# Console: Capacitor.getPlatform() should return 'ios'
# Badge should show "IOS"
```

**Verify in Browser Console**:
```javascript
// In browser/simulator console
import { Capacitor } from '@capacitor/core';
console.log('Platform:', Capacitor.getPlatform());
console.log('Is Native:', Capacitor.isNativePlatform());
```

**Acceptance**: ✅ Platform detection works on all platforms

---

### Step 9: Create Documentation

**Create new file**: `docs/PLATFORM_DETECTION.md`

```markdown
# Platform Detection Guide 🎯

## Using the usePlatform Hook

```typescript
import { usePlatform } from '../hooks/usePlatform';

function MyComponent() {
  const { isNative, isIOS, isAndroid, isWeb, platform } = usePlatform();
  
  return (
    <div>
      {isNative && <p>Running on native app</p>}
      {isIOS && <p>iOS-specific feature</p>}
      {isAndroid && <p>Android-specific feature</p>}
      {isWeb && <p>Web-only feature</p>}
    </div>
  );
}
```

## Using Platform Utility

```typescript
import { Platform } from '../utils/platform';

if (Platform.isIOS) {
  // iOS-specific code
}

if (Platform.isPluginAvailable('Camera')) {
  // Use camera plugin
}

const deviceInfo = Platform.getDeviceInfo();
console.log(deviceInfo);
```

## Conditional Rendering Patterns

### Hide Feature on Web
```typescript
{isNative && <InstallAppButton />}
```

### Different UI per Platform
```typescript
<button className={isNative ? 'px-4 py-2' : 'px-6 py-3'}>
  {isIOS ? '􀎫' : '⋮'} Menu
</button>
```

### Platform-Specific Styles
```typescript
<div className={`
  ${isIOS && 'safe-area-top'}
  ${isAndroid && 'pt-6'}
  ${isWeb && 'container mx-auto'}
`}>
  Content
</div>
```

## CSS Classes

Body automatically gets platform classes:
- `.platform-ios`
- `.platform-android`
- `.platform-web`
- `.platform-native` (if native)

Use in CSS:
```css
.platform-ios .header {
  padding-top: var(--safe-area-top);
}

.platform-android .button {
  text-transform: uppercase;
}

.platform-web .sidebar {
  display: block;
}

.platform-native .desktop-only {
  display: none;
}
```

## Best Practices

✅ **DO**: Use for feature availability  
✅ **DO**: Adjust spacing/layout  
✅ **DO**: Show/hide native features  

❌ **DON'T**: Use for business logic  
❌ **DON'T**: Duplicate entire components  
❌ **DON'T**: Make assumptions about capabilities  
```

**Save as**: `docs/PLATFORM_DETECTION.md`

**Acceptance**: ✅ Documentation created

---

### Step 10: Commit Platform Detection Changes

**Terminal Commands**:
```powershell
git add .

git commit -m "feat: Add platform detection hooks and utilities - Story 7.1.5

- Created usePlatform hook for React components
- Created Platform utility class for general use
- Updated index.html with mobile meta tags
- Added platform-specific CSS variables
- Created PlatformBadge component for debugging
- Added conditional rendering examples
- Created PLATFORM_DETECTION.md documentation
- Tested on web, iOS simulator, Android emulator

Epic: 7.1 - Capacitor Setup
Story: 7.1.5 - Platform Detection"

git push origin mobile-app-setup
```

**Acceptance**: ✅ All changes committed

---

## ✅ Verification Checklist

- [ ] `src/hooks/usePlatform.ts` created
- [ ] `src/utils/platform.ts` created
- [ ] `src/styles/platform.css` created
- [ ] `src/components/PlatformBadge.tsx` created
- [ ] `index.html` has mobile meta tags
- [ ] `src/main.tsx` adds platform class to body
- [ ] Platform detection works on web (returns 'web')
- [ ] Platform detection works on Android (returns 'android')
- [ ] Platform detection works on iOS (returns 'ios')
- [ ] Conditional rendering works in components
- [ ] CSS platform classes applied
- [ ] Safe area insets work on iOS
- [ ] `docs/PLATFORM_DETECTION.md` created
- [ ] All changes committed to git

**All items checked?** ✅ Story 7.1.5 is COMPLETE

---

## 🚨 Troubleshooting

### Issue: Platform always returns 'web'
**Solution**: Rebuild and sync
```powershell
npm run mobile:sync
# Test in emulator, not browser
```

### Issue: usePlatform hook not updating
**Solution**: Hook uses useState, not useEffect. It's static and doesn't change during runtime.

### Issue: Safe area insets not working
**Solution**: Only works on real iOS devices with notches. Simulator may not show them.

### Issue: TypeScript errors with Capacitor
**Solution**:
```powershell
npm install @capacitor/core --save
# Restart TypeScript server in VS Code
```

---

## 📚 Additional Notes

### Platform Detection is Static
- Platform doesn't change during app lifetime
- Use `useState` not `useEffect` for better performance
- Detect once at component mount

### Safe Areas (iOS)
- Use CSS `env(safe-area-inset-*)` variables
- Only necessary on devices with notches
- Apply to fixed positioned elements

### What's Next?
After completing this story:
1. Story 7.1.6: Supabase Mobile Configuration
2. EPIC 7.1 will be complete!
3. Ready for EPIC 7.2 (Security Layer)

---

## 🔗 Related Documentation

- [Capacitor Platform Detection](https://capacitorjs.com/docs/core-apis/capacitor#platform)
- [CSS Safe Area Insets](https://webkit.org/blog/7929/designing-websites-for-iphone-x/)
- [EPIC 7.1 Overview](../epics/EPIC_7.1_Capacitor_Setup.md)

---

**Story Status**: ⚪ PLANNED  
**Previous Story**: [STORY_7.1.4_Mobile_Build_Scripts.md](./STORY_7.1.4_Mobile_Build_Scripts.md)  
**Next Story**: [STORY_7.1.6_Supabase_Mobile_Config.md](./STORY_7.1.6_Supabase_Mobile_Config.md)  
**Epic Progress**: Story 5/6 complete (67% → 83%)
