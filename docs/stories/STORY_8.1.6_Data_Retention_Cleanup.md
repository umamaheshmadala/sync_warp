# 🗑️ STORY 8.1.6: Data Retention & Cleanup Implementation

**Parent Epic:** [EPIC 8.1 - Messaging Foundation & Database Architecture](../epics/EPIC_8.1_Messaging_Foundation_Database.md)  
**Story Owner:** Backend Engineering  
**Estimated Effort:** 2 days  
**Priority:** 🟡 High  
**Status:** 📋 Ready for Implementation  
**Depends On:** Story 8.1.1 (Core Tables), Story 8.1.3 (Storage Bucket)

---

## 🎯 **Story Goal**

Implement automated data retention and cleanup mechanisms to maintain database performance and comply with data retention policies, including archiving old messages, cleaning up orphaned records, and managing storage files.

---

## 📱 **Platform Support**

### **Web + iOS + Android (Unified Backend)**

Data retention and cleanup is a **server-side operation** that runs identically across all platforms. However, mobile apps have specific cache and offline data considerations:

#### **Mobile-Specific Cleanup Considerations**

**1. Client-Side Cache Cleanup**
- **Local Message Cache**: Mobile apps cache messages locally using SQLite/IndexedDB
  - iOS: SQLite via `@capacitor/preferences` or `@capacitor-community/sqlite`
  - Android: SQLite or IndexedDB
  - Need client-side cleanup logic matching server retention policy (90 days)

**2. Offline Message Queue**
- **Pending Messages**: Mobile apps queue messages during offline periods
  - Archived messages on server should be marked as stale if still in local queue
  - Cleanup function must handle edge case where user sends message to archived conversation
  - Implement client-side check: "This conversation has been archived" before sending

**3. Local File Storage Cleanup**
- **Downloaded Media**: iOS/Android cache images/videos locally
  - iOS: `Documents/` folder via `@capacitor/filesystem`
  - Android: `files/` or Gallery via `@capacitor/filesystem`
  - Cleanup should sync with server: delete local files if server file deleted
  - Implement background sync: Check server storage, clean orphaned local files

**4. Storage Capacity Monitoring**
- **Mobile Constraints**: Devices have limited storage compared to cloud
  - More aggressive cleanup on mobile (e.g., 30 days vs 90 days for server)
  - Provide user-facing storage management UI showing cache size
  - Option: "Clear old messages older than 30/60/90 days"

**5. Background Sync After Cleanup**
- **Realtime Sync Issues**: If server archives messages while app offline
  - When app reconnects, Realtime may try to deliver archived message events
  - Client should handle `message.archived` event gracefully
  - Update local cache to mark messages as archived (hide from UI)

**6. Notification Cleanup**
- **Push Notifications**: Old notifications for archived messages should be cleared
  - iOS: Use `@capacitor/push-notifications` to clear delivered notifications
  - Android: Use `@capacitor/push-notifications` to cancel notifications
  - Match notification cleanup with server archive timeline

#### **Implementation Notes**

```typescript
// Client-side cleanup (mobile app)
import { Filesystem, Directory } from '@capacitor/filesystem'
import { PushNotifications } from '@capacitor/push-notifications'

// 1. Clean local cached messages older than 90 days
export async function cleanupLocalMessageCache() {
  const retentionDate = Date.now() - (90 * 24 * 60 * 60 * 1000)
  
  // Using local SQLite
  await db.execute(
    `DELETE FROM local_messages WHERE created_at < ? AND is_synced = true`,
    [retentionDate]
  )
}

// 2. Clean local media files for deleted server files
export async function cleanupOrphanedLocalFiles() {
  // Get list of local files
  const localFiles = await Filesystem.readdir({
    path: 'message-attachments',
    directory: Directory.Documents
  })
  
  // Check each file against server
  for (const file of localFiles.files) {
    const { data, error } = await supabase.storage
      .from('message-attachments')
      .download(file.name)
    
    if (error && error.message.includes('not found')) {
      // File deleted on server, clean up locally
      await Filesystem.deleteFile({
        path: `message-attachments/${file.name}`,
        directory: Directory.Documents
      })
    }
  }
}

// 3. Clear notifications for archived messages
export async function clearArchivedMessageNotifications(
  archivedMessageIds: string[]
) {
  const { notifications } = await PushNotifications.getDeliveredNotifications()
  
  for (const notification of notifications) {
    const messageId = notification.data?.message_id
    if (messageId && archivedMessageIds.includes(messageId)) {
      // iOS: Remove notification from tray
      // Android: Cancel notification
      // (Capacitor handles platform differences)
    }
  }
}
```

