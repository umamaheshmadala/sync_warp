# 📝 STORY 10.2.2: Background Data Sync (Silent Push)

**Story Owner:** Frontend / Mobile Engineering
**Epic:** [Epic 10.2: Local-First Architecture](../epics/EPIC_10.2_Local_First_Architecture.md)
**Status:** 📝 **PLANNING**
**Priority:** Medium (After 10.2.1)

---

## 🎯 **Goal**

Implement "Invisible Syncing" where the app wakes up in the background to fetch new data (messages/notifications) before the user even opens the app.

**Effect:** When the user taps the app icon, the data is *already there*. No loading spinner.

---

## 📋 **Implementation Tasks**

### 1. **Backend Configuration (Triggers)**
- [ ] Update Supabase Edge Functions / Triggers to send **"data-only"** push notifications (content-available: 1).
- [ ] Ensure payload contains minimal info needed to decide *what* to fetch (e.g., `type: 'NEW_MESSAGE'`, `conversationId: '...'`).

### 2. **Mobile Listener (Capacitor)**
- [ ] Implement `PushNotifications.addListener('pushNotificationReceived')`.
- [ ] **Crucial:** Ensure this listener runs even if the app is in the background (using `@capacitor/background-runner` if needed, or standard iOS background fetch handling).
- [ ] *Note:* Standard Capacitor Push plugin might only wake the app briefly. We need to secure enough time to fetch.

### 3. **Background Fetch Logic**
- [ ] When a silent push is received:
    1.  Don't show a local notification immediately (optional).
    2.  Trigger `queryClient.prefetchQuery(['messages', conversationId])`.
    3.  Cache the result to IndexedDB.
    4.  (Optional) Show a local notification saying "You have a new message" *after* data is secured.

### 4. **Periodic Background Fetch (Optional extension)**
- [ ] Use `@capacitor/background-fetch` (if available/needed) to periodically poll for updates every 15-60min, regardless of push.

---

## 🧪 **Testing Strategy**

*   **Simulate Background:** Minimize app (don't force quit). Send curl request to backend to trigger push.
*   **Verify Log:** Check adb/xcode logs for "Received push in background" -> "Fetching data...".
*   **Verify UX:** Turn off network. Open app. Is the new message there? (It should be, if background fetch succeeded before network cut).

---

## 🧠 **MCP Commands**

```bash
# Research background handling
warp mcp run context7 "how to handle data-only push notifications in Capacitor while app is in background"
```
