# PWA Setup and Offline Mode 📱

## Overview

The app uses vite-plugin-pwa for automatic service worker generation and offline support.

---

## Features

- **Automatic Service Worker**: Generated on every build
- **Asset Caching**: All static files cached
- **API Caching**: Supabase responses cached (NetworkFirst)
- **Image Caching**: Images cached (CacheFirst)
- **Offline Support**: App works without internet

---

## Configuration

Located in `vite.config.ts`:

```typescript
VitePWA({
  registerType: 'autoUpdate',
  manifest: {
    name: 'SyncWarp - Connect, Collaborate, Create',
    short_name: 'SyncWarp',
    description: 'Discover local businesses, connect with your community',
    theme_color: '#ffffff',
    background_color: '#ffffff',
    display: 'standalone',
    orientation: 'portrait'
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
    runtimeCaching: [
      // Supabase API caching
      // Image caching
    ]
  }
})
```

---

## Caching Strategies

### NetworkFirst (Supabase API)
- Tries network first
- Falls back to cache if offline
- Updates cache with network response
- Cache expires after 24 hours

### CacheFirst (Images)
- Serves from cache if available
- Only fetches if not cached
- Cache expires after 30 days

---

## Testing Offline Mode

### Development
Service worker disabled in dev for easier debugging.

### Production
1. Build: `npm run build`
2. Preview: `npm run preview`
3. Open DevTools → Application → Service Workers
4. Enable offline mode and test

---

## Updating Service Worker

Service worker auto-updates when new version is deployed.
Users will get the update on next app launch.

---

## Icons

Required icons in `public/`:
- `pwa-192x192.png` - Android
- `pwa-512x512.png` - Android, splash
- `apple-touch-icon.png` - iOS
- `favicon.ico` - Web

All icons are based on the Sync logo from `Logo/Sync Logo Transparent.png`.

---

## Build Output

After running `npm run build`, the following PWA files are generated in `dist/`:
- `sw.js` - Service worker
- `workbox-*.js` - Workbox runtime
- `registerSW.js` - Service worker registration
- `manifest.webmanifest` - PWA manifest

---

## Troubleshooting

### Service Worker not registering
- Check production build: `npm run build`
- Service worker only works in production
- Check console for errors

### Offline mode not working
- Verify cache in DevTools → Application → Cache Storage
- Check Network tab shows cached responses
- Clear cache and retry: DevTools → Application → Clear Storage

### Updates not appearing
- Service worker updates on page refresh
- Clear cache if needed
- Check console for SW update logs

### Build warnings about chunk sizes
- Large chunks are expected due to bundled dependencies
- Consider code splitting if bundle size becomes problematic
- Dynamic imports already configured for optimization

---

## Related

- **Story 7.3.2**: Zustand Persistence
- **Story 7.3.3**: Offline Data Store
- **Story 7.3.4**: Network Status Hook
- **Story 7.3.5**: Offline Indicator UI
- **Story 7.3.6**: Service Worker Testing

---

## Resources

- [vite-plugin-pwa Documentation](https://vite-pwa-org.netlify.app/)
- [Workbox Documentation](https://developer.chrome.com/docs/workbox/)
- [PWA Best Practices](https://web.dev/progressive-web-apps/)
- [Service Worker Lifecycle](https://web.dev/service-worker-lifecycle/)