#### **Testing Checklist (Mobile-Specific)**

- [ ] **Local Cache Cleanup**: Verify messages older than 90 days removed from SQLite
- [ ] **Offline Queue Handling**: Test sending message to archived conversation shows error
- [ ] **Local File Cleanup**: Verify orphaned files deleted after server cleanup runs
- [ ] **Storage Monitoring**: Test storage usage UI shows accurate cache size
- [ ] **Background Sync**: Verify local cache updates when server archives messages
- [ ] **Notification Cleanup**: Verify push notifications cleared for archived messages
- [ ] **iOS Specifics**: Test cleanup in background with `@capacitor/background-task`
- [ ] **Android Specifics**: Test cleanup with `WorkManager` integration
- [ ] **Cross-Platform**: Run cleanup on both iOS and Android, verify consistency

#### **Key Differences from Web**

| Aspect | Web | iOS/Android |
|--------|-----|-------------|
| **Local Cache** | IndexedDB (browser-managed) | SQLite (app-managed) |
| **Cleanup Trigger** | Automatic browser policy | Manual via background task |
| **Storage Limits** | Browser quota (~50MB-1GB) | Device storage (user-controlled) |
| **Offline Data** | Limited by quota | Can be larger, needs manual cleanup |
| **Background Execution** | Service Workers | Background tasks (iOS), WorkManager (Android) |
| **File Storage** | Browser cache | App-specific directories |

---

## 📝 **User Story**

**As a** system administrator  
**I want to** automatically archive and clean up old messaging data  
**So that** the database remains performant and storage costs are optimized

---

## ✅ **Acceptance Criteria**

- [ ] `archive_old_messages()` function implemented with 90-day retention
- [ ] `cleanup_orphaned_data()` function removes stale records
- [ ] Storage file cleanup integrated
- [ ] Functions execute without blocking active queries
- [ ] Admin monitoring dashboard shows cleanup metrics
- [ ] Manual trigger capability exists
- [ ] Cleanup logs are maintained
- [ ] Performance impact < 5% during cleanup
- [ ] Zero data loss for active conversations

---

## 🛢 **MCP Integration (Primary: Supabase MCP)**

### **Phase 1: Create Archive Function**

```bash
# Create archive function
warp mcp run supabase "apply_migration create_archive_messages_function"

# Test with sample data (older than 90 days)
warp mcp run supabase "execute_sql SELECT archive_old_messages(100, false);"

# Verify archived messages marked correctly
warp mcp run supabase "execute_sql SELECT COUNT(*) FROM messages WHERE is_archived = true AND archived_at > NOW() - INTERVAL '1 hour';"

# Test dry-run mode
warp mcp run supabase "execute_sql SELECT archive_old_messages(10, true);"

# Check function performance
warp mcp run supabase "execute_sql EXPLAIN ANALYZE SELECT archive_old_messages(1000, false);"
```

### **Phase 2: Create Cleanup Function**

```bash
# Create cleanup function
warp mcp run supabase "apply_migration create_cleanup_orphaned_data_function"

# Test cleanup execution
warp mcp run supabase "execute_sql SELECT cleanup_orphaned_data();"

# Verify orphaned receipts cleaned
warp mcp run supabase "execute_sql SELECT COUNT(*) FROM message_read_receipts WHERE message_id NOT IN (SELECT id FROM messages);"

# Verify old typing indicators cleaned
warp mcp run supabase "execute_sql SELECT COUNT(*) FROM typing_indicators WHERE updated_at < NOW() - INTERVAL '1 minute';"

# Check cleanup logs
warp mcp run supabase "execute_sql SELECT * FROM cleanup_logs ORDER BY executed_at DESC LIMIT 10;"
```

### **Phase 3: Deploy Cleanup Edge Function**

