# Offline Indicator UI Component 📶

## Overview

A prominent banner component that appears when the device loses network connection, providing clear visual feedback to users about offline status with smooth animations.

---

## Component: OfflineIndicator

```typescript
import { OfflineIndicator } from './components/ui/OfflineIndicator'

<OfflineIndicator 
  syncQueueCount={5}        // Optional: number of pending changes
  showConnectionType={true}  // Optional: show connection type detail
/>
```

---

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `syncQueueCount` | `number` | `0` | Number of pending changes waiting to sync |
| `showConnectionType` | `boolean` | `false` | Show specific connection type (Wi-Fi, cellular, etc.) |

---

## Behavior

### When Going Offline
- Banner slides down from top with smooth animation
- Yellow background with warning message
- Shows: "📶 You're offline • Changes will sync when reconnected"
- If sync queue has items: "📶 You're offline • X changes waiting to sync"
- Stays visible until connection restored

### When Coming Online
- Banner changes to green background
- Shows: "✅ Back online! Syncing your changes..."
- Automatically fades out after 3 seconds

---

## Styling

### Colors
- **Offline**: Yellow (#FFF3CD) background, dark yellow (#856404) text
- **Online**: Green (#D4EDDA) background, dark green (#155724) text
- **Dark Mode**: Automatically adjusts for better visibility

### Animations
- **Slide Down**: 0.3s ease-out when appearing
- **Fade Out**: 0.5s ease-in when dismissing (online mode)
- **Respects `prefers-reduced-motion`** for accessibility

### Position
- Fixed at top of viewport
- z-index: 9999 (always on top)
- Responsive to all screen sizes
- No layout shift (fixed positioning)

---

## Usage Examples

### Basic Usage

```typescript
import { OfflineIndicator } from './components/ui/OfflineIndicator'

function App() {
  return (
    <div>
      <OfflineIndicator />
      {/* Your app content */}
    </div>
  )
}
```

### With Sync Queue Count

```typescript
import { OfflineIndicator } from './components/ui/OfflineIndicator'
import { useOfflineBusinessStore } from './store/offlineBusinessStore'

function App() {
  const { pendingChanges } = useOfflineBusinessStore()
  
  return (
    <div>
      <OfflineIndicator 
        syncQueueCount={pendingChanges?.length || 0}
        showConnectionType={true}
      />
      {/* Your app content */}
    </div>
  )
}
```

### In App Layout

```typescript
import { OfflineIndicator } from '../ui/OfflineIndicator'

export const AppLayout: React.FC<{ children }> = ({ children }) => {
  return (
    <div className="app-layout">
      <OfflineIndicator showConnectionType={true} />
      
      <header>{/* Header content */}</header>
      <main>{children}</main>
      <footer>{/* Footer content */}</footer>
    </div>
  )
}
```

---

## Accessibility

- ✅ `role="status"` for screen reader announcements
- ✅ `aria-live="polite"` for non-intrusive updates
- ✅ High contrast colors (WCAG AA compliant)
- ✅ Respects `prefers-reduced-motion` preference
- ✅ No keyboard interaction required
- ✅ Screen readers announce status changes

---

## Platform Support

- ✅ **Web**: Full support with CSS animations
- ✅ **Android**: Native-like behavior
- ✅ **iOS**: Smooth animations

---

## Responsive Design

### Desktop (>640px)
- Full message with connection type
- 14px font size
- 12px padding

### Mobile (≤640px)
- Slightly smaller font (13px)
- Reduced padding (10px)
- Connection type at 11px

---

## Testing

### Manual Test Checklist

1. ✅ Start app online → banner hidden
2. ✅ Go offline → banner slides down (yellow)
3. ✅ Message shows correctly
4. ✅ Go online → banner turns green
5. ✅ Shows "Back online" message
6. ✅ Banner fades out after 3 seconds
7. ✅ Test on mobile devices
8. ✅ Test with screen rotation

### Browser DevTools Testing

```
1. Open http://localhost:5173
2. Open DevTools → Network tab
3. Check "Offline" checkbox
4. Verify banner appears
5. Uncheck "Offline"
6. Verify banner shows online message and fades
```

---

## Troubleshooting

### Banner not showing
- Check useNetworkStatus hook is working
- Verify OfflineIndicator is in app layout
- Check z-index conflicts with other elements
- Look for console errors

### Banner stuck visible
- Check network status hook for errors
- Verify isOnline state is updating
- Check useEffect cleanup is running
- Try refreshing the page

### Animation issues
- Verify CSS file is imported
- Check browser supports CSS animations
- Test with `prefers-reduced-motion` disabled
- Clear browser cache

### Wrong colors in dark mode
- Check system dark mode setting
- Verify `prefers-color-scheme` media query
- Test with browser DevTools dark mode toggle

---

## Performance

- **Lightweight**: ~2KB gzipped (component + CSS)
- **Zero re-renders**: Only updates on network changes
- **GPU-accelerated**: CSS transform animations
- **No polling**: Event-driven only
- **No layout shifts**: Fixed positioning

---

## Customization

### Custom Messages

Extend the component for custom messaging:

```typescript
const getMessage = () => {
  if (isOnline) return 'Connected to server'
  if (syncQueueCount > 10) return 'Many changes pending'
  return 'Working offline'
}
```

### Custom Styles

Override CSS classes in your stylesheet:

```css
.offline-indicator {
  /* Your custom styles */
  top: 60px; /* Below header */
  border-radius: 8px; /* Rounded corners */
}
```

---

## Related Components

- **NetworkStatusBadge**: Small badge showing connection status
- **CacheStatus**: Shows when viewing cached data
- **useNetworkStatus**: Hook providing network state

---

## Resources

- [CSS Animations](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Animations)
- [ARIA Live Regions](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/ARIA_Live_Regions)
- [Story 7.3.4: Network Status Hook](./NETWORK_STATUS.md)
- [Story 7.3.3: Offline Data Store](./OFFLINE_DATA_STORE.md)
