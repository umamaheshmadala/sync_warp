# Story 6.3.9: Business Activity Logging

**Epic:** [EPIC 6 - Admin Panel](../epics/EPIC_6_Admin_Panel.md)  
**Priority:** 🟡 P1 - HIGH  
**Effort:** 3-4 days  
**Dependencies:** Story 6.3.6, Story 6.3.7, Story 6.3.8  
**Status:** 🟢 COMPLETE

---

## Overview

Implement a comprehensive business activity logging system that provides:
1. **Admin View**: Enhanced "Business Edits" page with pending edits queue AND detailed activity logs
2. **Owner View**: New "Logs" tab on business storefront showing complete, permanent history of all business activities

This creates a full audit trail for compliance, debugging, and transparency.

---

## User Stories

### US-6.3.9.1: Admin Business Edits Page
**As an** admin  
**I want to** access a dedicated "Business Edits" page from the left navigation  
**So that** I can review pending edits and view comprehensive editing activity logs

**Acceptance Criteria:**
- [ ] New navigation item: "Business Edits" in admin left nav (below "Businesses")
- [ ] Page has two sections:
  - **Pending Edits Queue** (top): Table of businesses with pending changes awaiting review
  - **Activity Logs** (bottom): Filterable, searchable detailed log of all editing activities
- [ ] Pending Edits section shows same data as PendingEditsTab (reuse component)
- [ ] Activity Logs section includes:
  - Business name (linkable)
  - Action type (submitted, approved, rejected, auto-approved, etc.)
  - Actor (owner name or admin name)
  - Fields affected
  - Timestamp
  - Full details expandable

---

### US-6.3.9.2: Detailed Activity Log Entries
**As an** admin  
**I want to** see extremely detailed logs of every editing activity  
**So that** I can understand exactly what happened and when

**Acceptance Criteria:**
- [ ] Each log entry captures:
  - `id`: Unique identifier
  - `business_id`: Reference to business
  - `action_type`: Enum of action types (see below)
  - `actor_id`: User who performed the action
  - `actor_type`: 'owner' | 'admin' | 'system'
  - `field_changes`: JSONB containing old/new values for each field
  - `metadata`: Additional context (rejection reason, approval notes, etc.)
  - `ip_address`: For audit compliance (optional)
  - `created_at`: Timestamp
- [ ] Action types include:
  - `business_registered`: Initial business registration submitted
  - `business_approved`: Business registration approved
  - `business_rejected`: Business registration rejected
  - `edit_submitted`: Owner submitted changes for review
  - `edit_approved`: Admin approved all changes
  - `edit_rejected`: Admin rejected all changes
  - `edit_partial`: Admin partially approved changes
  - `edit_auto_approved`: Instant update fields auto-applied
  - `product_created`: New product added
  - `product_updated`: Product details changed
  - `product_deleted`: Product removed
  - `offer_created`: New offer created
  - `offer_updated`: Offer modified
  - `offer_activated`: Offer status changed to active
  - `offer_paused`: Offer paused
  - `offer_terminated`: Offer terminated
  - `hours_updated`: Business hours changed
  - `media_uploaded`: Images/videos uploaded
  - `media_deleted`: Media removed

---

### US-6.3.9.3: Activity Log Filtering & Search
**As an** admin  
**I want to** filter and search activity logs  
**So that** I can quickly find relevant entries

**Acceptance Criteria:**
- [ ] Filter by:
  - Business name (search)
  - Action type (multi-select dropdown)
  - Actor type (owner/admin/system)
  - Date range (start/end date pickers)
- [ ] Sort by timestamp (newest first by default, toggleable)
- [ ] Pagination: 20 entries per page
- [ ] Export to CSV button (optional, P2)

---

### US-6.3.9.4: Owner Activity Logs Tab
**As a** business owner  
**I want to** see a "Logs" tab on my storefront  
**So that** I can view a complete, permanent history of all my business activities

