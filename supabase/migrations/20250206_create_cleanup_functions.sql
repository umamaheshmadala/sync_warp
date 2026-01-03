-- Migration: Data Retention & Cleanup Functions
-- Story: 8.1.6 - Data Retention & Cleanup
-- Description: Implements automated cleanup mechanisms for old messages,
--              orphaned data, and storage files
-- Date: 2025-02-06

-- ============================================================================
-- TABLE: cleanup_logs
-- ============================================================================
-- Purpose: Track all cleanup operations for monitoring and auditing
-- Retention: Keep logs for 90 days

CREATE TABLE IF NOT EXISTS cleanup_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operation TEXT NOT NULL,
  records_affected INTEGER NOT NULL DEFAULT 0,
  execution_time_ms INTEGER,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'partial')),
  error_message TEXT,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_cleanup_logs_executed_at ON cleanup_logs(executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_cleanup_logs_operation ON cleanup_logs(operation, executed_at DESC);

-- Add comment
COMMENT ON TABLE cleanup_logs IS 'Audit log for cleanup operations (messages, storage, orphaned data)';

-- Grant access (admins only for direct access, but functions will insert)
GRANT SELECT ON cleanup_logs TO authenticated;

-- ============================================================================
-- FUNCTION 1: archive_old_messages
-- ============================================================================
-- Purpose: Archive messages older than 90 days (retention policy)
-- Features:
--   - Batch processing to avoid timeouts
--   - Dry-run mode for testing
--   - Uses SKIP LOCKED to prevent blocking
--   - Logs execution metrics

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
    INSERT INTO cleanup_logs (operation, records_affected, execution_time_ms, status)
    VALUES ('archive_old_messages', v_archived_count, NULL, 'success');
  END IF;
  
  v_end_time := clock_timestamp();
  v_execution_time_ms := EXTRACT(EPOCH FROM (v_end_time - v_start_time)) * 1000;
  
  -- Update execution time in log
  IF NOT p_dry_run AND v_archived_count > 0 THEN
    UPDATE cleanup_logs
    SET execution_time_ms = v_execution_time_ms
    WHERE id = (SELECT id FROM cleanup_logs ORDER BY executed_at DESC LIMIT 1);
  END IF;
  
  RETURN QUERY SELECT v_archived_count, v_execution_time_ms;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION archive_old_messages TO authenticated;

-- Add comment
COMMENT ON FUNCTION archive_old_messages IS 'Archive messages older than 90 days (retention policy). Supports batch processing and dry-run mode.';

-- ============================================================================
-- FUNCTION 2: cleanup_orphaned_data
-- ============================================================================
-- Purpose: Clean up orphaned database records
-- Features:
--   - Removes orphaned read receipts (message deleted >7 days)
--   - Removes old typing indicators (>1 minute)
--   - Removes old message edits (>30 days)
--   - Logs all operations

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
  -- Note: There's already a trigger for this, but this is a safety net
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
  
  v_end_time := clock_timestamp();
  v_execution_time_ms := EXTRACT(EPOCH FROM (v_end_time - v_start_time)) * 1000;
  
  -- Log the operation
  INSERT INTO cleanup_logs (
    operation, 
    records_affected,
    execution_time_ms,
    status
  )
  VALUES (
    'cleanup_orphaned_data',
    v_receipts_deleted + v_typing_deleted + v_edits_deleted,
    v_execution_time_ms,
    'success'
  );
  
  RETURN QUERY SELECT 
    v_receipts_deleted,
    v_typing_deleted,
    v_edits_deleted,
    v_execution_time_ms;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION cleanup_orphaned_data TO authenticated;

-- Add comment
COMMENT ON FUNCTION cleanup_orphaned_data IS 'Clean up orphaned read receipts, old typing indicators, and old message edits';

-- ============================================================================
-- FUNCTION 3: cleanup_old_storage_files
-- ============================================================================
-- Purpose: Delete storage files older than 90 days
-- Features:
--   - Batch processing
--   - Dry-run mode
--   - Calculates storage freed
--   - Logs operations

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
  v_file_path TEXT;
BEGIN
  IF p_dry_run THEN
    -- Dry run: count files that would be deleted
    SELECT 
      COUNT(*),
      COALESCE(SUM((metadata->>'size')::BIGINT), 0)
    INTO v_deleted_count, v_storage_freed
    FROM storage.objects
    WHERE bucket_id = 'message-attachments'
      AND created_at < NOW() - INTERVAL '90 days'
    LIMIT p_batch_size;
    
    RAISE NOTICE 'DRY RUN: Would delete % files (%.2f MB)', 
      v_deleted_count, 
      v_storage_freed::NUMERIC / 1048576;
  ELSE
    -- Delete old files (batch processing)
    FOR v_file IN (
      SELECT 
        name, 
        COALESCE((metadata->>'size')::BIGINT, 0) as file_size
      FROM storage.objects
      WHERE bucket_id = 'message-attachments'
        AND created_at < NOW() - INTERVAL '90 days'
      ORDER BY created_at ASC
      LIMIT p_batch_size
    )
    LOOP
      -- Delete from storage.objects table
      DELETE FROM storage.objects
      WHERE bucket_id = 'message-attachments'
        AND name = v_file.name;
      
      v_deleted_count := v_deleted_count + 1;
      v_storage_freed := v_storage_freed + v_file.file_size;
    END LOOP;
    
    -- Log the operation
    INSERT INTO cleanup_logs (
      operation,
      records_affected,
      status,
      error_message
    )
    VALUES (
      'cleanup_old_storage_files',
      v_deleted_count,
      'success',
      format('Freed %.2f MB', v_storage_freed::NUMERIC / 1048576)
    );
  END IF;
  
  RETURN QUERY SELECT 
    v_deleted_count,
    (v_storage_freed::NUMERIC / 1048576)::NUMERIC(10,2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION cleanup_old_storage_files TO authenticated;

-- Add comment
COMMENT ON FUNCTION cleanup_old_storage_files IS 'Delete storage files older than 90 days. Supports batch processing and dry-run mode.';

-- ============================================================================
-- FUNCTION 4: get_cleanup_summary
-- ============================================================================
-- Purpose: Get summary of cleanup operations for monitoring dashboard
-- Returns last 30 days of cleanup metrics

CREATE OR REPLACE FUNCTION get_cleanup_summary()
RETURNS TABLE (
  operation TEXT,
  executions BIGINT,
  total_records_affected BIGINT,
  avg_execution_time_ms NUMERIC,
  last_execution TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cl.operation,
    COUNT(*) as executions,
    SUM(cl.records_affected) as total_records_affected,
    ROUND(AVG(cl.execution_time_ms)::NUMERIC, 2) as avg_execution_time_ms,
    MAX(cl.executed_at) as last_execution
  FROM cleanup_logs cl
  WHERE cl.executed_at > NOW() - INTERVAL '30 days'
  GROUP BY cl.operation
  ORDER BY last_execution DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_cleanup_summary TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_cleanup_summary IS 'Get cleanup summary for monitoring dashboard (last 30 days)';

-- ============================================================================
-- FUNCTION 5: cleanup_old_cleanup_logs
-- ============================================================================
-- Purpose: Clean up old cleanup logs (older than 90 days)
-- This function cleans itself!

CREATE OR REPLACE FUNCTION cleanup_old_cleanup_logs()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER := 0;
BEGIN
  WITH deleted_logs AS (
    DELETE FROM cleanup_logs
    WHERE executed_at < NOW() - INTERVAL '90 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO v_deleted_count FROM deleted_logs;
  
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION cleanup_old_cleanup_logs TO authenticated;

-- Add comment
COMMENT ON FUNCTION cleanup_old_cleanup_logs IS 'Clean up old cleanup logs (>90 days). Meta-cleanup!';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these manually to verify migration success:

-- 1. Verify cleanup_logs table exists
-- SELECT * FROM cleanup_logs LIMIT 5;

-- 2. Test archive function (dry-run)
-- SELECT * FROM archive_old_messages(10, true);

-- 3. Test cleanup function
-- SELECT * FROM cleanup_orphaned_data();

-- 4. Test storage cleanup (dry-run)
-- SELECT * FROM cleanup_old_storage_files(10, true);

-- 5. Get cleanup summary
-- SELECT * FROM get_cleanup_summary();

-- 6. Check function permissions
-- SELECT proname, proacl FROM pg_proc WHERE proname LIKE 'archive%' OR proname LIKE 'cleanup%';

-- ============================================================================
-- NOTES
-- ============================================================================
--
-- Retention Policies:
-- - Messages: 90 days before archiving
-- - Read receipts: 7 days after message deletion
-- - Typing indicators: 1 minute (handled by trigger + safety cleanup)
-- - Message edits: 30 days
-- - Storage files: 90 days
-- - Cleanup logs: 90 days
--
-- Execution:
-- - Manual: Call functions directly via SQL
-- - Automated: Use Edge Function with cron (Story 8.1.9)
-- - Monitoring: Use get_cleanup_summary() for dashboard
--
-- Performance:
-- - Batch processing prevents timeouts
-- - SKIP LOCKED prevents blocking during cleanup
-- - Dry-run mode for testing before execution
--
-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
