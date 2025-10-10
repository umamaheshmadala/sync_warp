# Story 4B.8: Data Retention System

**Epic:** 4B - Missing Business Owner Features  
**Priority:** 🟡 P2 - MEDIUM (Compliance & Legal)  
**Effort:** 3 days  
**Status:** 📝 PLANNED  
**Owner:** TBD

---

## 📋 Overview

**Problem:** Enhanced Project Brief specifies a comprehensive data retention system with:
- Automated warnings before data deletion
- Override request workflow for extending retention
- Compliance with data protection regulations (GDPR, CCPA)
- Archive options for historical data
- Admin review and approval processes

**Current State:** No data retention management exists. Data accumulates indefinitely, creating:
- Compliance risks
- Storage costs
- Privacy concerns
- Potential legal liability

**Solution:** Implement automated data retention system with:
1. Configurable retention policies by data type
2. Automated warning notifications (7, 3, 1 day before deletion)
3. Override request workflow with admin approval
4. Archive to cold storage before deletion
5. Comprehensive audit logging
6. User-friendly dashboard widgets

**Business Value:**
- ⚖️ **Legal Compliance** - meet GDPR/CCPA requirements
- 💰 **Cost Savings** - reduce storage costs
- 🔒 **Privacy Protection** - honor data deletion requests
- 📊 **Audit Trail** - complete accountability

---

## 👥 User Stories

### Primary User Story
```
As a platform admin,
I want automated data retention policies,
So that we comply with data protection regulations and manage storage costs.
```

### Supporting User Stories
```
As a business owner,
I want to receive warnings before my data is deleted,
So that I can request an extension if needed.

As a business owner,
I want to request retention overrides,
So that important data isn't lost.

As a compliance officer,
I want audit logs of all retention actions,
So that I can prove regulatory compliance.

As a user,
I want my data deleted after a reasonable period,
So that my privacy is protected.
```

---

## ✅ Acceptance Criteria

### Must Have (MVP)

#### 1. Retention Policies Configuration
- [ ] **Policy Types:**
  - [ ] User accounts (inactive >1 year)
  - [ ] Business accounts (inactive >2 years)
  - [ ] Coupons (expired >90 days)
  - [ ] Transactions (completed >7 years)
  - [ ] Media files (orphaned >30 days)
  - [ ] Logs (>90 days)
- [ ] **Policy Settings:**
  - [ ] Retention period in days
  - [ ] Warning schedule (e.g., 7, 3, 1 days before)
  - [ ] Auto-archive before delete
  - [ ] Enable/disable toggle
- [ ] **Admin Interface:**
  - [ ] View all policies
  - [ ] Edit retention periods
  - [ ] Enable/disable policies
  - [ ] Test policy execution

#### 2. Automated Warning System
- [ ] **Warning Notifications:**
  - [ ] Email notification 7 days before deletion
  - [ ] Email notification 3 days before deletion
  - [ ] Email notification 1 day before deletion
  - [ ] In-app notification badges
- [ ] **Warning Content:**
  - [ ] Data type to be deleted
  - [ ] Deletion scheduled date
  - [ ] Impact explanation
  - [ ] Override request link
  - [ ] Archive download option
- [ ] **Tracking:**
  - [ ] Log all warnings sent
  - [ ] Track user responses
  - [ ] Prevent duplicate warnings

#### 3. Override Request Workflow
- [ ] **Request Submission:**
  - [ ] Simple form for users/businesses
  - [ ] Reason field (required)
  - [ ] Extension period selector
  - [ ] Supporting documents upload
  - [ ] Confirmation email
- [ ] **Admin Review:**
  - [ ] Approval queue dashboard
  - [ ] Request details display
  - [ ] Approve/reject actions
  - [ ] Reason for decision field
  - [ ] Email notification to requester
- [ ] **Request States:**
  - [ ] `pending` - Awaiting review
  - [ ] `approved` - Extension granted
  - [ ] `rejected` - Request denied
  - [ ] `expired` - Request outdated