**Acceptance Criteria:**
- [ ] New tab: "Logs" positioned to the right of "Enhanced Profile" tab
- [ ] Tab visible only to business owner (not public)
- [ ] Displays chronological timeline of all activities:
  - Business registration submitted/approved/rejected
  - All profile changes (submitted, approved, rejected, auto-approved)
  - Offer lifecycle (created, activated, paused, terminated)
  - Product changes (created, updated, deleted)
  - Operating hours updates
  - Media uploads
- [ ] Each entry shows:
  - Icon representing action type
  - Action description
  - Fields affected (expandable for changes)
  - Timestamp
  - Performed by (owner action or admin action with name)
- [ ] Timeline UI with vertical line connecting events (similar to existing `BusinessAuditHistoryTab`)
- [ ] Logs are permanent and immutable (never deleted)

---

### US-6.3.9.5: Owner Sees Admin Actions Transparently
**As a** business owner  
**I want to** see when admins approve, reject, or modify my changes  
**So that** I have full transparency into my business status

**Acceptance Criteria:**
- [ ] Admin approvals show: "Changes approved by Admin"
- [ ] Admin rejections show: "Changes rejected by Admin" + reason (if provided)
- [ ] Partial approvals show: "Some changes approved, others rejected by Admin"
- [ ] All admin actions are timestamped

---

### US-6.3.9.6: Logging Service Integration
**As the** system  
**I want to** automatically log all relevant business activities  
**So that** the activity history is captured without manual intervention

**Acceptance Criteria:**
- [ ] New service: `businessActivityLogService.ts`
- [ ] Logging automatically triggered on:
  - `businessEditService.submitPendingEdits()` → `edit_submitted`
  - `businessEditService.applyInstantUpdates()` → `edit_auto_approved`
  - `adminPendingEditsService.approveAllChanges()` → `edit_approved`
  - `adminPendingEditsService.rejectAllChanges()` → `edit_rejected`
  - `adminPendingEditsService.savePartialChanges()` → `edit_partial`
  - Product CRUD operations → `product_created/updated/deleted`
  - Offer CRUD operations → `offer_*` events
  - Business approval/rejection → `business_approved/rejected`
- [ ] Captures full field-level diff for profile changes

---

## Database Schema

### New Table: `business_activity_log`

```sql
CREATE TABLE public.business_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,
    actor_id UUID REFERENCES profiles(id),
    actor_type VARCHAR(20) NOT NULL, -- 'owner', 'admin', 'system'
    field_changes JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX idx_business_activity_log_business_id ON business_activity_log(business_id);
CREATE INDEX idx_business_activity_log_action_type ON business_activity_log(action_type);
CREATE INDEX idx_business_activity_log_created_at ON business_activity_log(created_at DESC);
CREATE INDEX idx_business_activity_log_actor_id ON business_activity_log(actor_id);

-- RLS policies
ALTER TABLE business_activity_log ENABLE ROW LEVEL SECURITY;

-- Admins can read all
CREATE POLICY "Admins can read all logs"
ON business_activity_log FOR SELECT
TO authenticated
USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Owners can read their own business logs
CREATE POLICY "Owners can read own business logs"
ON business_activity_log FOR SELECT
TO authenticated
USING (
    business_id IN (
        SELECT id FROM businesses WHERE user_id = auth.uid()
    )
);

-- System can insert (via service role)
CREATE POLICY "System can insert logs"
ON business_activity_log FOR INSERT
TO authenticated
WITH CHECK (true);
```

---

## Technical Implementation

### Files to Create

| File | Purpose |
|------|---------|
| `src/services/businessActivityLogService.ts` | Core logging service |
| `src/pages/admin/AdminBusinessEditsPage.tsx` | New admin page |
| `src/components/admin/business-edits/ActivityLogTable.tsx` | Admin log table |
| `src/components/admin/business-edits/ActivityLogFilters.tsx` | Filter controls |
| `src/components/business/BusinessActivityLogsTab.tsx` | Owner logs tab |

### Files to Modify

| File | Change |
|------|--------|
| `src/services/businessEditService.ts` | Add logging calls |
| `src/services/adminPendingEditsService.ts` | Add logging calls |
| `src/components/business/StorefrontTabs.tsx` | Add "Logs" tab |
| `src/pages/admin/components/AdminSidebar.tsx` | Add "Business Edits" nav item |
| Product/Offer services | Add logging integration |

