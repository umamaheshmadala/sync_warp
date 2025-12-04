/**
 * Enhanced Offline Indicator Component
 * 
 * Features (Story 8.4.6):
 * - Offline status banner
 * - Sync progress tracking
 * - Pending message count
 * - Retry buttons for failed messages
 * - Progress bar for large batches
 * - Accessibility (ARIA, screen readers, keyboard nav)
 * - Auto-dismiss on mobile (5s)
 * - Minimal badge when dismissed
 * 
 * Industry Best Practices:
 * - Slack: Screen reader announcements
 * - Discord: Progress bar for large batches
 * - Telegram: Auto-hide on mobile
 */

import React, { useEffect, useState } from 'react'
import { WifiOff, RefreshCw, AlertCircle, X } from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import { offlineQueueService } from '../../services/offlineQueueService'
import { networkService } from '../../services/networkService'

interface SyncProgress {
  success: number
  failed: number
}

export function OfflineIndicatorEnhanced() {
  const [isOffline, setIsOffline] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle')
  const [syncProgress, setSyncProgress] = useState<SyncProgress>({ success: 0, failed: 0 })
  const [isAnnounced, setIsAnnounced] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const isMobile = Capacitor.isNativePlatform()

  // Initialize network monitoring
  useEffect(() => {
    const initializeServices = async () => {
      // Get initial status
      const status = await networkService.getStatus()
      setIsOffline(!status.isOnline)

      // Subscribe to network changes
      const unsubscribe = networkService.onNetworkChange(async (isOnline) => {
        setIsOffline(!isOnline)

        // Auto-sync when coming back online
        if (isOnline) {
          await handleSync()
        }
      })

      // Update pending count
      await updatePendingCount()

      return unsubscribe
    }

    const cleanup = initializeServices()

    return () => {
      cleanup.then(fn => fn())
    }
  }, [])

  // Announce status changes to screen readers (Industry Best Practice: Slack)
  useEffect(() => {
    if (isOffline && !isAnnounced) {
      setIsAnnounced(true)
    } else if (!isOffline && isAnnounced) {
      setIsAnnounced(false)
    }
  }, [isOffline, isAnnounced])

  // Auto-hide on mobile after 5 seconds (Industry Best Practice: Telegram)
  useEffect(() => {
    if (isMobile && !isOffline && pendingCount > 0) {
      const timer = setTimeout(() => {
        setIsDismissed(true)
      }, 5000)

      return () => clearTimeout(timer)
    }
  }, [isOffline, pendingCount, isMobile])

  const updatePendingCount = async () => {
    const count = await offlineQueueService.getPendingCount()
    setPendingCount(count)
  }

  const handleSync = async () => {
    setSyncStatus('syncing')
    setSyncProgress({ success: 0, failed: 0 })

    try {
      const result = await offlineQueueService.syncPendingMessages()
      setSyncProgress(result)

      if (result.failed > 0) {
        setSyncStatus('error')
      } else {
        setSyncStatus('idle')
      }

      await updatePendingCount()
    } catch (error) {
      console.error('Sync failed:', error)
      setSyncStatus('error')
    }
  }

  const handleRetryFailed = async () => {
    await offlineQueueService.retryAllFailed()
    await updatePendingCount()
  }

  // Don't show if online and no pending messages
  if (!isOffline && pendingCount === 0 && syncStatus === 'idle') {
    return null
  }

  // Show minimal badge if dismissed on mobile
  if (isDismissed && isMobile) {
    return (
      <button
        onClick={() => setIsDismissed(false)}
        className="fixed bottom-20 right-4 bg-blue-500 text-white rounded-full px-3 py-1 text-xs shadow-lg z-50"
        aria-label={`${pendingCount} messages pending. Tap to show details.`}
      >
        {pendingCount} pending
      </button>
    )
  }

  const totalMessages = syncProgress.success + syncProgress.failed + pendingCount
  const showProgressBar = totalMessages > 20

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={`border-b px-4 py-3 relative ${
        isOffline ? 'bg-yellow-50 border-yellow-200' :
        syncStatus === 'error' ? 'bg-red-50 border-red-200' :
        'bg-blue-50 border-blue-200'
      }`}
    >
      {/* Screen reader announcement */}
      <span className="sr-only">
        {isOffline
          ? `You are offline. ${pendingCount} messages will be sent when back online.`
          : syncStatus === 'syncing'
          ? `Syncing ${pendingCount} pending messages.`
          : syncStatus === 'error'
          ? `Sync failed for ${syncProgress.failed} messages.`
          : `${pendingCount} messages pending.`
        }
      </span>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          {/* Icon */}
          {isOffline ? (
            <WifiOff
              className="w-5 h-5 text-yellow-600"
              aria-hidden="true"
            />
          ) : syncStatus === 'syncing' ? (
            <RefreshCw
              className="w-5 h-5 text-blue-600 animate-spin"
              aria-hidden="true"
            />
          ) : syncStatus === 'error' ? (
            <AlertCircle
              className="w-5 h-5 text-red-600"
              aria-hidden="true"
            />
          ) : (
            <RefreshCw
              className="w-5 h-5 text-blue-600"
              aria-hidden="true"
            />
          )}

          {/* Message */}
          <div className="flex-1">
            {isOffline ? (
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  You're offline
                </p>
                <p className="text-xs text-yellow-600">
                  {pendingCount} message{pendingCount !== 1 ? 's' : ''} will be sent when back online
                </p>
              </div>
            ) : syncStatus === 'syncing' ? (
              <div>
                <p className="text-sm font-medium text-blue-800">
                  Syncing messages...
                </p>
                <p className="text-xs text-blue-600">
                  {syncProgress.success} sent, {pendingCount} remaining
                </p>
              </div>
            ) : syncStatus === 'error' ? (
              <div>
                <p className="text-sm font-medium text-red-800">
                  Sync failed
                </p>
                <p className="text-xs text-red-600">
                  {syncProgress.failed} message{syncProgress.failed !== 1 ? 's' : ''} failed to send
                </p>
              </div>
            ) : (
              <p className="text-sm font-medium text-blue-800">
                {pendingCount} pending message{pendingCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {!isOffline && (
            <>
              {syncStatus === 'error' && (
                <button
                  onClick={handleRetryFailed}
                  className="px-3 py-1 text-xs bg-white border border-red-300 rounded hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                  aria-label="Retry failed messages"
                >
                  Retry Failed
                </button>
              )}

              {pendingCount > 0 && syncStatus !== 'syncing' && (
                <button
                  onClick={handleSync}
                  disabled={syncStatus === 'syncing'}
                  className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Sync pending messages now"
                >
                  Sync Now
                </button>
              )}
            </>
          )}

          {/* Dismiss button (mobile only) */}
          {isMobile && (
            <button
              onClick={() => setIsDismissed(true)}
              className="p-1 hover:bg-black/10 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Progress bar for large batches (Industry Best Practice: Discord) */}
      {showProgressBar && syncStatus === 'syncing' && (
        <div className="mt-2">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
            <span>Syncing messages...</span>
            <span>{Math.round((syncProgress.success / totalMessages) * 100)}%</span>
          </div>

          <div
            className="w-full bg-gray-200 rounded-full h-2"
            role="progressbar"
            aria-valuenow={syncProgress.success}
            aria-valuemin={0}
            aria-valuemax={totalMessages}
            aria-label={`Syncing progress: ${syncProgress.success} of ${totalMessages} messages`}
          >
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(syncProgress.success / totalMessages) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