#### 4. Archive Before Delete
- [ ] **Archive Process:**
  - [ ] Export data to JSON/CSV
  - [ ] Compress archive files
  - [ ] Upload to cold storage (S3 Glacier)
  - [ ] Generate archive manifest
  - [ ] Record archive location
- [ ] **Archive Access:**
  - [ ] Download archive (admin only)
  - [ ] Restore from archive (admin approval)
  - [ ] View archive contents
  - [ ] Search archived data

#### 5. Deletion Execution
- [ ] **Soft Delete:**
  - [ ] Mark records as deleted
  - [ ] Hide from normal queries
  - [ ] Maintain referential integrity
  - [ ] 30-day recovery window
- [ ] **Hard Delete:**
  - [ ] Permanently remove after soft delete period
  - [ ] Cascade to related records
  - [ ] Delete associated files
  - [ ] Update audit log
- [ ] **Batch Processing:**
  - [ ] Process in small batches
  - [ ] Rate limiting to prevent overload
  - [ ] Progress tracking
  - [ ] Error handling and retry

#### 6. Dashboard & Reporting
- [ ] **User Dashboard Widget:**
  - [ ] Show pending deletions
  - [ ] Days remaining counter
  - [ ] Quick action buttons
  - [ ] Recent warnings list
- [ ] **Admin Dashboard:**
  - [ ] Total records scheduled for deletion
  - [ ] Deletion by data type chart
  - [ ] Storage savings estimate
  - [ ] Override request queue
  - [ ] Recent deletions log

### Should Have
- [ ] Automated restore from archive
- [ ] Selective data deletion
- [ ] Custom retention policies per business tier
- [ ] Data anonymization instead of deletion

### Won't Have (This Story)
- ⛔ Real-time deletion (runs on schedule)
- ⛔ User-initiated bulk deletion
- ⛔ Cross-platform data portability

---

## 🛠️ Technical Requirements

### Database Schema

#### 1. New Table: `data_retention_policies`
```sql
CREATE TABLE data_retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Policy Definition
  data_type TEXT NOT NULL, -- 'user', 'business', 'coupon', 'transaction', 'media', 'logs'
  retention_days INTEGER NOT NULL,
  warning_days_before INTEGER[] DEFAULT ARRAY[7,3,1],
  
  -- Archive Settings
  auto_archive BOOLEAN DEFAULT true,
  archive_location TEXT, -- S3 bucket path
  
  -- Deletion Settings
  soft_delete_days INTEGER DEFAULT 30, -- grace period before hard delete
  cascade_delete BOOLEAN DEFAULT false,
  
  -- Status
  enabled BOOLEAN DEFAULT true,
  last_executed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_retention_policies_type ON data_retention_policies(data_type);
CREATE INDEX idx_retention_policies_enabled ON data_retention_policies(enabled);
```

#### 2. New Table: `retention_warnings`
```sql
CREATE TABLE retention_warnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Target Data
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  
  -- Warning Details
  days_until_deletion INTEGER NOT NULL,
  deletion_scheduled_for DATE NOT NULL,
  warning_sent_at TIMESTAMPTZ DEFAULT now(),
  
  -- User Info
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT NOT NULL,
  
  -- Status
  warning_acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_retention_warnings_entity ON retention_warnings(entity_type, entity_id);
CREATE INDEX idx_retention_warnings_user ON retention_warnings(user_id);
CREATE INDEX idx_retention_warnings_scheduled ON retention_warnings(deletion_scheduled_for);
```

#### 3. New Table: `retention_override_requests`
```sql
CREATE TABLE retention_override_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Target Data
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  
  -- Request Details
  requested_by UUID REFERENCES auth.users(id),
  reason TEXT NOT NULL,
  extension_days INTEGER NOT NULL, -- how many additional days
  supporting_documents TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Review
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  
  -- Outcome
  new_deletion_date DATE,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_override_requests_status ON retention_override_requests(status);
CREATE INDEX idx_override_requests_requested_by ON retention_override_requests(requested_by);
CREATE INDEX idx_override_requests_entity ON retention_override_requests(entity_type, entity_id);
```

