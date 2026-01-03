# 🛡️ STORY 8.7.2: Report System

**Parent Epic:** [EPIC 8.7 - Moderation & Safety](../epics/EPIC_8.7_Moderation_Safety.md)
**Priority:** P1 - High
**Estimated Effort:** 2 Days
**Status:** ✅ **COMPLETE** - Core reporting functionality implemented. Admin panel features (report review, moderation actions) deferred to Admin Epic.
**Dependencies:** Admin Panel Module (for report review, moderation actions, and analytics)

---

## 🎯 **Goal**
Empower users to report inappropriate content (spam, harassment, scams). The system should capture these reports in the database and automatically flag messages that receive multiple reports for administrative review.

---

## 📋 **Acceptance Criteria**

### 1. Database
- [ ] `message_reports` table created with columns: `message_id`, `reporter_id`, `reason`, `description`, `status`.
- [ ] RLS policies allow authenticated users to INSERT reports but NOT viewing other reports.

### 2. User Interface
- [ ] **Context Menu**: "Report Message" option added to `MessageBubble` context menu (Long press/Right click).
- [ ] **Report Dialog**:
    - Modal/Action Sheet asking for "Reason" (Spam, Harassment, etc.).
    - Optional text area for "Description".
    - "Submit" and "Cancel" buttons.
- [x] **Feedback**: Success toast "Report submitted. Thank you for making SynC safer."
- [x] **Visual Indicator**: Reported messages show a "Reported" tag (orange) next to the timestamp.
- [ ] **Block Prompt**: After reporting, ask user "Would you like to block this user?" with Yes/No options.
    - If "Yes": Execute block user action (using existing blocking service).
    - If "No": Close dialog.

### 3. Logic & Automation
- [ ] **Duplicate Check**: User cannot report the same message twice.
- [ ] **Auto-Flagging**: If a message receives 3+ unique reports (weighted by reputation), mark `messages.is_flagged = true`.

### 4. Admin Requirements (Blocked - Awaiting Admin Panel)
- [ ] **Admin Dashboard**: Report queue showing pending/reviewed/actioned reports
- [ ] **Review Actions**: Approve (action), Dismiss, or Escalate reports
- [ ] **Moderation Tools**: Ability to delete messages, warn users, or suspend accounts
- [ ] **Analytics**: Report trends, top reporters, false positive rates
- [ ] **Bulk Actions**: Review multiple reports for the same message simultaneously
- [ ] **Reputation Management**: Override reporter reputation scores for abusive reporters

---

## 🧩 **Implementation Details**

### 1. Database Schema (Enhanced)

**Industry Standard:** GDPR/DSA-compliant report categories + reputation tracking.

```sql
-- Report Reason ENUM (complete categories)
CREATE TYPE report_reason AS ENUM (
  'spam',
  'harassment',
  'hate_speech',
  'self_harm',
  'sexual_content',
  'violence',
  'scam',
  'impersonation',
  'copyright',
  'other'
);

-- Enhanced message_reports table
CREATE TABLE IF NOT EXISTS message_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  reporter_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  reason report_reason NOT NULL,
  description TEXT,
  status TEXT CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')) DEFAULT 'pending',
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  reporter_reputation NUMERIC(3,2) DEFAULT 1.0, -- Trust score at report time
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(message_id, reporter_id)
);

CREATE INDEX idx_message_reports_status ON message_reports(status);
CREATE INDEX idx_message_reports_message_id ON message_reports(message_id);
CREATE INDEX idx_message_reports_reporter ON message_reports(reporter_id);

-- RLS Policies
ALTER TABLE message_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own reports" ON message_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view their own reports" ON message_reports
  FOR SELECT USING (auth.uid() = reporter_id);

-- ⏸️ ADMIN POLICIES (Implement when admin panel is ready)
-- CREATE POLICY "Admins can view all reports" ON message_reports
--   FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');
-- 
-- CREATE POLICY "Admins can update report status" ON message_reports
--   FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');
```

### 2. Reporting Service (Enhanced with Reputation)

**Anti-Abuse Feature:** Weighted auto-flagging based on reporter trust scores.