---

## UI Mockup References

### Admin Business Edits Page Layout
```
┌─────────────────────────────────────────────────────────────────┐
│ Business Edits                                                  │
├─────────────────────────────────────────────────────────────────┤
│ ╔═══════════════════════════════════════════════════════════╗  │
│ ║ PENDING EDITS QUEUE (3)                                   ║  │
│ ╠═══════════════════════════════════════════════════════════╣  │
│ ║ Business Name   │ Owner    │ Submitted │ Changes │ Action ║  │
│ ║ Joe's Coffee    │ Joe S.   │ 2h ago    │ 3       │ Review ║  │
│ ║ Tech Store      │ Alice M. │ 1d ago    │ 2       │ Review ║  │
│ ╚═══════════════════════════════════════════════════════════╝  │
│                                                                 │
│ ╔═══════════════════════════════════════════════════════════╗  │
│ ║ ACTIVITY LOGS                                              ║  │
│ ╠═══════════════════════════════════════════════════════════╣  │
│ ║ [Filter: Action ▼] [Filter: Actor ▼] [Date Range] [Search]║  │
│ ╠═══════════════════════════════════════════════════════════╣  │
│ ║ ✓ Joe's Coffee │ edit_approved │ Admin John │ 10:30 AM   ║  │
│ ║ ⏳ Tech Store   │ edit_submitted │ Owner      │ 9:15 AM    ║  │
│ ║ ⚡ Bakery       │ auto_approved  │ System     │ 8:00 AM    ║  │
│ ╚═══════════════════════════════════════════════════════════╝  │
└─────────────────────────────────────────────────────────────────┘
```

### Owner Logs Tab Layout
```
┌─────────────────────────────────────────────────────────────────┐
│ [Storefront] [Offers] [Products] [Reviews] [Enhanced] [Logs]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│    Activity History                                             │
│    ─────────────────                                            │
│                                                                 │
│    ●─── Business Approved                    Feb 8, 2026 10:30a│
│    │    Approved by Admin                                       │
│    │                                                            │
│    ●─── Business Registered                  Feb 7, 2026 3:15p │
│    │    You submitted your business for review                  │
│    │                                                            │
│    ●─── Profile Updated                      Feb 9, 2026 2:00p │
│    │    ✓ Phone number updated (auto-approved)                  │
│    │                                                            │
│    ●─── Changes Submitted                    Feb 10, 2026 9:00a│
│    │    ⏳ Awaiting admin review:                               │
│    │    • Business name change                                  │
│    │    • Address change                                        │
│    │                                                            │
│    ●─── Changes Approved                     Feb 10, 2026 11:30a│
│         ✓ All changes approved by Admin                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Testing Scenarios

### Admin Scenarios
1. Navigate to Business Edits page from left nav
2. View pending edits queue with correct counts
3. Click through to review modal (existing functionality)
4. View activity logs with all action types
5. Filter logs by action type, actor, date range
6. Search logs by business name
7. Verify all actions are logged in real-time

### Owner Scenarios
1. Register new business → see "Business Registered" log entry
2. Get approved → see "Business Approved" log entry
3. Submit pending edits → see "Changes Submitted" log entry
4. Get approved → see "Changes Approved" log entry
5. Make instant update → see "Profile Updated (auto)" log entry
6. Create offer → see "Offer Created" log entry
7. Logs persist permanently

---

## Out of Scope (Future Enhancements)

- Email notifications for log entries
- Log export to PDF
- Admin ability to annotate logs
- Real-time log streaming via WebSocket

---

## Related Stories

- [STORY 6.3.6](./STORY_6.3.6_Pending_Edits_Infrastructure.md) - Pending Edits Infrastructure
- [STORY 6.3.7](./STORY_6.3.7_Owner_Pending_Edits_Experience.md) - Owner Pending Edits Experience
- [STORY 6.3.8](./STORY_6.3.8_Admin_Pending_Edits_Review.md) - Admin Pending Edits Review