#### 4. New Table: `retention_archives`
```sql
CREATE TABLE retention_archives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Archive Details
  entity_type TEXT NOT NULL,
  entity_ids UUID[] NOT NULL,
  archive_date DATE NOT NULL,
  
  -- Storage
  archive_url TEXT NOT NULL, -- S3 Glacier URL
  archive_size_bytes BIGINT,
  compression_format TEXT DEFAULT 'gzip',
  
  -- Manifest
  record_count INTEGER,
  manifest JSONB, -- { entity_id: metadata }
  
  -- Access
  restore_requested_at TIMESTAMPTZ,
  restore_completed_at TIMESTAMPTZ,
  restore_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_archives_entity_type ON retention_archives(entity_type);
CREATE INDEX idx_archives_date ON retention_archives(archive_date);
```

#### 5. New Table: `retention_audit_log`
```sql
CREATE TABLE retention_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Event
  event_type TEXT NOT NULL CHECK (event_type IN ('warning_sent', 'override_requested', 'override_approved', 'override_rejected', 'archived', 'soft_deleted', 'hard_deleted', 'restored')),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  
  -- Actor
  actor_id UUID REFERENCES auth.users(id),
  actor_email TEXT,
  actor_role TEXT,
  
  -- Details
  details JSONB DEFAULT '{}',
  
  -- Metadata
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_log_event_type ON retention_audit_log(event_type);
CREATE INDEX idx_audit_log_entity ON retention_audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_actor ON retention_audit_log(actor_id);
CREATE INDEX idx_audit_log_created_at ON retention_audit_log(created_at);
```

### API Endpoints

#### User/Business Endpoints

##### 1. Get Pending Deletions
```typescript
GET /api/retention/pending-deletions?userId={id}
Response: {
  items: [{
    entityType: string,
    entityId: string,
    scheduledFor: string,
    daysRemaining: number,
    canRequestOverride: boolean
  }]
}
```

##### 2. Request Override
```typescript
POST /api/retention/request-override
Body: {
  entityType: string,
  entityId: string,
  reason: string,
  extensionDays: number,
  supportingDocs?: string[]
}
Response: {
  requestId: string,
  status: 'pending'
}
```

##### 3. Download Archive
```typescript
GET /api/retention/archive/{archiveId}/download
Response: {
  downloadUrl: string,
  expiresAt: string
}
```

#### Admin Endpoints

##### 1. Get Retention Policies
```typescript
GET /api/admin/retention/policies
Response: {
  policies: RetentionPolicy[]
}
```

##### 2. Update Policy
```typescript
PUT /api/admin/retention/policies/{id}
Body: {
  retentionDays: number,
  warningDaysBefore: number[],
  enabled: boolean
}
```

##### 3. Get Override Requests
```typescript
GET /api/admin/retention/override-requests?status={status}
Response: {
  requests: OverrideRequest[],
  pagination: {...}
}
```

##### 4. Review Override Request
```typescript
POST /api/admin/retention/review-override
Body: {
  requestId: string,
  decision: 'approved' | 'rejected',
  reviewNotes: string,
  newDeletionDate?: string
}
```

##### 5. Manual Delete
```typescript
POST /api/admin/retention/manual-delete
Body: {
  entityType: string,
  entityId: string,
  reason: string,
  skipArchive?: boolean
}
```

### Background Jobs

#### 1. Retention Check Job (Daily)
```typescript
// Runs daily at 2 AM
async function checkRetentionPolicies() {
  // 1. For each enabled policy:
  // 2. Find records that match retention criteria
  // 3. Calculate deletion date
  // 4. Create/update warning records
  // 5. Send warning emails
  // 6. Schedule for deletion
}
```

#### 2. Warning Email Job
```typescript
async function sendRetentionWarnings() {
  // 1. Get warnings due today
  // 2. Group by user
  // 3. Generate email content
  // 4. Send emails
  // 5. Mark warnings as sent
  // 6. Create audit log
}
```

#### 3. Archive Job
```typescript
async function archiveData() {
  // 1. Get records scheduled for deletion tomorrow
  // 2. Export to JSON/CSV
  // 3. Compress files
  // 4. Upload to S3 Glacier
  // 5. Create archive record
  // 6. Log to audit
}
```