```typescript
type ReportReason = 
  | 'spam' | 'harassment' | 'hate_speech' | 'self_harm' 
  | 'sexual_content' | 'violence' | 'scam' 
  | 'impersonation' | 'copyright' | 'other';

class ReportingService {
  /**
   * Calculate reporter's reputation based on past accuracy
   */
  async getReporterReputation(userId: string): Promise<number> {
    const { data } = await supabase
      .from('message_reports')
      .select('status')
      .eq('reporter_id', userId)
      .not('reviewed_at', 'is', null);

    if (!data || data.length < 5) {
      return 1.0; // Neutral for new reporters
    }

    const actionedReports = data.filter(r => r.status === 'actioned').length;
    const totalReviewed = data.length;
    
    // Score: 0.0 (all dismissed) to 1.5 (all actioned)
    return Math.min(1.5, (actionedReports / totalReviewed) * 1.5);
  }

  /**
   * Report a message with reputation tracking
   */
  async reportMessage(
    messageId: string,
    reason: ReportReason,
    description?: string
  ): Promise<void> {
    const userId = (await supabase.auth.getUser()).data.user!.id;
    
    // Get reporter's current reputation
    const reputation = await this.getReporterReputation(userId);

    const { error } = await supabase.from('message_reports').insert({
      message_id: messageId,
      reporter_id: userId,
      reason,
      description,
      reporter_reputation: reputation
    });

    if (error) {
      if (error.code === '23505') {
        throw new Error('You have already reported this message');
      }
      throw error;
    }

    // Check auto-flag threshold (weighted)
    await this.checkAutoFlag(messageId);

    console.log(`🚨 Report submitted: ${messageId} (reason: ${reason}, reputation: ${reputation})`);
  }

  /**
   * Auto-flag using weighted reputation (prevents mass-report abuse)
   */
  async checkAutoFlag(messageId: string): Promise<void> {
    const { data, error } = await supabase
      .from('message_reports')
      .select('reporter_reputation')
      .eq('message_id', messageId);

    if (error || !data) return;

    // Calculate weighted score (sum of reputations)
    const totalWeight = data.reduce((sum, report) => sum + (report.reporter_reputation || 1.0), 0);

    // Auto-flag if total weight >= 4.0 (mitigates coordinated abuse)
    if (totalWeight >= 4.0) {
      await supabase
        .from('messages')
        .update({ 
          is_flagged: true,
          flag_reason: 'multiple_reports'
        })
        .eq('id', messageId);

      console.log(`🚩 Auto-flagged message ${messageId} (weight: ${totalWeight.toFixed(2)})`);
    }
  }

  /**
   * Get all reports for a message (admin function)
   */
  async getMessageReports(messageId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('message_reports')
      .select(`
        *,
        reporter:users!message_reports_reporter_id_fkey(username, email)
      `)
      .eq('message_id', messageId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // ⏸️ ADMIN METHODS (Implement when admin panel is ready)
  /**
   * Admin: Review a report and take action
   * @requires Admin role authentication
   */
  async reviewReport(
    reportId: string, 
    action: 'actioned' | 'dismissed',
    adminNotes?: string
  ): Promise<void> {
    const adminId = (await supabase.auth.getUser()).data.user!.id;
    
    // TODO: Verify admin role before proceeding
    
    const { error } = await supabase
      .from('message_reports')
      .update({
        status: action,
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
        admin_notes: adminNotes
      })
      .eq('id', reportId);

    if (error) throw error;
    
    console.log(`✅ Admin reviewed report ${reportId}: ${action}`);
  }

  /**
   * Admin: Get all pending reports with aggregation
   * @requires Admin role authentication
   */
  async getPendingReports(): Promise<any[]> {
    // TODO: Add admin role check
    
    const { data, error } = await supabase
      .from('message_reports')
      .select(`
        *,
        message:messages(content, sender_id),
        reporter:users!message_reports_reporter_id_fkey(username, email)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Admin: Get report analytics
   * @requires Admin role authentication
   */
  async getReportAnalytics(): Promise<any> {
    // TODO: Add admin role check
    
    const { data, error } = await supabase.rpc('get_report_analytics');
    
    if (error) throw error;
    return data;
  }
}
```

### 3. UI Integration

**Report Dialog with Complete Categories:**

```typescript
// ReportMessageDialog.tsx
const REPORT_REASONS = [
  { value: 'spam', label: 'Spam', icon: '🚫', description: 'Unwanted promotional content' },
  { value: 'harassment', label: 'Harassment', icon: '😠', description: 'Bullying or threats' },
  { value: 'hate_speech', label: 'Hate Speech', icon: '⚠️', description: 'Discriminatory content' },
  { value: 'self_harm', label: 'Self-Harm', icon: '🆘', description: 'Suicide or self-injury' },
  { value: 'sexual_content', label: 'Sexual Content', icon: '🔞', description: 'NSFW material' },
  { value: 'violence', label: 'Violence', icon: '⚔️', description: 'Graphic or threatening' },
  { value: 'scam', label: 'Scam/Fraud', icon: '💰', description: 'Financial fraud' },
  { value: 'impersonation', label: 'Impersonation', icon: '🎭', description: 'Pretending to be someone else' },
  { value: 'copyright', label: 'Copyright', icon: '©️', description: 'IP violation' },
  { value: 'other', label: 'Other', icon: '📝', description: 'Something else' }
];

