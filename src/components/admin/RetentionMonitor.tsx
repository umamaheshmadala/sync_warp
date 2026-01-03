/**
 * RetentionMonitor Component (Story 8.9.3)
 * 
 * Admin dashboard for monitoring message retention and cleanup operations.
 * 
 * Features:
 * - Real-time message statistics
 * - Cleanup operation history
 * - Manual cleanup trigger with confirmation
 * - Loading and error state handling
 * 
 * Access: Admin role only
 */

import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { Calendar, Trash2, Database, RefreshCw, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import { toast } from 'sonner'

interface CleanupLog {
    id: string
    operation: string
    records_affected: number
    execution_time_ms: number
    status: 'success' | 'partial' | 'failed'
    error_message: string | null
    executed_at: string
}

interface RetentionStats {
    totalMessages: number
    messagesOlderThan90Days: number
    lastCleanupAt: string | null
    isLoading: boolean
    error: string | null
}

export function RetentionMonitor() {
    const { profile } = useAuthStore()
    const [logs, setLogs] = useState<CleanupLog[]>([])
    const [stats, setStats] = useState<RetentionStats>({
        totalMessages: 0,
        messagesOlderThan90Days: 0,
        lastCleanupAt: null,
        isLoading: true,
        error: null
    })
    const [isRunningCleanup, setIsRunningCleanup] = useState(false)
    const [showConfirmDialog, setShowConfirmDialog] = useState(false)

    // Check if user is admin (you may need to adjust this based on your auth structure)
    const isAdmin = profile?.role === 'admin' || profile?.is_admin === true

    const fetchLogs = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('cleanup_logs')
                .select('*')
                .in('operation', ['cleanup_old_messages', 'archive_old_messages'])
                .order('executed_at', { ascending: false })
                .limit(10)

            if (error) throw error
            setLogs(data || [])
        } catch (err) {
            console.error('Failed to fetch cleanup logs:', err)
        }
    }, [])

    const fetchStats = useCallback(async () => {
        setStats(prev => ({ ...prev, isLoading: true, error: null }))

        try {
            // Get total messages (use pg_class estimate for performance)
            const { count: total, error: totalError } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('is_deleted', false)
                .eq('is_archived', false)

            if (totalError) throw totalError

            // Get messages older than 90 days
            const cutoffDate = new Date()
            cutoffDate.setDate(cutoffDate.getDate() - 90)

            const { count: old, error: oldError } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('is_deleted', false)
                .eq('is_archived', false)
                .lt('created_at', cutoffDate.toISOString())

            if (oldError) throw oldError

            // Get last cleanup timestamp
            const { data: lastCleanup } = await supabase
                .from('cleanup_logs')
                .select('executed_at')
                .eq('operation', 'cleanup_old_messages')
                .eq('status', 'success')
                .order('executed_at', { ascending: false })
                .limit(1)

            setStats({
                totalMessages: total || 0,
                messagesOlderThan90Days: old || 0,
                lastCleanupAt: lastCleanup?.[0]?.executed_at || null,
                isLoading: false,
                error: null
            })
        } catch (err) {
            console.error('Failed to fetch stats:', err)
            setStats(prev => ({
                ...prev,
                isLoading: false,
                error: err instanceof Error ? err.message : 'Failed to load statistics'
            }))
        }
    }, [])

    useEffect(() => {
        if (isAdmin) {
            fetchLogs()
            fetchStats()
        }
    }, [isAdmin, fetchLogs, fetchStats])

    const handleManualCleanup = async () => {
        setShowConfirmDialog(false)
        setIsRunningCleanup(true)

        try {
            const { data, error } = await supabase.functions.invoke('cleanup-old-messages')

            if (error) throw error

            toast.success(
                `Cleanup complete! Archived: ${data?.archived_messages || 0} messages, ` +
                `Freed: ${data?.storage_freed_mb?.toFixed(2) || 0} MB`,
                { duration: 5000 }
            )

            // Refresh data
            await Promise.all([fetchLogs(), fetchStats()])
        } catch (error) {
            console.error('Cleanup failed:', error)
            toast.error('Cleanup failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
        } finally {
            setIsRunningCleanup(false)
        }
    }

    // Access denied for non-admins
    if (!isAdmin) {
        return (
            <div className="p-6 bg-white rounded-lg shadow text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-gray-800">Access Denied</h2>
                <p className="text-gray-600 mt-2">You need admin privileges to view this page.</p>
            </div>
        )
    }

    return (
        <div className="p-6 bg-white rounded-lg shadow">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Message Retention Monitor</h2>
                <button
                    onClick={() => Promise.all([fetchLogs(), fetchStats()])}
                    className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
                    title="Refresh"
                >
                    <RefreshCw className="w-5 h-5" />
                </button>
            </div>

            {/* Stats Cards */}
            {stats.error ? (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600">{stats.error}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {/* Total Messages */}
                    <div className="p-4 bg-blue-50 rounded-lg">
                        <Database className="w-6 h-6 text-blue-600 mb-2" />
                        {stats.isLoading ? (
                            <div className="h-8 w-24 bg-blue-100 animate-pulse rounded" />
                        ) : (
                            <div className="text-2xl font-bold text-blue-800">
                                {stats.totalMessages.toLocaleString()}
                            </div>
                        )}
                        <div className="text-sm text-gray-600">Total Active Messages</div>
                    </div>

                    {/* Messages Older Than 90 Days */}
                    <div className="p-4 bg-yellow-50 rounded-lg">
                        <Calendar className="w-6 h-6 text-yellow-600 mb-2" />
                        {stats.isLoading ? (
                            <div className="h-8 w-20 bg-yellow-100 animate-pulse rounded" />
                        ) : (
                            <div className="text-2xl font-bold text-yellow-800">
                                {stats.messagesOlderThan90Days.toLocaleString()}
                            </div>
                        )}
                        <div className="text-sm text-gray-600">Pending Cleanup (90+ days)</div>
                    </div>

                    {/* Manual Cleanup Button */}
                    <div className="p-4 bg-green-50 rounded-lg">
                        <Trash2 className="w-6 h-6 text-green-600 mb-2" />
                        <button
                            onClick={() => setShowConfirmDialog(true)}
                            disabled={isRunningCleanup}
                            className={`
                text-sm px-4 py-2 rounded font-medium transition-colors
                ${isRunningCleanup
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-green-600 text-white hover:bg-green-700'}
              `}
                        >
                            {isRunningCleanup ? 'Running...' : 'Run Cleanup Now'}
                        </button>
                        {stats.lastCleanupAt && (
                            <div className="text-xs text-gray-500 mt-2">
                                Last: {new Date(stats.lastCleanupAt).toLocaleString()}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Cleanup Logs */}
            <h3 className="text-lg font-semibold mb-3 text-gray-800">Cleanup History</h3>
            <div className="space-y-2">
                {logs.length === 0 ? (
                    <div className="text-gray-500 text-center py-4">No cleanup operations recorded yet.</div>
                ) : (
                    logs.map(log => (
                        <div
                            key={log.id}
                            className={`
                border rounded-lg p-3 text-sm
                ${log.status === 'success' ? 'border-green-200 bg-green-50' :
                                    log.status === 'partial' ? 'border-yellow-200 bg-yellow-50' :
                                        'border-red-200 bg-red-50'}
              `}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {log.status === 'success' ? (
                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                    ) : log.status === 'partial' ? (
                                        <AlertCircle className="w-4 h-4 text-yellow-600" />
                                    ) : (
                                        <AlertCircle className="w-4 h-4 text-red-600" />
                                    )}
                                    <span className="font-medium">
                                        {log.records_affected.toLocaleString()} records processed
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-500">
                                    <Clock className="w-3 h-3" />
                                    <span>{log.execution_time_ms}ms</span>
                                    <span>•</span>
                                    <span>{new Date(log.executed_at).toLocaleString()}</span>
                                </div>
                            </div>
                            {log.error_message && (
                                <div className="mt-2 text-xs text-red-600">
                                    Error: {log.error_message}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Confirmation Dialog */}
            {showConfirmDialog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
                        <h3 className="text-lg font-bold mb-2">Confirm Cleanup</h3>
                        <p className="text-gray-600 mb-4">
                            This will archive messages older than 90 days and delete orphaned data.
                            This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConfirmDialog(false)}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleManualCleanup}
                                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                                Run Cleanup
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