#### 4. Deletion Job
```typescript
async function executeDeletions() {
  // 1. Get records scheduled for deletion today
  // 2. Soft delete (mark as deleted)
  // 3. Create audit log
  // 4. Send confirmation email
  
  // For hard deletes:
  // 5. Get soft-deleted records older than grace period
  // 6. Permanently delete
  // 7. Delete associated files
  // 8. Log to audit
}
```

### React Components

#### 1. `RetentionWarningWidget.tsx`
```typescript
src/components/common/retention/RetentionWarningWidget.tsx
- Display pending deletions
- Days remaining countdown
- Request override button
- Dismiss button
```

#### 2. `OverrideRequestForm.tsx`
```typescript
src/components/business/retention/OverrideRequestForm.tsx
- Entity selection
- Reason textarea
- Extension period selector
- Document upload
- Submit button
```

#### 3. `AdminRetentionDashboard.tsx`
```typescript
src/components/admin/retention/AdminRetentionDashboard.tsx
- Policies list with edit
- Pending deletions stats
- Override requests queue
- Audit log viewer
- Manual actions
```

#### 4. `OverrideReviewPanel.tsx`
```typescript
src/components/admin/retention/OverrideReviewPanel.tsx
- Request details display
- Requester info
- Supporting documents
- Approve/reject buttons
- Review notes field
```

### Custom Hooks

#### `useRetentionWarnings.ts`
```typescript
export function useRetentionWarnings(userId: string) {
  const getWarnings = async () => {...}
  const requestOverride = async (data: OverrideData) => {...}
  const acknowledgeWarning = async (warningId: string) => {...}
  
  return {
    warnings,
    requestOverride,
    acknowledgeWarning,
    loading,
    error
  }
}
```

#### `useRetentionAdmin.ts`
```typescript
export function useRetentionAdmin() {
  const getPolicies = async () => {...}
  const updatePolicy = async (id: string, data: PolicyData) => {...}
  const getOverrideRequests = async (status: string) => {...}
  const reviewOverride = async (id: string, decision: string, notes: string) => {...}
  
  return {
    policies,
    overrideRequests,
    updatePolicy,
    reviewOverride,
    loading,
    error
  }
}
```

---

## 🎨 UI/UX Requirements

### Wireframe: Retention Warning Widget (User Dashboard)

```
┌──────────────────────────────────────────┐
│ ⚠️ Data Retention Notice                │
├──────────────────────────────────────────┤
│                                           │
│ Your business account will be archived   │
│ in 7 days due to inactivity.             │
│                                           │
│ Scheduled Deletion: Jan 31, 2025         │
│                                           │
│ What will be deleted:                    │
│ • Business profile                       │
│ • Product listings                       │
│ • Historical data                        │
│                                           │
│ [Request Extension] [Download Archive]   │
│                                           │
│ [X] Dismiss                              │
└──────────────────────────────────────────┘
```

### Wireframe: Override Request Form

```
┌──────────────────────────────────────────┐
│ Request Data Retention Extension         │
├──────────────────────────────────────────┤
│                                           │
│ Entity: My Business Account              │
│ Current Deletion Date: Jan 31, 2025      │
│                                           │
│ Extension Period:                         │
│ ● 30 days                                │
│ ○ 60 days                                │
│ ○ 90 days                                │
│ ○ 1 year                                 │
│                                           │
│ Reason for Extension (required):         │
│ ┌────────────────────────────────────┐  │
│ │ We are planning to relaunch in... │  │
│ └────────────────────────────────────┘  │
│                                           │
│ Supporting Documents (optional):          │
│ [Upload Files]                           │
│                                           │
│ Note: Your request will be reviewed      │
│ within 3 business days.                  │
│                                           │
│ [Cancel]              [Submit Request]   │
└──────────────────────────────────────────┘
```

### Wireframe: Admin Override Review