```bash
# Deploy Edge Function for scheduled cleanup
warp mcp run supabase "deploy_edge_function message-cleanup --files cleanup-function.ts"

# Test Edge Function locally
warp mcp run supabase "execute_sql SELECT * FROM http.post('http://localhost:54321/functions/v1/message-cleanup', '{}');"

# Check function logs
warp mcp run supabase "get_logs edge-function"

# Verify execution time
warp mcp run supabase "execute_sql SELECT name, created_at FROM edge_function_executions WHERE function_name = 'message-cleanup' ORDER BY created_at DESC LIMIT 5;"
```

### **Phase 4: Test Storage Cleanup**

```bash
# List files older than 90 days
warp mcp run supabase "execute_sql SELECT name, created_at FROM storage.objects WHERE bucket_id = 'message-attachments' AND created_at < NOW() - INTERVAL '90 days' LIMIT 10;"

# Test storage cleanup (dry-run)
warp mcp run supabase "execute_sql SELECT cleanup_old_storage_files(10, true);"

# Execute storage cleanup
warp mcp run supabase "execute_sql SELECT cleanup_old_storage_files(100, false);"

# Verify files deleted
warp mcp run supabase "execute_sql SELECT COUNT(*) FROM storage.objects WHERE bucket_id = 'message-attachments' AND created_at < NOW() - INTERVAL '90 days';"
```

---

## 🧠 **MCP Integration (Secondary: Context7 MCP)**

```bash
# Analyze batch processing strategy
warp mcp run context7 "Review the archive_old_messages function and suggest optimizations for processing 100K+ messages"

# Review cleanup performance
warp mcp run context7 "Analyze the cleanup_orphaned_data function and identify potential bottlenecks"

# Suggest monitoring improvements
warp mcp run context7 "Review the cleanup_logs table and suggest additional metrics to track"
```

---

## 📋 **Implementation Tasks**

### **Task 1: Create archive_old_messages Function** ⏱️ 4 hours

```sql
-- Create cleanup logs table
CREATE TABLE IF NOT EXISTS cleanup_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operation TEXT NOT NULL,
  records_affected INTEGER NOT NULL DEFAULT 0,
  execution_time_ms INTEGER,
  status TEXT NOT NULL, -- 'success', 'failed', 'partial'
  error_message TEXT,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create archive function
CREATE OR REPLACE FUNCTION archive_old_messages(
  p_batch_size INTEGER DEFAULT 1000,
  p_dry_run BOOLEAN DEFAULT false
)
RETURNS TABLE (
  messages_archived INTEGER,
  execution_time_ms INTEGER
) AS $$
DECLARE
  v_start_time TIMESTAMPTZ;
  v_end_time TIMESTAMPTZ;
  v_execution_time_ms INTEGER;
  v_archived_count INTEGER := 0;
  v_retention_date TIMESTAMPTZ := NOW() - INTERVAL '90 days';
BEGIN
  v_start_time := clock_timestamp();
  
  IF p_dry_run THEN
    -- Dry run: just count messages that would be archived
    SELECT COUNT(*) INTO v_archived_count
    FROM messages
    WHERE created_at < v_retention_date
      AND is_archived = false
      AND is_deleted = false
    LIMIT p_batch_size;
    
    RAISE NOTICE 'DRY RUN: Would archive % messages', v_archived_count;
  ELSE
    -- Actual archiving
    WITH archived_messages AS (
      UPDATE messages
      SET 
        is_archived = true,
        archived_at = NOW()
      WHERE id IN (
        SELECT id
        FROM messages
        WHERE created_at < v_retention_date
          AND is_archived = false
          AND is_deleted = false
        ORDER BY created_at ASC
        LIMIT p_batch_size
        FOR UPDATE SKIP LOCKED
      )
      RETURNING id
    )
    SELECT COUNT(*) INTO v_archived_count FROM archived_messages;
    
    -- Log the operation
    INSERT INTO cleanup_logs (operation, records_affected, status)
    VALUES ('archive_old_messages', v_archived_count, 'success');
  END IF;
  
  v_end_time := clock_timestamp();
  v_execution_time_ms := EXTRACT(EPOCH FROM (v_end_time - v_start_time)) * 1000;
  
  RETURN QUERY SELECT v_archived_count, v_execution_time_ms;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### **Task 2: Create cleanup_orphaned_data Function** ⏱️ 3 hours

```sql
CREATE OR REPLACE FUNCTION cleanup_orphaned_data()
RETURNS TABLE (
  orphaned_receipts_deleted INTEGER,
  old_typing_indicators_deleted INTEGER,
  old_edits_deleted INTEGER,
  execution_time_ms INTEGER
) AS $$
DECLARE
  v_start_time TIMESTAMPTZ;
  v_end_time TIMESTAMPTZ;
  v_execution_time_ms INTEGER;
  v_receipts_deleted INTEGER := 0;
  v_typing_deleted INTEGER := 0;
  v_edits_deleted INTEGER := 0;
