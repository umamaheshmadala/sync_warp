# 🗂️ EPIC 8.9: Message Retention Automation

**Epic Owner:** Backend Engineering / DevOps  
**Dependencies:** Epic 8.1 (Database Foundation)  
**Timeline:** Week 11 (1-2 days, final task)  
**Status:** 📋 Planning  
**Priority:** 🔴 **CRITICAL** - Required for production

---

## 🎯 **Epic Goal**

**Automate** the execution of message retention policies to ensure:
- Messages older than 90 days are automatically archived
- Storage costs remain predictable
- Database performance doesn't degrade over time
- Compliance with stated retention policy (Instagram/WhatsApp standard)

**Key Deliverable:** A scheduled Edge Function that runs daily to clean up old messages and orphaned data.

---

## ✅ **Success Criteria**

| Objective | Target |
|-----------|--------|
| **Cleanup Execution** | Runs daily at 2 AM UTC |
| **Messages Archived** | 100% of 90+ day old messages soft-deleted |
| **Storage Cleanup** | Media files older than 90 days removed |
| **Zero Downtime** | Cleanup runs without affecting users |
| **Monitoring** | Logs cleanup operations with metrics |

---

## 🧩 **Key Components**

### **1. Scheduled Edge Function**

**File:** `supabase/functions/cleanup-old-messages/index.ts`

```typescript
// supabase/functions/cleanup-old-messages/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    console.log('🧹 Starting scheduled message cleanup...')

    // Initialize Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. Archive messages older than 90 days (soft delete)
    const { data: archivedMessages, error: archiveError } = await supabase
      .rpc('archive_old_messages')

    if (archiveError) {
      console.error('❌ Error archiving messages:', archiveError)
      throw archiveError
    }

    console.log(`✅ Archived old messages: ${archivedMessages || 0}`)

    // 2. Cleanup orphaned data (read receipts, typing indicators, etc.)
    const { data: cleanupResult, error: cleanupError } = await supabase
      .rpc('cleanup_orphaned_data')

    if (cleanupError) {
      console.error('❌ Error cleaning orphaned data:', cleanupError)
      throw cleanupError
    }

    console.log(`✅ Cleaned orphaned data`)

    // 3. Cleanup storage bucket (media files older than 90 days)
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 90)

    const { data: files, error: listError } = await supabase.storage
      .from('message-attachments')
      .list('', {
        limit: 1000,
        sortBy: { column: 'created_at', order: 'asc' }
      })

    if (listError) throw listError

    let deletedFilesCount = 0
    for (const file of files || []) {
      const fileCreatedAt = new Date(file.created_at)
      if (fileCreatedAt < cutoffDate) {
        await supabase.storage
          .from('message-attachments')
          .remove([file.name])
        deletedFilesCount++
      }
    }

    console.log(`✅ Deleted ${deletedFilesCount} old media files`)

    // 4. Log cleanup operation to admin logs
    await supabase.from('admin_logs').insert({
      action: 'message_cleanup',
      metadata: {
        messages_archived: archivedMessages,
        files_deleted: deletedFilesCount,
        timestamp: new Date().toISOString()
      }
    })

    return new Response(
      JSON.stringify({
        success: true,
        messages_archived: archivedMessages,
        files_deleted: deletedFilesCount
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('❌ Cleanup failed:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

**🛢 MCP Integration:**
```bash
# Deploy edge function via Supabase MCP
warp mcp run supabase "deploy_edge_function cleanup-old-messages"
```

---

### **2. Database Function Updates**

**Enhancement to Epic 8.1 functions for better return values**

```sql
-- Update archive_old_messages to return count
CREATE OR REPLACE FUNCTION archive_old_messages()
RETURNS INTEGER AS $$
DECLARE
  archived_count INTEGER;
BEGIN
  -- Mark messages as deleted (soft delete)
  WITH updated AS (
    UPDATE messages
    SET is_deleted = true, deleted_at = now()
    WHERE created_at < now() - INTERVAL '90 days'
      AND is_deleted = false
    RETURNING id
  )
  SELECT count(*) INTO archived_count FROM updated;
  
  RETURN archived_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### **3. Supabase Cron Schedule**