```
┌──────────────────────────────────────────┐
│ Review Override Request #OR-12345        │
├──────────────────────────────────────────┤
│                                           │
│ Requested By: John Doe                   │
│ Business: Pizza Palace                   │
│ Entity Type: Business Account            │
│ Current Deletion: Jan 31, 2025           │
│ Requested Extension: 60 days             │
│                                           │
│ Reason:                                   │
│ "We are planning to relaunch in March    │
│ after renovations are complete."         │
│                                           │
│ Supporting Documents:                     │
│ • renovation-permit.pdf                  │
│ • business-plan-2025.pdf                 │
│                                           │
│ Account History:                          │
│ • Last login: 3 months ago               │
│ • Last transaction: 6 months ago         │
│ • Previous extensions: 0                 │
│                                           │
│ Review Notes:                             │
│ ┌────────────────────────────────────┐  │
│ │ Approved - legitimate business... │  │
│ └────────────────────────────────────┘  │
│                                           │
│ New Deletion Date: [March 31, 2025]     │
│                                           │
│ [Reject]                      [Approve]  │
└──────────────────────────────────────────┘
```

---

## 🧪 Test Plan

### Unit Tests

```typescript
describe('Retention Policy', () => {
  it('calculates deletion date correctly')
  it('determines warning schedule')
  it('identifies records for deletion')
  it('handles override requests')
})

describe('Archive Process', () => {
  it('exports data to JSON')
  it('compresses archive')
  it('uploads to cold storage')
  it('creates manifest')
})
```

### Integration Tests

```typescript
describe('Retention Flow', () => {
  it('sends warnings on schedule')
  it('processes override requests')
  it('archives before deletion')
  it('executes soft delete')
  it('executes hard delete')
  it('creates audit logs')
})
```

### E2E Test Scenarios

```gherkin
Given a business account has been inactive for 2 years
When the retention job runs
Then a warning is sent 7 days before deletion
When the business owner requests an override
And admin approves the request
Then deletion date is extended
And warning is cancelled

Given a coupon expired 90 days ago
When the retention job runs
Then coupon is archived
And coupon is soft deleted
After 30 days grace period
Then coupon is hard deleted permanently
```

---

## 📝 Implementation Plan

### Day 1: Schema & Policies
- [ ] Create all retention tables
- [ ] Add RLS policies
- [ ] Create indexes
- [ ] Implement policy configuration API
- [ ] Admin policy management UI
- [ ] Unit tests

### Day 2: Jobs & Automation
- [ ] Retention check job
- [ ] Warning email job
- [ ] Archive job
- [ ] Deletion job
- [ ] Testing with small datasets

### Day 3: UI & Workflow
- [ ] Warning widget
- [ ] Override request form
- [ ] Admin review panel
- [ ] Audit log viewer
- [ ] Integration tests
- [ ] E2E scenarios
- [ ] Documentation

---

## 🔗 Integration Points

### Existing Systems
- **Email Service:** Send warning notifications
- **Storage:** Archive to S3 Glacier
- **Auth:** User/admin permissions
- **Dashboard:** Warning widgets

---

## 🚨 Edge Cases & Error Handling

### Edge Cases
1. **Override during deletion:** Prevent if already archived
2. **Multiple override requests:** Allow only one active
3. **Archive failure:** Retry mechanism
4. **Restore request:** Queue for manual review
5. **Policy conflicts:** Longest retention wins

### Legal Considerations
- GDPR right to erasure compliance
- Data export before deletion
- Audit trail for all actions
- Clear user communication
- Grace period for mistakes

---

## 📊 Success Metrics

### Functional Metrics
- [ ] 100% policy execution rate
- [ ] <1% failed deletions
- [ ] 95% warning delivery rate
- [ ] <24h override review time

### Business Metrics
- [ ] Storage cost reduction
- [ ] Compliance audit pass rate
- [ ] User satisfaction with warnings
- [ ] Override approval rate

---

## 📚 Definition of Done

- [ ] All retention policies configurable
- [ ] Automated warnings sending
- [ ] Override workflow functional
- [ ] Archive system working
- [ ] Audit logging complete
- [ ] Tests passing
- [ ] Documentation complete

---

**Story Status:** 📝 PLANNED  
**Blocked By:** None ✅  
**Blocking:** None  
**Ready for Development:** YES 🚀