BEGIN
  v_start_time := clock_timestamp();
  
  -- Clean orphaned read receipts (message deleted >7 days ago)
  WITH deleted_receipts AS (
    DELETE FROM message_read_receipts
    WHERE message_id IN (
      SELECT mrr.message_id
      FROM message_read_receipts mrr
      LEFT JOIN messages m ON m.id = mrr.message_id
      WHERE m.id IS NULL OR (m.is_deleted = true AND m.updated_at < NOW() - INTERVAL '7 days')
    )
    RETURNING id
  )
  SELECT COUNT(*) INTO v_receipts_deleted FROM deleted_receipts;
  
  -- Clean old typing indicators (>1 minute old)
  WITH deleted_typing AS (
    DELETE FROM typing_indicators
    WHERE updated_at < NOW() - INTERVAL '1 minute'
    RETURNING id
  )
  SELECT COUNT(*) INTO v_typing_deleted FROM deleted_typing;
  
  -- Clean old message edits (>30 days old)
  WITH deleted_edits AS (
    DELETE FROM message_edits
    WHERE edited_at < NOW() - INTERVAL '30 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO v_edits_deleted FROM deleted_edits;
  
  -- Log the operation
  INSERT INTO cleanup_logs (
    operation, 
    records_affected, 
    status
  )
  VALUES (
    'cleanup_orphaned_data',
    v_receipts_deleted + v_typing_deleted + v_edits_deleted,
    'success'
  );
  
  v_end_time := clock_timestamp();
  v_execution_time_ms := EXTRACT(EPOCH FROM (v_end_time - v_start_time)) * 1000;
  
  RETURN QUERY SELECT 
    v_receipts_deleted,
    v_typing_deleted,
    v_edits_deleted,
    v_execution_time_ms;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### **Task 3: Create Storage Cleanup Function** ⏱️ 3 hours

```sql
CREATE OR REPLACE FUNCTION cleanup_old_storage_files(
  p_batch_size INTEGER DEFAULT 100,
  p_dry_run BOOLEAN DEFAULT false
)
RETURNS TABLE (
  files_deleted INTEGER,
  storage_freed_mb NUMERIC
) AS $$
DECLARE
  v_deleted_count INTEGER := 0;
  v_storage_freed BIGINT := 0;
  v_file RECORD;
BEGIN
  IF p_dry_run THEN
    -- Dry run: count files that would be deleted
    SELECT 
      COUNT(*),
      COALESCE(SUM(metadata->>'size')::BIGINT, 0)
    INTO v_deleted_count, v_storage_freed
    FROM storage.objects
    WHERE bucket_id = 'message-attachments'
      AND created_at < NOW() - INTERVAL '90 days'
    LIMIT p_batch_size;
    
    RAISE NOTICE 'DRY RUN: Would delete % files (%.2f MB)', 
      v_deleted_count, 
      v_storage_freed::NUMERIC / 1048576;
  ELSE
    -- Delete old files
    FOR v_file IN (
      SELECT name, (metadata->>'size')::BIGINT as file_size
      FROM storage.objects
      WHERE bucket_id = 'message-attachments'
        AND created_at < NOW() - INTERVAL '90 days'
      ORDER BY created_at ASC
      LIMIT p_batch_size
    )
    LOOP
      -- Delete from storage
      DELETE FROM storage.objects
      WHERE bucket_id = 'message-attachments'
        AND name = v_file.name;
      
      v_deleted_count := v_deleted_count + 1;
      v_storage_freed := v_storage_freed + COALESCE(v_file.file_size, 0);
    END LOOP;
    
    -- Log the operation
    INSERT INTO cleanup_logs (
      operation,
      records_affected,
      status
    )
    VALUES (
      'cleanup_old_storage_files',
      v_deleted_count,
      'success'
    );
  END IF;
  
  RETURN QUERY SELECT 
    v_deleted_count,
    (v_storage_freed::NUMERIC / 1048576)::NUMERIC(10,2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### **Task 4: Create Edge Function for Scheduled Cleanup** ⏱️ 2 hours

```typescript
// supabase/functions/message-cleanup/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const results = {
      archived_messages: 0,
      orphaned_data_cleaned: 0,
      storage_files_deleted: 0,
      errors: []
    }

    // Archive old messages (process in batches of 1000)
    try {
      const { data: archiveResult, error: archiveError } = await supabase.rpc(
        'archive_old_messages',
        { p_batch_size: 1000, p_dry_run: false }
      )
      if (archiveError) throw archiveError
      results.archived_messages = archiveResult[0].messages_archived
    } catch (err) {
      results.errors.push({ operation: 'archive', error: err.message })
    }

    // Clean orphaned data
    try {
      const { data: cleanupResult, error: cleanupError } = await supabase.rpc(
        'cleanup_orphaned_data'
      )
      if (cleanupError) throw cleanupError
      results.orphaned_data_cleaned = 
        cleanupResult[0].orphaned_receipts_deleted +
        cleanupResult[0].old_typing_indicators_deleted +
        cleanupResult[0].old_edits_deleted
    } catch (err) {
      results.errors.push({ operation: 'cleanup', error: err.message })
    }

    // Clean old storage files (batches of 100)
    try {
      const { data: storageResult, error: storageError } = await supabase.rpc(
        'cleanup_old_storage_files',
        { p_batch_size: 100, p_dry_run: false }
      )
      if (storageError) throw storageError
      results.storage_files_deleted = storageResult[0].files_deleted
    } catch (err) {
      results.errors.push({ operation: 'storage', error: err.message })
    }

    return new Response(JSON.stringify(results), {
      headers: { 'Content-Type': 'application/json' },
      status: results.errors.length > 0 ? 207 : 200
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
```

### **Task 5: Create Admin Monitoring Dashboard** ⏱️ 2 hours

Create SQL queries and views for monitoring:
- Total archived messages
- Storage space freed
- Cleanup execution history
- Error tracking

---

## 🧪 **Testing Checklist**

### **Archive Function Tests**
- [ ] Archives messages older than 90 days
- [ ] Does not archive active conversations
- [ ] Dry-run mode works correctly
- [ ] Batch size limit respected
- [ ] Uses SKIP LOCKED to avoid blocking
- [ ] Execution time < 30s for 10K messages
- [ ] Logs created correctly

### **Cleanup Function Tests**
- [ ] Removes orphaned read receipts
- [ ] Removes typing indicators >1 minute old
- [ ] Removes message edits >30 days old
- [ ] Does not affect active records
- [ ] Execution time < 10s
- [ ] Logs created correctly

### **Storage Cleanup Tests**
- [ ] Identifies files older than 90 days
- [ ] Dry-run mode works correctly
- [ ] Deletes files from storage
- [ ] Calculates storage freed correctly
- [ ] Batch processing works
- [ ] No orphaned file references

### **Edge Function Tests**
- [ ] Executes all cleanup operations
- [ ] Handles errors gracefully
- [ ] Returns correct metrics
- [ ] Completes within timeout
- [ ] Can be manually triggered

---

## 📊 **Success Metrics**

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Archive Function** | < 30s for 10K messages | Execution time log |
| **Cleanup Function** | < 10s execution | Execution time log |
| **Storage Cleanup** | < 5s per 100 files | Execution time log |
| **Zero Data Loss** | 100% | Manual verification |
| **Downtime During Cleanup** | 0 seconds | Monitor active queries |
| **Performance Impact** | < 5% | Before/after query times |

---

## 🔗 **Dependencies**

**Requires:**
- ✅ Story 8.1.1 (messages, conversations tables)
- ✅ Story 8.1.3 (Storage bucket)
- ✅ cleanup_logs table

**Enables:**
- Epic 8.9 (Full automation with cron)
- Admin monitoring dashboard
- Storage cost optimization

---

## 📦 **Deliverables**

1. **Migration File**: `supabase/migrations/20250206_create_cleanup_functions.sql`
2. **Edge Function**: `supabase/functions/message-cleanup/index.ts`
3. **Documentation**: `docs/messaging/DATA_RETENTION.md`
4. **Admin SQL Queries**: `docs/messaging/ADMIN_MONITORING.sql`
5. **Cleanup Schedule**: Configuration for Epic 8.9

---

## 🚨 **Edge Cases**

1. **Active conversations**: Never archive messages from conversations with activity in last 30 days
2. **Concurrent cleanup**: Use SKIP LOCKED to prevent blocking
3. **Large batches**: Process in smaller chunks to avoid timeouts
4. **Storage errors**: Continue cleanup even if some files fail
5. **Orphaned files**: Files without message references
6. **Manual intervention**: Allow admins to trigger cleanup anytime
7. **Failed cleanups**: Retry logic with exponential backoff

---

## 🔐 **Security Considerations**

1. **SECURITY DEFINER**: Functions run with elevated privileges
2. **Audit logging**: All cleanup operations logged
3. **No user data exposure**: Functions don't return sensitive data
4. **RLS bypass**: Cleanup functions need to bypass RLS
5. **Service role only**: Edge function uses service role key

---

## 💡 **Usage Examples**

### **Manual Archive Execution**
```sql
-- Dry run to see what would be archived
SELECT * FROM archive_old_messages(100, true);

-- Archive 1000 messages
SELECT * FROM archive_old_messages(1000, false);

-- Check recent archive operations
SELECT * FROM cleanup_logs 
WHERE operation = 'archive_old_messages'
ORDER BY executed_at DESC 
LIMIT 10;
```

### **Manual Cleanup Execution**
```sql
-- Run cleanup
SELECT * FROM cleanup_orphaned_data();

-- Check cleanup stats
SELECT 
  operation,
  SUM(records_affected) as total_records,
  COUNT(*) as executions,
  AVG(execution_time_ms) as avg_time_ms
FROM cleanup_logs
WHERE executed_at > NOW() - INTERVAL '7 days'
GROUP BY operation;
```

### **Storage Cleanup**
```sql
-- Dry run
SELECT * FROM cleanup_old_storage_files(50, true);

-- Execute cleanup
SELECT * FROM cleanup_old_storage_files(100, false);

-- Check total storage saved
SELECT 
  SUM(records_affected) as total_files_deleted,
  'Check logs for storage freed' as note
FROM cleanup_logs
WHERE operation = 'cleanup_old_storage_files';
```

---

## 📋 **Admin Monitoring Queries**

```sql
-- Overall cleanup summary (last 30 days)
SELECT 
  operation,
  COUNT(*) as executions,
  SUM(records_affected) as total_records_affected,
  AVG(execution_time_ms) as avg_execution_time_ms,
  MIN(executed_at) as first_execution,
  MAX(executed_at) as last_execution
FROM cleanup_logs
WHERE executed_at > NOW() - INTERVAL '30 days'
GROUP BY operation
ORDER BY last_execution DESC;

-- Failed cleanup operations
SELECT *
FROM cleanup_logs
WHERE status != 'success'
ORDER BY executed_at DESC;

-- Messages by archive status
SELECT 
  is_archived,
  COUNT(*) as count,
  MIN(created_at) as oldest_message,
  MAX(created_at) as newest_message
FROM messages
GROUP BY is_archived;

-- Storage usage by age
SELECT 
  CASE 
    WHEN created_at > NOW() - INTERVAL '30 days' THEN '<30 days'
    WHEN created_at > NOW() - INTERVAL '90 days' THEN '30-90 days'
    ELSE '>90 days'
  END as age_group,
  COUNT(*) as file_count,
  ROUND(SUM((metadata->>'size')::BIGINT)::NUMERIC / 1048576, 2) as size_mb
FROM storage.objects
WHERE bucket_id = 'message-attachments'
GROUP BY age_group
ORDER BY age_group;
```

---

## ✅ **Definition of Done**

- [ ] archive_old_messages function created and tested
- [ ] cleanup_orphaned_data function created and tested
- [ ] cleanup_old_storage_files function created and tested
- [ ] cleanup_logs table created
- [ ] Edge function deployed
- [ ] All tests passing
- [ ] Performance targets met
- [ ] Admin monitoring queries documented
- [ ] Documentation complete
- [ ] Code reviewed and approved

---

**Story Status:** 📋 Ready for Implementation  
**Next Story:** [STORY 8.1.7 - Performance Testing](./STORY_8.1.7_Performance_Testing.md)