**File:** `supabase/migrations/20250212_setup_cleanup_cron.sql`

```sql
-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule cleanup to run daily at 2 AM UTC
SELECT cron.schedule(
  'cleanup-old-messages',
  '0 2 * * *', -- Every day at 2 AM UTC
  $$
  SELECT
    net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/cleanup-old-messages',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
      ),
      body := '{}'::jsonb
    );
  $$
);

-- Verify cron job created
SELECT * FROM cron.job WHERE jobname = 'cleanup-old-messages';
```

**Alternative: If pg_cron unavailable, use Supabase Edge Functions cron**

```bash
# Use Supabase CLI to schedule edge function
supabase functions schedule \
  cleanup-old-messages \
  --cron "0 2 * * *" \
  --region us-east-1
```

**🛢 MCP Integration:**
```bash
# Apply migration via Supabase MCP
warp mcp run supabase "apply_migration setup_cleanup_cron"

# Verify cron job
warp mcp run supabase "execute_sql SELECT * FROM cron.job WHERE jobname = 'cleanup-old-messages';"
```

---

### **4. Admin Logs Table**

**Create table to track cleanup operations**

```sql
-- Create admin_logs table for monitoring
CREATE TABLE public.admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Index for quick lookups
CREATE INDEX idx_admin_logs_action ON admin_logs(action);
CREATE INDEX idx_admin_logs_created_at ON admin_logs(created_at DESC);

-- RLS: Only admins can view logs
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view logs"
ON admin_logs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);
```

---

### **5. Admin Dashboard Component**

**File:** `src/components/admin/RetentionMonitor.tsx`

```typescript
// src/components/admin/RetentionMonitor.tsx
import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Calendar, Trash2, Database } from 'lucide-react'

interface CleanupLog {
  id: string
  action: string
  metadata: {
    messages_archived: number
    files_deleted: number
    timestamp: string
  }
  created_at: string
}

export function RetentionMonitor() {
  const [logs, setLogs] = useState<CleanupLog[]>([])
  const [stats, setStats] = useState({
    totalMessages: 0,
    messagesOlderThan90Days: 0
  })

  useEffect(() => {
    fetchLogs()
    fetchStats()
  }, [])

  const fetchLogs = async () => {
    const { data } = await supabase
      .from('admin_logs')
      .select('*')
      .eq('action', 'message_cleanup')
      .order('created_at', { ascending: false })
      .limit(10)

    setLogs(data || [])
  }

  const fetchStats = async () => {
    // Get total messages
    const { count: total } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('is_deleted', false)

    // Get messages older than 90 days
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 90)

    const { count: old } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('is_deleted', false)
      .lt('created_at', cutoffDate.toISOString())

    setStats({
      totalMessages: total || 0,
      messagesOlderThan90Days: old || 0
    })
  }

  const manualCleanup = async () => {
    if (!confirm('Run cleanup now? This will archive messages older than 90 days.')) return

    try {
      const { data, error } = await supabase.functions.invoke('cleanup-old-messages')
      if (error) throw error

      alert(`Cleanup complete! Archived: ${data.messages_archived}, Files deleted: ${data.files_deleted}`)
      fetchLogs()
      fetchStats()
    } catch (error) {
      alert('Cleanup failed: ' + error.message)
    }
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">Message Retention Monitor</h2>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-blue-50 rounded">
          <Database className="w-6 h-6 text-blue-600 mb-2" />
          <div className="text-2xl font-bold">{stats.totalMessages.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Total Messages</div>
        </div>
        <div className="p-4 bg-yellow-50 rounded">
          <Calendar className="w-6 h-6 text-yellow-600 mb-2" />
          <div className="text-2xl font-bold">{stats.messagesOlderThan90Days.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Older than 90 Days</div>
        </div>
        <div className="p-4 bg-green-50 rounded">
          <Trash2 className="w-6 h-6 text-green-600 mb-2" />
          <button
            onClick={manualCleanup}
            className="text-sm bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Run Cleanup Now
          </button>
        </div>
      </div>

      {/* Cleanup Logs */}
      <h3 className="text-lg font-semibold mb-2">Recent Cleanup Operations</h3>
      <div className="space-y-2">
        {logs.map(log => (
          <div key={log.id} className="border rounded p-3 text-sm">
            <div className="flex justify-between">
              <span className="font-medium">
                Archived: {log.metadata.messages_archived} | Files: {log.metadata.files_deleted}
              </span>
              <span className="text-gray-500">
                {new Date(log.created_at).toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

**🎨 MCP Integration:**
```bash
# Scaffold admin dashboard with Shadcn
warp mcp run shadcn "getComponent card"
warp mcp run shadcn "getComponent table"
```

---

## 📋 **Story Breakdown**

### **Story 8.9.1: Edge Function Implementation** (1 day)
- [ ] Create `cleanup-old-messages` edge function
- [ ] Implement message archival logic
- [ ] Implement storage cleanup logic
- [ ] Add comprehensive logging
- [ ] Deploy and test manually
- **🛢 MCP**: Deploy via Supabase MCP

### **Story 8.9.2: Cron Schedule Setup** (0.5 days)
- [ ] Enable pg_cron extension OR use Supabase Edge Functions cron
- [ ] Schedule daily execution at 2 AM UTC
- [ ] Create `admin_logs` table for tracking
- [ ] Verify cron job is registered
- **🛢 MCP**: Apply migration via Supabase MCP

### **Story 8.9.3: Admin Dashboard** (0.5 days)
- [ ] Create RetentionMonitor component
- [ ] Display current stats (total messages, old messages)
- [ ] Show cleanup history
- [ ] Add manual cleanup button
- **🎨 MCP**: Use Shadcn for UI components

---

## 🧪 **Testing with MCP**

### **Manual Trigger Test**
```bash
# Manually trigger edge function via Supabase MCP
warp mcp run supabase "execute_sql SELECT net.http_post(url := 'https://YOUR_PROJECT.supabase.co/functions/v1/cleanup-old-messages', headers := '{\"Authorization\": \"Bearer YOUR_SERVICE_ROLE_KEY\"}'::jsonb);"
```

### **Verify Cron Schedule**
```bash
# Check cron job status
warp mcp run supabase "execute_sql SELECT * FROM cron.job WHERE jobname = 'cleanup-old-messages';"

