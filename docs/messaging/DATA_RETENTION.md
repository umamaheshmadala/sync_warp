# 🗑️ Messaging Data Retention & Cleanup

**Epic:** 8.1 - Messaging Foundation & Database Architecture  
**Created:** 2025-11-29  
**Last Updated:** 2025-11-29

---

## 🎯 Overview

This document describes the automated data retention and cleanup policies for the messaging system.

---

## 📋 Retention Policies

### Messages

- **Retention Period:** 90 days
- **Action:** Soft delete (mark `is_deleted = true`)
- **Rationale:** Industry standard for messaging apps
- **Exceptions:** None (all messages subject to same policy)

### Read Receipts

- **Retention Period:** 7 days after message deletion
- **Action:** Hard delete
- **Rationale:** No value after message is deleted

### Message Edit History

- **Retention Period:** 30 days
- **Action:** Hard delete
- **Rationale:** Audit trail for recent edits only

### Typing Indicators

- **Retention Period:** 1 minute
- **Action:** Hard delete
- **Rationale:** Real-time data, no historical value

### Storage Files (Attachments)

- **Retention Period:** 90 days
- **Action:** Hard delete from storage bucket
- **Rationale:** Matches message retention period

---

## ⚙️ Automated Cleanup

### Cleanup Schedule

- **Frequency:** Daily
- **Time:** 2:00 AM UTC
- **Method:** Supabase Edge Function with cron trigger

### Cleanup Operations

#### 1. Archive Old Messages

```sql
-- Soft delete messages older than 90 days
UPDATE messages
SET is_deleted = true, deleted_at = NOW()
WHERE created_at < NOW() - INTERVAL '90 days'
  AND is_deleted = false
LIMIT 1000;
```

**Function:** `archive_old_messages(p_batch_size, p_dry_run)`  
**Batch Size:** 1,000 messages per run  
**Execution Time:** ~30s for 10K messages

#### 2. Clean Orphaned Data

```sql
-- Delete orphaned read receipts
DELETE FROM message_read_receipts
WHERE message_id IN (
  SELECT mrr.message_id
  FROM message_read_receipts mrr
  LEFT JOIN messages m ON m.id = mrr.message_id
  WHERE m.id IS NULL
    OR (m.is_deleted = true AND m.updated_at < NOW() - INTERVAL '7 days')
);

-- Delete old typing indicators
DELETE FROM typing_indicators
WHERE updated_at < NOW() - INTERVAL '1 minute';

-- Delete old message edits
DELETE FROM message_edits
WHERE edited_at < NOW() - INTERVAL '30 days';
```

**Function:** `cleanup_orphaned_data()`  
**Execution Time:** ~10s

#### 3. Clean Old Storage Files

```sql
-- Delete files older than 90 days
DELETE FROM storage.objects
WHERE bucket_id = 'message-attachments'
  AND created_at < NOW() - INTERVAL '90 days'
LIMIT 100;
```

**Function:** `cleanup_orphaned_storage_files(p_batch_size, p_dry_run)`  
**Batch Size:** 100 files per run  
**Execution Time:** ~5s per 100 files

---

## 🚀 Edge Function Deployment

### Function Location

```
supabase/functions/cleanup-messaging/index.ts
```

### Deploy Command

```bash
# Deploy the Edge Function
supabase functions deploy cleanup-messaging --no-verify-jwt

# Verify deployment
supabase functions list
```

### Environment Variables Required

- `SUPABASE_URL` - Automatically provided
- `SUPABASE_SERVICE_ROLE_KEY` - Automatically provided

### Manual Trigger (Testing)

```bash
# Test locally
supabase functions serve cleanup-messaging

# Invoke locally
curl -X POST http://localhost:54321/functions/v1/cleanup-messaging

# Invoke in production
curl -X POST https://your-project.supabase.co/functions/v1/cleanup-messaging \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

---

## ⏰ Cron Configuration

### Supabase Dashboard Setup

1. Go to **Database** → **Cron Jobs**
2. Click **Create a new cron job**
3. Configure:
   - **Name:** `messaging-cleanup`
   - **Schedule:** `0 2 * * *` (Daily at 2 AM UTC)
   - **Command:**
     ```sql
     SELECT
       net.http_post(
         url:='https://your-project.supabase.co/functions/v1/cleanup-messaging',
         headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
         body:='{}'::jsonb
       ) as request_id;
     ```

### Alternative: pg_cron Extension

If pg_cron is available:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule cleanup job
SELECT cron.schedule(
  'messaging-cleanup',
  '0 2 * * *', -- Daily at 2 AM UTC
  $$
  SELECT archive_old_messages(1000, false);
  SELECT cleanup_orphaned_data();
  SELECT cleanup_orphaned_storage_files(100, false);
  $$
);

-- Verify schedule
SELECT * FROM cron.job;
```

