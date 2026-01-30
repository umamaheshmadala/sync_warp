# Story 6.3.5: Admin Business Management - Audit Logging & Notifications

**Epic:** [EPIC 6 - Admin Panel](../epics/EPIC_6_Admin_Panel.md)  
**Priority:** 🟡 P1 - HIGH  
**Effort:** 1.5 days  
**Dependencies:** Story 6.3.1, 6.3.3, 6.3.4  
**Status:** ⚪ PLANNED

---

## Overview

Implement comprehensive audit logging UI for viewing admin actions, admin activity reports, and notification system for business owners. This provides accountability, transparency, and communication between admins and business owners.

---

## User Stories

### US-6.3.5.1: Global Audit Log View
**As an** admin, **I want to** view all admin actions across all businesses **So that** I can monitor team activity.

**Acceptance Criteria:**
- [ ] New admin page: `/admin/audit-log`
- [ ] Table columns: Date, Admin, Action, Business, Reason
- [ ] Filters: Date range, Admin (dropdown), Action type (dropdown)
- [ ] Pagination with 50 per page default
- [ ] Export to CSV option
- [ ] Click business name → navigate to business detail

---

### US-6.3.5.2: Business-Specific Audit History
**As an** admin, **I want to** see all actions for a specific business **So that** I understand its history.

**Acceptance Criteria:**
- [ ] Audit History tab in Business Detail Modal (Story 6.3.3)
- [ ] Shows: Date, Admin name, Action, Reason
- [ ] For edits: Show "View Changes" link → expand changes_json
- [ ] Sorted newest first
- [ ] Empty state if no actions

---

### US-6.3.5.3: Changes Diff View
**As an** admin, **I want to** see what fields were changed in an edit **So that** I understand what was modified.

**Acceptance Criteria:**
- [ ] "View Changes" expands to show before/after
- [ ] Format: `Field: "old value" → "new value"`
- [ ] Only changed fields shown
- [ ] Collapse/expand toggle

---

### US-6.3.5.4: Admin Activity Report
**As a** super admin, **I want to** see aggregate stats on admin actions **So that** I can monitor admin productivity.

**Acceptance Criteria:**
- [ ] Dashboard widget showing last 7 days activity
- [ ] Metrics: Total actions, Approvals, Rejections, Edits, Deletions
- [ ] Breakdown by admin (who did what)
- [ ] Chart: Actions per day (line graph)

---

### US-6.3.5.5: Push Notification Integration
**As a** platform, **I want to** send push notifications on key actions **So that** owners are immediately informed.

**Acceptance Criteria:**
- [ ] Push notifications for: approval, rejection, deletion, restoration
- [ ] Only if user has push notifications enabled
- [ ] Edge function handles push delivery
- [ ] Fallback to in-app only if push fails

---

### US-6.3.5.6: In-App Notification Bell Updates
**As a** business owner, **I want to** see admin actions in my notification bell **So that** I'm aware of changes.

**Acceptance Criteria:**
- [ ] Notification types registered: `business_approved`, `business_rejected`, `business_edited`, `business_deleted`, `business_restored`
- [ ] Badge count updates in real-time
- [ ] Clicking notification navigates to relevant page
- [ ] Mark as read functionality works

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

- [ ] Global audit log page functional
- [ ] Filters work correctly
- [ ] Changes diff viewer works
- [ ] Push + in-app notifications work
- [ ] CSV export works
- [ ] All browser tests pass

---

**Story Owner:** Frontend Engineering