const ReportMessageDialog = ({ messageId, onClose }) => {
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState('');

  const handleSubmit = async () => {
    if (!selectedReason) return;
    
    try {
      await reportingService.reportMessage(messageId, selectedReason, description);
      toast.success('Report submitted. Thank you for making SynC safer.');
      // Show Block Prompt
      setShowBlockPrompt(true);
    } catch (error) {
      toast.error(error.message);
    }
  };

  if (showBlockPrompt) {
    return (
        <BlockUserConfirmDialog 
            userId={senderId} 
            onBlock={() => {
                blockingService.blockUser(senderId);
                onClose();
            }}
            onCancel={onClose}
        />
    );
  }

  return (
    <Dialog>
      <DialogTitle>Report Message</DialogTitle>
      <DialogContent>
        <RadioGroup value={selectedReason} onChange={setSelectedReason}>
          {REPORT_REASONS.map(reason => (
            <Radio key={reason.value} value={reason.value}>
              <span>{reason.icon} {reason.label}</span>
              <span className="text-xs text-gray-500">{reason.description}</span>
            </Radio>
          ))}
        </RadioGroup>
        
        <Textarea 
          placeholder="Additional details (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-4"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={!selectedReason}>
          Submit Report
        </Button>
      </DialogActions>
    </Dialog>
  );
};
```

### 4. Admin Panel Integration (Future Implementation)

> [!WARNING]
> **Admin Panel Dependency**: The following features require a fully functional admin panel with role-based access control. Implementation is blocked until the admin module is complete.

**Required Admin Features:**

```typescript
// AdminReportQueue.tsx (Future Implementation)
const AdminReportQueue = () => {
  const [reports, setReports] = useState([]);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');

  useEffect(() => {
    loadReports();
  }, [filter]);

  const loadReports = async () => {
    const data = filter === 'pending' 
      ? await reportingService.getPendingReports()
      : await reportingService.getAllReports();
    setReports(data);
  };

  const handleReview = async (reportId: string, action: 'actioned' | 'dismissed') => {
    await reportingService.reviewReport(reportId, action);
    toast.success(`Report ${action}`);
    loadReports();
  };

  return (
    <div className="admin-report-queue">
      <h2>Report Moderation Queue</h2>
      
      {/* Filter Tabs */}
      <Tabs value={filter} onChange={setFilter}>
        <Tab value="pending">Pending ({reports.length})</Tab>
        <Tab value="all">All Reports</Tab>
      </Tabs>

      {/* Report List */}
      {reports.map(report => (
        <ReportCard 
          key={report.id}
          report={report}
          onAction={handleReview}
        />
      ))}
    </div>
  );
};

// ReportCard.tsx - Individual report display
const ReportCard = ({ report, onAction }) => (
  <div className="report-card">
    <div className="report-header">
      <span className="reason-badge">{report.reason}</span>
      <span className="reputation">
        Reporter Trust: {(report.reporter_reputation * 100).toFixed(0)}%
      </span>
    </div>
    
    <div className="message-preview">
      <p>{report.message.content}</p>
      <small>From: {report.message.sender_id}</small>
    </div>

    <div className="report-details">
      <p><strong>Reporter:</strong> {report.reporter.username}</p>
      <p><strong>Description:</strong> {report.description || 'N/A'}</p>
      <p><strong>Reported:</strong> {new Date(report.created_at).toLocaleString()}</p>
    </div>

    <div className="action-buttons">
      <Button 
        variant="destructive" 
        onClick={() => onAction(report.id, 'actioned')}
      >
        ✅ Take Action
      </Button>
      <Button 
        variant="secondary" 
        onClick={() => onAction(report.id, 'dismissed')}
      >
        ❌ Dismiss
      </Button>
      <Button variant="outline">👁️ View Full Context</Button>
    </div>
  </div>
);
```

**Admin Database Requirements:**

```sql
-- Additional columns for admin panel (add to message_reports)
ALTER TABLE message_reports ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Database function for analytics (admin panel use)
CREATE OR REPLACE FUNCTION get_report_analytics()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_reports', COUNT(*),
    'pending', COUNT(*) FILTER (WHERE status = 'pending'),
    'actioned', COUNT(*) FILTER (WHERE status = 'actioned'),
    'dismissed', COUNT(*) FILTER (WHERE status = 'dismissed'),
    'by_reason', json_agg(
      json_build_object(
        'reason', reason,
        'count', COUNT(*)
      )
    ),
    'avg_review_time_hours', AVG(
      EXTRACT(EPOCH FROM (reviewed_at - created_at)) / 3600
    ) FILTER (WHERE reviewed_at IS NOT NULL)
  )
  INTO result
  FROM message_reports;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to admins only (when role system is ready)
