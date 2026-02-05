# 📖 STORY 8.11.4: Background Lifecycle & State Sync Optimization

**Status:** 📋 Planned  
**Epic:** [EPIC 8.11: Messaging Performance & Scalability](../epics/EPIC_8.11_Messaging_Performance_Scalability.md)  
**Priority:** 🟡 Medium (Audit Finding #3)

---

## 🙋‍♂️ **User Story**

**As a** SynC Mobile User who switches between apps frequently,  
**I want** the messaging app to quickly sync my messages when I return,  
**So that** I don't see a blank screen or "loading..." for several seconds.

---

## 🎯 **Acceptance Criteria**

### **1. Extended Background Timeout (or Adaptive)**
- **GIVEN** the app goes to the background on a mobile device
- **WHEN** the `appStateChange` listener is triggered
- **THEN** the WebSocket disconnect timer MUST be configurable (e.g., 5 minutes on WiFi, 1 minute on cellular).
- **OR** the disconnect should be adaptive based on battery saver mode.

### **2. Instant "Catch-Up" Fetch on Resume**
- **GIVEN** the app was in the background for longer than the timeout and the socket was disconnected
- **WHEN** the app comes to the foreground
- **THEN** the system MUST immediately issue a `fetchLatestMessages(since: lastSeenTimestamp)` call **before** waiting for the WebSocket to fully re-establish.
- **AND** messages from this catch-up MUST merge into the store without duplicates.

### **3. Resume Performance Target**
- **GIVEN** the user was away for 5 minutes and returns
- **WHEN** the app resumes
- **THEN** the conversation list and active conversation MUST display updated data within **1 second**.

### **4. Network Type Awareness**
- **GIVEN** the device switches from WiFi to Cellular while the app is open
- **WHEN** the `networkStatusChange` event fires
- **THEN** the system MUST gracefully re-establish the WebSocket without manual user intervention.
- **AND** no "connection lost" errors should be shown for transient network switches.

---

## 🛠️ **Technical Implementation Plan**

### **Service Layer (`src/services/realtimeService.ts`)**
- Change `backgroundDisconnectTimer` timeout from 60,000ms to an adaptive value:
  ```typescript
  const timeout = networkStatus.connectionType === 'wifi' ? 5 * 60 * 1000 : 60 * 1000;
  ```
- Add a `lastSyncTimestamp` variable that is updated whenever a message is received.
- In the `appStateChange` handler (foreground), call a new `catchUpSync()` method.

### **New Method: `catchUpSync()`**
```typescript
async catchUpSync(): Promise<void> {
  const missedMessages = await messagingService.fetchMessagesSince(this.lastSyncTimestamp);
  messagingStore.getState().upsertMessages(missedMessages);
  this.lastSyncTimestamp = Date.now();
}
```

### **Store Layer (`src/store/messagingStore.ts`)**
- Ensure `upsertMessages(messages[])` is robust and can handle bulk inserts without UI jank (e.g., use `immer` or batch updates).

---

## 🛑 **Risks & Mitigation**
- **Risk**: `fetchMessagesSince` could return a very large payload if the user was away for hours.
- **Mitigation**: Add a `LIMIT 100` to the catch-up query and show a "Load More" prompt if there are more messages.
