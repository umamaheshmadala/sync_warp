# 🗂️ STORY 8.9.1: Cleanup Edge Function Implementation

**Parent Epic:** [EPIC 8.9 - Message Retention Automation](../epics/EPIC_8.9_Message_Retention_Automation.md)
**Priority:** P0 - Critical
**Estimated Effort:** 1 Day
**Dependencies:** Epic 8.1 (Database Foundation)
**Status:** ✅ Complete

---

## 🎯 **Goal**
Create and deploy a Supabase Edge Function that archives messages older than 90 days, cleans up orphaned data, and removes old media files from storage.

---

## 📋 **Acceptance Criteria**

### 1. Edge Function Logic
- [x] `cleanup-old-messages` edge function created in `supabase/functions/`.
- [x] Function calls `archive_old_messages()` RPC to soft-delete old messages.
- [x] Function calls `cleanup_orphaned_data()` RPC to remove stale read receipts, typing indicators, etc.
- [x] Function iterates storage bucket `message-attachments` and deletes files older than 90 days.

### 2. Batching & Performance
- [x] **Batched Deletion**: Delete storage files in batches of 100 with a 500ms delay between batches to avoid rate limits.
- [x] **Recursive Pagination**: Implement recursive listing using `offset` or `cursor` to ensure all files are processed, not just the first page (since Supabase Storage `list()` is paginated).
- [x] **Dry Run Mode**: Support `?dryRun=true` query parameter that returns counts without actual deletion.

### 3. Concurrency Guard
- [x] **Idempotency Check**: Before running, check `admin_logs` for a cleanup within the last hour. If found, skip execution to prevent overlapping runs.

### 4. Logging & Response
- [x] Function logs progress to console (for Supabase logs viewer).
- [x] Function returns JSON response with `messages_archived`, `files_deleted`, and `dry_run` status.
- [x] Function handles errors gracefully and returns 500 on failure.

### 5. Deployment
- [x] Function deployed successfully via Supabase CLI.
- [x] Function invocable manually via `supabase functions invoke cleanup-old-messages`.

---

## 🧩 **Implementation Details**

### File: `supabase/functions/cleanup-old-messages/index.ts`
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // 1. Archive old messages
  const { data: archivedMessages } = await supabase.rpc('archive_old_messages')
  // 2. Cleanup orphaned data
  await supabase.rpc('cleanup_orphaned_data')
  // 3. Delete old storage files
  // Loop with pagination to ensure we get ALL files, not just the first 1000
  let hasMore = true;
  let page = 0;
  while (hasMore) {
    const { data: files } = await supabase.storage.from('message-attachments').list(null, { limit: 100, offset: page * 100 });
    if (!files || files.length === 0) {
       hasMore = false;
       break;
    }
    // ... (filter by date and delete in batches)
    page++;
  }

  return new Response(JSON.stringify({ success: true, messages_archived: archivedMessages }))
})
```

---

## 🤖 **MCP Integration Strategy**

### Supabase MCP
- **Deploy Function**: `warp mcp run supabase "deploy_edge_function cleanup-old-messages --project_id YOUR_PROJECT_ID"`
- **Test Invoke**: `warp mcp run supabase "execute_sql SELECT net.http_post(...)"`

---

## 🧪 **Testing Plan**
1. Deploy the edge function.
2. Manually invoke: `supabase functions invoke cleanup-old-messages --no-verify-jwt`.
3. Verify `admin_logs` table has a new entry after invocation.

---

## ✅ **Definition of Done**
- [ ] Edge function deployed and callable.
- [ ] Old messages are archived (soft-deleted).
- [ ] Old media files are deleted from storage bucket.
- [ ] Console logs show cleanup stats.
