import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Messaging Cleanup Edge Function
 * 
 * Runs daily at 2 AM UTC to clean up old messaging data:
 * 1. Archive messages older than 90 days
 * 2. Clean up orphaned data (receipts, typing indicators, edits)
 * 3. Delete old storage files
 * 
 * Scheduled via Supabase Cron
 */

interface CleanupResults {
  timestamp: string
  archived_messages: number
  orphaned_receipts_deleted: number
  old_typing_indicators_deleted: number
  old_edits_deleted: number
  storage_files_deleted: number
  storage_freed_mb: number
  execution_time_ms: number
  errors: Array<{
    operation: string
    error: string
  }>
}

serve(async (req) => {
  const startTime = Date.now()
  
  try {
    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables')
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    const results: CleanupResults = {
      timestamp: new Date().toISOString(),
      archived_messages: 0,
      orphaned_receipts_deleted: 0,
      old_typing_indicators_deleted: 0,
      old_edits_deleted: 0,
      storage_files_deleted: 0,
      storage_freed_mb: 0,
      execution_time_ms: 0,
      errors: []
    }
    
    console.log('🧹 Starting messaging cleanup job...')
    
    // ========================================================================
    // Task 1: Archive Old Messages (90+ days)
    // ========================================================================
    try {
      console.log('📦 Archiving old messages...')
      
      const { data: archiveResult, error: archiveError } = await supabase.rpc(
        'archive_old_messages',
        { 
          p_batch_size: 1000, 
          p_dry_run: false 
        }
      )
      
      if (archiveError) throw archiveError
      
      if (archiveResult && archiveResult.length > 0) {
        results.archived_messages = archiveResult[0].messages_archived || 0
        console.log(`✅ Archived ${results.archived_messages} messages`)
      }
    } catch (err) {
      console.error('❌ Archive error:', err)
      results.errors.push({
        operation: 'archive_old_messages',
        error: err instanceof Error ? err.message : String(err)
      })
    }
    
    // ========================================================================
    // Task 2: Clean Up Orphaned Data
    // ========================================================================
    try {
      console.log('🗑️  Cleaning orphaned data...')
      
      const { data: cleanupResult, error: cleanupError } = await supabase.rpc(
        'cleanup_orphaned_data'
      )
      
      if (cleanupError) throw cleanupError
      
      if (cleanupResult && cleanupResult.length > 0) {
        results.orphaned_receipts_deleted = cleanupResult[0].orphaned_receipts_deleted || 0
        results.old_typing_indicators_deleted = cleanupResult[0].old_typing_indicators_deleted || 0
        results.old_edits_deleted = cleanupResult[0].old_edits_deleted || 0
        
        const totalCleaned = 
          results.orphaned_receipts_deleted + 
          results.old_typing_indicators_deleted + 
          results.old_edits_deleted
        
        console.log(`✅ Cleaned ${totalCleaned} orphaned records`)
        console.log(`   - Receipts: ${results.orphaned_receipts_deleted}`)
        console.log(`   - Typing indicators: ${results.old_typing_indicators_deleted}`)
        console.log(`   - Message edits: ${results.old_edits_deleted}`)
      }
    } catch (err) {
      console.error('❌ Cleanup error:', err)
      results.errors.push({
        operation: 'cleanup_orphaned_data',
        error: err instanceof Error ? err.message : String(err)
      })
    }
    
    // ========================================================================
    // Task 3: Clean Up Old Storage Files
    // ========================================================================
    try {
      console.log('📁 Cleaning old storage files...')
      
      const { data: storageResult, error: storageError } = await supabase.rpc(
        'cleanup_orphaned_storage_files',
        { 
          p_batch_size: 100, 
          p_dry_run: false 
        }
      )
      
      if (storageError) throw storageError
      
      if (storageResult && storageResult.length > 0) {
        results.storage_files_deleted = storageResult[0].files_deleted || 0
        results.storage_freed_mb = storageResult[0].storage_freed_mb || 0
        
        console.log(`✅ Deleted ${results.storage_files_deleted} old files`)
        console.log(`   - Storage freed: ${results.storage_freed_mb.toFixed(2)} MB`)
      }
    } catch (err) {
      console.error('❌ Storage cleanup error:', err)
      results.errors.push({
        operation: 'cleanup_orphaned_storage_files',
        error: err instanceof Error ? err.message : String(err)
      })
    }
    
    // ========================================================================
    // Calculate Total Execution Time
    // ========================================================================
    results.execution_time_ms = Date.now() - startTime
    
    // ========================================================================
    // Log Summary
    // ========================================================================
    console.log('\n📊 Cleanup Summary:')
    console.log('='.repeat(60))
    console.log(`Timestamp: ${results.timestamp}`)
    console.log(`Archived Messages: ${results.archived_messages}`)
    console.log(`Orphaned Data Cleaned: ${
      results.orphaned_receipts_deleted + 
      results.old_typing_indicators_deleted + 
      results.old_edits_deleted
    }`)
    console.log(`Storage Files Deleted: ${results.storage_files_deleted}`)
    console.log(`Storage Freed: ${results.storage_freed_mb.toFixed(2)} MB`)
    console.log(`Execution Time: ${results.execution_time_ms}ms`)
    console.log(`Errors: ${results.errors.length}`)
    console.log('='.repeat(60))
    
    if (results.errors.length > 0) {
      console.log('\n⚠️  Errors encountered:')
      results.errors.forEach((err, index) => {
        console.log(`${index + 1}. ${err.operation}: ${err.error}`)
      })
    }
    
    // ========================================================================
    // Return Response
    // ========================================================================
    const statusCode = results.errors.length > 0 ? 207 : 200 // 207 = Multi-Status
    
    return new Response(
      JSON.stringify(results, null, 2),
      {
        status: statusCode,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
    
  } catch (error) {
    console.error('💥 Fatal error:', error)
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
  }
})
