# 🗂️ STORY 8.9.3: Admin Retention Dashboard

**Parent Epic:** [EPIC 8.9 - Message Retention Automation](../epics/EPIC_8.9_Message_Retention_Automation.md)
**Priority:** P1 - High
**Estimated Effort:** 0.5 Days
**Dependencies:** Story 8.9.2 (Cron Schedule & Logging)
**Status:** ✅ Complete

---

## 🎯 **Goal**
Create a frontend Admin Dashboard component (`RetentionMonitor`) that displays real-time message statistics, cleanup history, and provides a manual cleanup trigger button.

---

## 📋 **Acceptance Criteria**

### 1. Access Control
- [x] **Admin Role Guard**: Component only renders if current user has `admin` role.
- [x] Non-admin users are redirected or shown "Access Denied" message.

### 2. Dashboard UI
- [x] `src/components/admin/RetentionMonitor.tsx` component created.
- [x] Displays **Total Messages** count.
  - **Performance Optimization**: Use `pg_class` estimate for total count to avoid slow `COUNT(*)` on large tables.
- [x] Displays **Messages Older Than 90 Days** count (pending cleanup).
- [x] Displays "Run Cleanup Now" button.

### 3. Loading & Error States
- [x] **Loading**: Show skeleton loaders while fetching stats and logs.
- [x] **Error**: Show toast notification if data fetching or cleanup invocation fails.

### 4. Cleanup History
- [x] Fetches and displays last 10 entries from `cleanup_logs` where `operation = 'message_cleanup'`.
- [x] Shows `records_affected` and execution time from log.
- [x] Shows timestamp of each cleanup run.

### 5. Manual Trigger
- [x] "Run Cleanup Now" button invokes the `cleanup-old-messages` edge function.
- [x] Shows confirmation dialog before running.
- [x] Refreshes stats and logs after successful cleanup.

---

## 🧩 **Implementation Details**

### Frontend Integration
- Import `RetentionMonitor` into the Admin Settings page or a dedicated `/admin/retention` route.
- Use React Query for data fetching and optimistic updates after manual trigger.

### Example Component Structure
```tsx
// src/components/admin/RetentionMonitor.tsx
export function RetentionMonitor() {
  // Fetch stats, logs
  // Manual cleanup handler
  return (
    <div>
      <StatsCards total={...} oldMessages={...} />
      <CleanupLogsTable logs={...} />
      <Button onClick={handleManualCleanup}>Run Cleanup Now</Button>
    </div>
  )
}
```

---

## 🤖 **MCP Integration Strategy**

### Browser Subagent
- **Visual Verification**: Use browser subagent to navigate to the admin dashboard and verify the component renders correctly.
- **Interaction Test**: Click "Run Cleanup Now" and verify the confirmation dialog and subsequent state update.

---

## 🧪 **Testing Plan**
1. Navigate to `/admin/retention` (or settings page).
2. Verify stats display correctly.
3. Click "Run Cleanup Now" and confirm execution.
4. Verify new log entry appears in the history.

---

## ✅ **Definition of Done**
- [ ] `RetentionMonitor` component exists and is accessible in the app.
- [ ] Stats and history display correctly.
- [ ] Manual cleanup works and updates the UI.
