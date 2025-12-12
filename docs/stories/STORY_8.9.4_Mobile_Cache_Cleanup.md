# 🗂️ STORY 8.9.4: Mobile Local Cache Cleanup

**Parent Epic:** [EPIC 8.9 - Message Retention Automation](../epics/EPIC_8.9_Message_Retention_Automation.md)
**Priority:** P2 - Medium
**Estimated Effort:** 0.5 Days
**Dependencies:** Story 8.9.1

---

## 🎯 **Goal**
Implement local cache cleanup for iOS and Android apps to prevent uncontrolled storage growth. This includes cleaning old entries from Capacitor Preferences (offline queue) and Capacitor Filesystem (cached media).

---

## 📋 **Acceptance Criteria**

### 1. Preferences Cleanup (Offline Queue)
- [ ] On app launch, scan all `Preferences` keys starting with `offline_`.
- [ ] Delete entries older than 7 days based on stored `timestamp` field.

### 2. Filesystem Cleanup (Cached Media)
- [ ] On app launch, read `message-cache` directory from `Directory.Cache`.
- [ ] Check each file's `mtime` (from `FileInfo`) against a 30-day threshold.
- [ ] **Race Condition Guard**: Before deleting, check if the file is currently being played/accessed by the media player state (Zustand store). If matches, skip deletion.
- [ ] Delete files older than 30 days.

### 3. Storage Management
- [ ] Total local cache remains under 100MB target.
- [ ] Cleanup runs without blocking UI (async, non-blocking).

### 4. Frontend Integration
- [ ] Cleanup function is called in `App.tsx` on app activation/launch.
- [ ] **Storage Usage UI**: Add a "Storage" section in Settings showing:
  - Current cache size (MB)
  - "Clear Cache" button
- [ ] Clearing cache shows confirmation dialog and refreshes size after completion.

### 5. Web Compatibility (Optional)
- [ ] If React Query persister is used, add logic to clear stale cache entries older than 30 days from IndexedDB/localStorage.

---

## 🧩 **Implementation Details**

### Service: `src/services/MobileCacheCleanupService.ts`
```typescript
import { Preferences } from '@capacitor/preferences'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Capacitor } from '@capacitor/core'

class MobileCacheCleanupService {
  async cleanupOnLaunch(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return // Web doesn't need this

    await this.cleanPreferences()
    await this.cleanFilesystem()
  }

  private async cleanPreferences(): Promise<void> {
    const { keys } = await Preferences.keys()
    const now = Date.now()
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000

    for (const key of keys) {
      if (key.startsWith('offline_')) {
        const { value } = await Preferences.get({ key })
        if (value) {
          const data = JSON.parse(value)
          if (data.timestamp && (now - data.timestamp) > SEVEN_DAYS) {
            await Preferences.remove({ key })
          }
        }
      }
    }
  }

  private async cleanFilesystem(): Promise<void> {
    try {
      const { files } = await Filesystem.readdir({
        path: 'message-cache',
        directory: Directory.Cache
      })
      
      const now = Date.now()
      const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000
      
      for (const file of files) {
        // FileInfo includes mtime (modification time) in milliseconds
        if (file.mtime && (now - file.mtime) > THIRTY_DAYS) {
          await Filesystem.deleteFile({
            path: `message-cache/${file.name}`,
            directory: Directory.Cache
          })
          // Enhancement: Check global media state before deleting
          // if (useMediaStore.getState().currentFile === file.name) continue;
          console.log(`🧹 Deleted old cache file: ${file.name}`)
        }
      }
    } catch (e) {
      // Directory may not exist, ignore
      console.log('Cache directory not found, skipping filesystem cleanup')
    }
  }
}

export const mobileCacheCleanupService = new MobileCacheCleanupService()
```

### App.tsx Integration
```typescript
useEffect(() => {
  mobileCacheCleanupService.cleanupOnLaunch()
}, [])
```

---

## 🤖 **MCP Integration Strategy**

### Chrome DevTools MCP (via USB Remote Debugging)
- **Verify Cleanup**: Inspect `localStorage`/`Preferences` state before and after cleanup on a connected Android device.

---

## 🧪 **Testing Plan**
1. Manually add old entries to `Preferences` on a test device.
2. Launch the app.
3. Verify the old entries are deleted.
4. Check console logs for cleanup confirmation.

---

## ✅ **Definition of Done**
- [ ] `MobileCacheCleanupService` implemented and exported.
- [ ] Cleanup runs on app launch for native platforms.
- [ ] Old preferences and files are deleted.