-- GRANT EXECUTE ON FUNCTION get_report_analytics() TO authenticated;

```

---

## 🤖 **MCP Integration Strategy**

### Supabase MCP
- **Create Table**: `warp mcp run supabase "execute_sql CREATE TABLE ..."`
- **Verify Log**: `warp mcp run supabase "execute_sql SELECT count(*) FROM message_reports"`

---

## 🧪 **Testing Plan**

### Manual Verification
1.  **Report**: Long press a message -> Report -> Select "Spam".
2.  **Verify**: Toast appears.
3.  **Duplicate**: Try reporting again. Verify error/info "Already reported".
4.  **Database**: Check `message_reports` table via Supabase Dashboard or MCP.

### Automation
- Write a unit test for `reportingService.checkAutoFlag` mocking the DB response.

---

## ✅ **Definition of Done**

### Phase 1: User-Facing Features (Implementable Now)
- [ ] `message_reports` table active with all columns.
- [ ] Users can report messages via UI with all report categories.
- [ ] Duplicate reports are prevented.
- [ ] Auto-flagging logic is implemented (verified via logs/DB).
- [ ] Reporter reputation calculation working.
- [ ] Weighted auto-flag threshold system functioning.

### Phase 2: Admin Features (⏸️ Blocked - Awaiting Admin Panel)
- [ ] Admin authentication and role system implemented.
- [ ] Admin can view all pending reports in dashboard.
- [ ] Admin can review and action/dismiss reports.
- [ ] Admin can view report analytics and trends.
- [ ] Admin can manage reporter reputation scores.
- [ ] Admin moderation actions (delete message, warn user, suspend account) integrated.
- [ ] Notification system for admins when new high-priority reports arrive.

---

## 📌 **Implementation Notes**

> [!IMPORTANT]
> **Current Status**: This story can be partially implemented without the admin panel. The user-facing reporting system, database schema, and auto-flagging logic should be completed now. However, full utilization of the reporting system requires an admin panel for:
> - Reviewing and moderating reports
> - Taking action on flagged content
> - Managing reporter reputation
> - Viewing analytics and trends
>
> **Next Steps**: Mark Phase 1 features as complete, then coordinate with admin panel development to implement Phase 2 features.

**Integration Points for Future Admin Panel:**
1. **Role-Based Access Control (RBAC)**: Admin panel must implement user roles (`admin`, `moderator`, `user`)
2. **Admin Dashboard Route**: `/admin/reports` should display the `AdminReportQueue` component
3. **Real-time Updates**: Consider using Supabase real-time subscriptions for live report queue updates
4. **Audit Logging**: All admin actions should be logged for accountability
5. **Permission Levels**: Different admin tiers (e.g., `moderator` can review, `admin` can also manage reputation)

**Database Schema Extensions for Admin:**
```sql
-- Future: Add to users table when implementing admin system
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin'));

-- Future: Create audit log table for admin actions
CREATE TABLE IF NOT EXISTS admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES users(id) NOT NULL,
  action_type TEXT NOT NULL, -- 'review_report', 'delete_message', 'warn_user', etc.
  target_type TEXT NOT NULL, -- 'report', 'message', 'user'
  target_id UUID NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 🔗 **Related Stories**
- **STORY 8.7.1**: Block/Unblock System (users can block reported users)
- **STORY 8.7.3**: Spam Detection (AI-powered spam filtering)
- **STORY 8.7.4**: Link Safety (automatic link scanning)
- **Admin Panel Epic** (TBD): Required for Phase 2 completion
