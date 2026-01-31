# Story 6.3.5: Admin Business Management - Audit Logging & Notifications

**Epic:** [EPIC 6 - Admin Panel](../epics/EPIC_6_Admin_Panel.md)  
**Priority:** 🟡 P1 - HIGH  
**Effort:** 1.5 days  
**Dependencies:** Story 6.3.1, 6.3.3, 6.3.4  
**Status:** 🟢 COMPLETED

---

## Overview

Implement comprehensive audit logging UI for viewing admin actions, admin activity reports, and notification system for business owners. This provides accountability, transparency, and communication between admins and business owners.

Make sure to utilize the existing code to your advantage. Few of the features that are in the stories of EPIC 6.3 are fully or partially implemented. Make sure you utilize those codes, modules, or functionalities to your advantage. 
---

## User Stories

### US-6.3.5.1: Global Audit Log View
**As an** admin, **I want to** view all admin actions across all businesses **So that** I can monitor team activity.

**Acceptance Criteria:**
- [x] New admin page: `/admin/audit-log`
- [x] Table columns: Date, Admin, Action, Business, Reason
- [x] Filters: Date range, Admin (dropdown), Action type (dropdown)
- [x] Pagination with 50 per page default
- [x] Export to CSV option
- [x] Click business name → navigate to business detail

---

### US-6.3.5.2: Business-Specific Audit History
**As an** admin, **I want to** see all actions for a specific business **So that** I understand its history.

**Acceptance Criteria:**
- [x] Audit History tab in Business Detail Modal (Story 6.3.3)
- [x] Shows: Date, Admin name, Action, Reason
- [x] For edits: Show "View Changes" link → expand changes_json
- [x] Sorted newest first
- [x] Empty state if no actions

---

### US-6.3.5.3: Changes Diff View
**As an** admin, **I want to** see what fields were changed in an edit **So that** I understand what was modified.

**Acceptance Criteria:**
- [x] "View Changes" expands to show before/after
- [x] Format: `Field: "old value" → "new value"`
- [x] Only changed fields shown
- [x] Collapse/expand toggle

---

### US-6.3.5.4: Admin Activity Report
**As a** super admin, **I want to** see aggregate stats on admin actions **So that** I can monitor admin productivity.

**Acceptance Criteria:**
- [x] Dashboard widget showing last 7 days activity
- [x] Metrics: Total actions, Approvals, Rejections, Edits, Deletions
- [x] Breakdown by admin (who did what)
- [x] Chart: Actions per day (line graph)

---

### US-6.3.5.5: Push Notification Integration
**As a** platform, **I want to** send push notifications on key actions **So that** owners are immediately informed.

**Acceptance Criteria:**
- [x] Push notifications for: approval, rejection, deletion, restoration
- [x] Only if user has push notifications enabled
- [x] Edge function handles push delivery
- [x] Fallback to in-app only if push fails

---

### US-6.3.5.6: In-App Notification Bell Updates
**As a** business owner, **I want to** see admin actions in my notification bell **So that** I'm aware of changes.

**Acceptance Criteria:**
- [x] Notification types registered: `business_approved`, `business_rejected`, `business_edited`, `business_deleted`, `business_restored`
- [x] Badge count updates in real-time
- [x] Clicking notification navigates to relevant page
- [x] Mark as read functionality works

---

## Technical Requirements

### Audit Log Query

```typescript
// src/services/adminAuditService.ts
export async function getGlobalAuditLog(params: {
  page: number;
  pageSize: number;
  dateFrom?: string;
  dateTo?: string;
  adminId?: string;
  action?: string;
}) {
  let query = supabase
    .from('admin_business_actions')
    .select(`
      id, action, reason, changes_json, created_at,
      admin:profiles!admin_id (full_name),
      business:businesses!business_id (business_name)
    `, { count: 'exact' })
    .order('created_at', { ascending: false });

  if (params.dateFrom) query = query.gte('created_at', params.dateFrom);
  if (params.dateTo) query = query.lte('created_at', params.dateTo);
  if (params.adminId) query = query.eq('admin_id', params.adminId);
  if (params.action) query = query.eq('action', params.action);

  const from = (params.page - 1) * params.pageSize;
  query = query.range(from, from + params.pageSize - 1);

  return query;
}
```

### Notification Types

```typescript
// src/types/notifications.ts
export type BusinessNotificationType = 
  | 'business_approved' 
  | 'business_rejected' 
  | 'business_edited' 
  | 'business_deleted' 
  | 'business_restored';
```

### Components to Create

- `AdminAuditLogPage.tsx` - Global audit log view
- `AuditLogTable.tsx` - Audit log table
- `AuditLogFilters.tsx` - Filter controls
- `ChangesViewer.tsx` - Diff viewer for edits
- `AdminActivityWidget.tsx` - Dashboard stats widget

---

## Testing Plan

**Test Credentials:** testuser1@gmail.com / Testuser@1

1. Navigate to `/admin/audit-log` → verify all recent actions shown
2. Filter by action type → verify correct filtering
3. View changes for an edit action → verify diff display
4. Take approval action → verify notification received by owner
5. Export to CSV → verify file downloads correctly

---

## Definition of Done

- [x] Global audit log page functional
- [x] Filters work correctly
- [x] Changes diff viewer works
- [x] Push + in-app notifications work
- [x] CSV export works
- [x] All browser tests pass

---

**Story Owner:** Frontend Engineering