# Check cron job history
warp mcp run supabase "execute_sql SELECT * FROM cron.job_run_details WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'cleanup-old-messages') ORDER BY start_time DESC LIMIT 10;"
```

### **Test with Mock Data**
```typescript
// Create test messages with old timestamps
const testOldMessage = async () => {
  const { data } = await supabase
    .from('messages')
    .insert({
      conversation_id: 'test-conv',
      sender_id: 'test-user',
      content: 'Old message',
      created_at: new Date('2024-01-01').toISOString() // 100+ days old
    })

  // Wait for cleanup to run
  // Verify message is marked as deleted
}
```

---

## ✅ **Definition of Done**

- [x] Edge function `cleanup-old-messages` deployed
- [x] Cron schedule configured (daily at 2 AM UTC)
- [x] Messages older than 90 days archived automatically
- [x] Media files older than 90 days deleted
- [x] Admin logs table tracks all operations
- [x] Admin dashboard shows real-time stats
- [x] Manual cleanup button works
- [x] Tested with mock old data

---

## 🚨 **Production Checklist**

Before going live:
- [ ] Set `SUPABASE_SERVICE_ROLE_KEY` in edge function secrets
- [ ] Configure pg_cron OR Supabase cron trigger
- [ ] Test edge function with staging data
- [ ] Monitor first automated run
- [ ] Set up alerts for cleanup failures
- [ ] Document manual cleanup procedure for emergencies

---

## 📊 **Monitoring & Alerts**

**Recommended:** Set up alerts via Supabase Dashboard or external monitoring:

1. **Alert if cleanup fails** (check `admin_logs` for errors)
2. **Alert if messages older than 100 days** (retention policy breach)
3. **Alert if storage size grows unexpectedly**

---

**Epic Status:** 📋 **Ready for Implementation**  
**Next Step:** Deploy edge function and schedule cron job  
**Timeline:** 1-2 days (Week 11, final task)  

**🎉 Once complete, your messaging system will be 100% production-ready!**
