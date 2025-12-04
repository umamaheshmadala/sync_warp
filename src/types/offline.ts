/**
 * Offline Queue Types
 * 
 * Type definitions for the offline message queue system.
 * Supports both web (IndexedDB) and mobile (Capacitor Preferences) platforms.
 */

export interface QueuedMessage {
  /** Unique local UUID for the queued message */
  id: string
  
  /** Target conversation ID */
  conversationId: string
  
  /** Message content/text */
  content: string
  
  /** Message type */
  type: 'text' | 'image' | 'video' | 'link'
  
  /** Optional media URLs (for images/videos) */
  mediaUrls?: string[]
  
  /** Optional thumbnail URL (for videos) */
  thumbnailUrl?: string
  
  /** Optional link preview data */
  linkPreview?: {
    url: string
    title?: string
    description?: string
    imageUrl?: string
  }
  
  /** Timestamp when message was queued (milliseconds) */
  timestamp: number
  
  /** Number of retry attempts */
  retryCount: number
  
  /** Current status of the queued message */
  status: 'pending' | 'syncing' | 'failed'
  
  /** Error message if status is 'failed' */
  error?: string
}

/**
 * Storage statistics for the offline queue
 */
export interface QueueStorageStats {
  /** Number of messages in queue */
  count: number
  
  /** Size in megabytes (mobile only) */
  sizeInMB: number
  
  /** Percentage of max capacity used */
  percentUsed: number
  
  /** Maximum queue size for current platform */
  maxSize: number
}
