# 🗂️ STORY 8.9.2: Cron Schedule & Admin Logging

**Parent Epic:** [EPIC 8.9 - Message Retention Automation](../epics/EPIC_8.9_Message_Retention_Automation.md)
**Priority:** P0 - Critical
**Estimated Effort:** 0.5 Days
**Dependencies:** Story 8.9.1 (Edge Function)

---

## 🎯 **Goal**
Schedule the cleanup edge function to run automatically every day at 2 AM UTC, and create an `admin_logs` table to track all cleanup operations for monitoring and auditing.

---

## 📋 **Acceptance Criteria**

### 1. Cron Scheduling
- [ ] **Primary**: `pg_cron` extension enabled and job scheduled for `0 2 * * *` (daily at 2 AM UTC).
- [ ] **Fallback (if pg_cron unavailable)**: Use one of:
  - Supabase Edge Functions "Scheduled Triggers" (Dashboard → Edge Functions → Schedule)
  - External cron service (GitHub Actions, Vercel Cron, or Render Cron)
- [ ] Cron job successfully triggers the edge function.
- [ ] **Secure Key Injection**: Do NOT hardcode `SUPABASE_SERVICE_ROLE_KEY` in the SQL definition. 
  - Preferred: Use Supabase Vault (`vault.secrets`) if available.
  - Alternative: Use an internal project API key or configure the Edge Function to accept a custom internal signature header.
- [ ] **Minimal Permissions**: Ensure the database role executing the cron job has only the necessary permissions.

### 2. Admin Logs Table
- [ ] `admin_logs` table created with columns: `id`, `action`, `metadata`, `created_at`.
- [ ] RLS policy: Only admin users can view logs.
- [ ] Index on `action` and `created_at` for efficient queries.

### 3. Failure Alerting
- [ ] **Webhook on Error**: Edge function posts to a Slack/Discord webhook (or logs to a monitoring table) on failure.
- [ ] **Optional**: Setup Supabase Database Webhook to trigger on `INSERT INTO admin_logs WHERE metadata->>'error' IS NOT NULL`.

### 4. Verification
- [ ] `SELECT * FROM cron.job WHERE jobname = 'cleanup-old-messages'` returns the job (if using pg_cron).
- [ ] After first automated run, `admin_logs` contains a new entry.

---

## 🧩 **Implementation Details**

### Migration: `supabase/migrations/YYYYMMDD_setup_cleanup_cron.sql`
```sql
-- Enable pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily cleanup
SELECT cron.schedule(
  'cleanup-old-messages',
  '0 2 * * *',
  -- SAFETY: Use net.http_post with a header secret from vault or internal config
  $$
  select
      net.http_post(
          url:='https://project-ref.supabase.co/functions/v1/cleanup-old-messages',
          headers:=jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
          ),
          body:='{}'::jsonb
      ) as request_id;
  $$
);

-- Admin Logs Table
CREATE TABLE public.admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
-- Add RLS and indexes as per epic
```

---

## 🤖 **MCP Integration Strategy**

### Supabase MCP
- **Apply Migration**: `warp mcp run supabase "apply_migration setup_cleanup_cron --project_id YOUR_PROJECT_ID"`
- **Verify Job**: `warp mcp run supabase "execute_sql SELECT * FROM cron.job;"`
- **Check History**: `warp mcp run supabase "execute_sql SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 5;"`

---

## 🧪 **Testing Plan**
1. Apply the migration.
2. Query `cron.job` to confirm the job exists.
3. Wait for 2 AM UTC (or manually trigger for testing).
4. Verify `admin_logs` has an entry for `message_cleanup`.

---

## ✅ **Definition of Done**
- [ ] Cron job is registered and active.
- [ ] `admin_logs` table exists with correct schema.
- [ ] First automated run logs successfully.