---

## 📊 Monitoring

### Cleanup Logs Table

All cleanup operations are logged to `cleanup_logs`:

```sql
SELECT
  operation,
  records_affected,
  execution_time_ms,
  status,
  executed_at
FROM cleanup_logs
ORDER BY executed_at DESC
LIMIT 10;
```

### Monitoring Queries

#### Last 7 Days Summary

```sql
SELECT
  operation,
  COUNT(*) as executions,
  SUM(records_affected) as total_records_affected,
  AVG(execution_time_ms) as avg_execution_time_ms,
  MAX(executed_at) as last_execution
FROM cleanup_logs
WHERE executed_at > NOW() - INTERVAL '7 days'
GROUP BY operation
ORDER BY last_execution DESC;
```

#### Failed Cleanups

```sql
SELECT *
FROM cleanup_logs
WHERE status != 'success'
ORDER BY executed_at DESC;
```

#### Storage Freed Over Time

```sql
SELECT
  DATE(executed_at) as date,
  SUM(records_affected) as files_deleted,
  'Check Edge Function logs for MB freed' as note
FROM cleanup_logs
WHERE operation = 'cleanup_orphaned_storage_files'
GROUP BY DATE(executed_at)
ORDER BY date DESC
LIMIT 30;
```

---

## 🧪 Testing

### Dry Run Mode

Test cleanup without actually deleting data:

```sql
-- Test archive (dry run)
SELECT * FROM archive_old_messages(100, true);

-- Test storage cleanup (dry run)
SELECT * FROM cleanup_orphaned_storage_files(50, true);
```

### Manual Execution

Run cleanup manually for testing:

```sql
-- Archive 100 messages
SELECT * FROM archive_old_messages(100, false);

-- Clean orphaned data
SELECT * FROM cleanup_orphaned_data();

-- Clean 50 storage files
SELECT * FROM cleanup_orphaned_storage_files(50, false);
```

---

## 🚨 Troubleshooting

### Issue: Cleanup Job Not Running

**Check:**

1. Verify cron job is scheduled:

   ```sql
   SELECT * FROM cron.job WHERE jobname = 'messaging-cleanup';
   ```

2. Check Edge Function logs:

   ```bash
   supabase functions logs cleanup-messaging
   ```

3. Verify Edge Function is deployed:
   ```bash
   supabase functions list
   ```

**Solution:**

- Re-deploy Edge Function
- Verify cron schedule syntax
- Check service role key permissions

---

### Issue: Cleanup Running Too Slow

**Check:**

```sql
SELECT
  operation,
  AVG(execution_time_ms) as avg_time_ms,
  MAX(execution_time_ms) as max_time_ms
FROM cleanup_logs
WHERE executed_at > NOW() - INTERVAL '7 days'
GROUP BY operation;
```

**Solution:**

- Reduce batch size
- Run cleanup more frequently (e.g., every 12 hours)
- Add indexes if sequential scans detected

---

### Issue: Too Many Records Being Deleted

**Check:**

```sql
SELECT
  operation,
  SUM(records_affected) as total_deleted,
  COUNT(*) as executions
FROM cleanup_logs
WHERE executed_at > NOW() - INTERVAL '7 days'
GROUP BY operation;
```

**Solution:**

- Verify retention periods are correct
- Check for data anomalies (e.g., bulk message imports)
- Adjust batch sizes

---

## 📋 Maintenance Checklist

### Weekly

- [ ] Review cleanup logs for errors
- [ ] Verify cleanup job is running on schedule
- [ ] Check database size trend

### Monthly

- [ ] Review retention policies (still appropriate?)
- [ ] Analyze storage costs vs. retention period
- [ ] Review cleanup performance metrics

### Quarterly

- [ ] Audit cleanup effectiveness
- [ ] Review and update retention policies if needed
- [ ] Optimize cleanup queries if performance degraded

---

## 🔗 Related Documents

- [Epic 8.1 Audit Report](../audit_reports/EPIC_8.1_AUDIT_REPORT.md)
- [Performance Baseline](./PERFORMANCE_BASELINE.md)
- [Database Functions](./DATABASE_FUNCTIONS.md)

---

## 📝 Changelog

### 2025-11-29 - Initial Setup

- Created Edge Function for automated cleanup
- Configured cron schedule (daily at 2 AM UTC)
- Established retention policies:
  - Messages: 90 days
  - Read receipts: 7 days after message deletion
  - Message edits: 30 days
  - Typing indicators: 1 minute
  - Storage files: 90 days

---

**Last Updated:** 2025-11-29  
**Next Review:** 2026-02-29 (3 months)  
**Owner:** Backend Engineering Team
