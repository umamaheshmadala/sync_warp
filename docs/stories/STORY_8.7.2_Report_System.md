# 🛡️ STORY 8.7.2: Report System

**Parent Epic:** [EPIC 8.7 - Moderation & Safety](../epics/EPIC_8.7_Moderation_Safety.md)
**Priority:** P1 - High
**Estimated Effort:** 2 Days

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
- [ ] **Feedback**: Success toast "Report submitted. Thank you for making SynC safer."

### 3. Logic & Automation
- [ ] **Duplicate Check**: User cannot report the same message twice.
- [ ] **Auto-Flagging**: If a message receives 3+ unique reports, mark `messages.is_flagged = true`.

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

-- Admins can view all (add admin role check if applicable)
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
      onClose();
    } catch (error) {
      toast.error(error.message);
    }
  };

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
- [ ] `message_reports` table active.
- [ ] Users can report messages via UI.
- [ ] Duplicate reports are prevented.
- [ ] Auto-flagging logic is implemented (verified via logs/DB).
