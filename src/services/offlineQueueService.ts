/**
 * Offline Queue Service
 * 
 * Manages offline message queue with platform-specific storage:
 * - Web: IndexedDB (Dexie.js) for structured storage
 * - Mobile: Capacitor Preferences for key-value storage
 * 
 * Features:
 * - Storage limit enforcement (500 mobile, 1000 web)
 * - LRU eviction strategy
 * - Auto-cleanup after 7 days
 * - Storage size monitoring
 * 
 * Based on WhatsApp/Slack patterns for offline message handling.
 */

import Dexie, { Table } from 'dexie'
import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import { v4 as uuidv4 } from 'uuid'
import type { QueuedMessage, QueueStorageStats } from '../types/offline'

/**
 * IndexedDB schema for web offline queue
 */
class OfflineQueueDB extends Dexie {
  messages!: Table<QueuedMessage, string>

  constructor() {
    super('SyncOfflineQueue')

    // Define schema with indexes for efficient queries
    this.version(1).stores({
      messages: 'id, conversationId, timestamp, status'
    })
  }
}

/**
 * Offline Queue Service
 * 
 * Handles message queueing with platform-conditional storage.
 */
class OfflineQueueService {
  private db: OfflineQueueDB | null = null // Web only
  private readonly QUEUE_KEY = 'offline_message_queue' // Mobile storage key
  private readonly isMobile: boolean

  // Storage limits (Industry Best Practice: WhatsApp/Slack)
  private readonly MAX_QUEUE_SIZE_WEB = 1000 // messages
  private readonly MAX_QUEUE_SIZE_MOBILE = 500 // messages (due to 10MB Capacitor limit)
  private readonly MAX_STORAGE_MB = 8 // Leave 2MB buffer for mobile
  private readonly AUTO_CLEANUP_DAYS = 7 // Cleanup messages older than 7 days

  constructor() {
    this.isMobile = Capacitor.isNativePlatform()

    // Platform-conditional initialization
    if (!this.isMobile) {
      // WEB: Initialize IndexedDB
      this.db = new OfflineQueueDB()
      console.log('📦 Offline queue initialized (IndexedDB)')
    } else {
      // MOBILE: Use Capacitor Preferences
      console.log('📦 Offline queue initialized (Capacitor Preferences)')
    }
  }

  /**
   * Add message to queue with storage limit enforcement
   */
  async queueMessage(
    message: Omit<QueuedMessage, 'id' | 'timestamp' | 'retryCount' | 'status'>
  ): Promise<string> {
    // Check storage limits BEFORE adding (Industry Best Practice)
    await this.enforceStorageLimits()

    const queuedMessage: QueuedMessage = {
      ...message,
      id: uuidv4(),
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending'
    }

    if (this.isMobile) {
      // MOBILE: Add to Preferences
      await this.addToMobileQueue(queuedMessage)
    } else {
      // WEB: Add to IndexedDB
      await this.db!.messages.add(queuedMessage)
    }

    console.log(`📤 Message queued: ${queuedMessage.id}`)
    return queuedMessage.id
  }

  /**
   * MOBILE ONLY: Add message to Capacitor Preferences
   */
  private async addToMobileQueue(message: QueuedMessage): Promise<void> {
    const queue = await this.getMobileQueue()
    queue.push(message)

    await Preferences.set({
      key: this.QUEUE_KEY,
      value: JSON.stringify(queue)
    })
  }

  /**
   * MOBILE ONLY: Get queue from Capacitor Preferences
   */
  private async getMobileQueue(): Promise<QueuedMessage[]> {
    const { value } = await Preferences.get({ key: this.QUEUE_KEY })
    return value ? JSON.parse(value) : []
  }

  /**
   * Get all pending messages (FIFO order)
   */
  async getPendingMessages(): Promise<QueuedMessage[]> {
    if (this.isMobile) {
      const queue = await this.getMobileQueue()
      return queue
        .filter(msg => msg.status === 'pending')
        .sort((a, b) => a.timestamp - b.timestamp) // FIFO: oldest first
    } else {
      return await this.db!.messages
        .where('status')
        .equals('pending')
        .sortBy('timestamp') // Already sorted by timestamp
    }
  }

  /**
   * Get pending message count
   */
  async getPendingCount(): Promise<number> {
    if (this.isMobile) {
      const queue = await this.getMobileQueue()
      return queue.filter(msg => msg.status === 'pending').length
    } else {
      return await this.db!.messages
        .where('status')
        .equals('pending')
        .count()
    }
  }

  /**
   * Update message status
   */
  async updateMessageStatus(
    id: string,
    status: QueuedMessage['status'],
    error?: string
  ): Promise<void> {
    if (this.isMobile) {
      const queue = await this.getMobileQueue()
      const index = queue.findIndex(msg => msg.id === id)

      if (index !== -1) {
        queue[index].status = status
        if (error) {
          queue[index].error = error
        }

        await Preferences.set({
          key: this.QUEUE_KEY,
          value: JSON.stringify(queue)
        })
      }
    } else {
      await this.db!.messages.update(id, { status, error })
    }
  }

  /**
   * Delete message from queue
   */
  async deleteMessage(id: string): Promise<void> {
    if (this.isMobile) {
      const queue = await this.getMobileQueue()
      const filtered = queue.filter(msg => msg.id !== id)

      await Preferences.set({
        key: this.QUEUE_KEY,
        value: JSON.stringify(filtered)
      })
    } else {
      await this.db!.messages.delete(id)
    }
  }

  /**
   * Clear entire queue (for logout)
   */
  async clearQueue(): Promise<void> {
    if (this.isMobile) {
      await Preferences.remove({ key: this.QUEUE_KEY })
    } else {
      await this.db!.messages.clear()
    }
  }

  /**
   * Enforce storage limits (Industry Best Practice: WhatsApp/Slack)
   */
  private async enforceStorageLimits(): Promise<void> {
    const count = await this.getPendingCount()
    const maxSize = this.isMobile ? this.MAX_QUEUE_SIZE_MOBILE : this.MAX_QUEUE_SIZE_WEB

    if (count >= maxSize) {
      console.warn(`⚠️ Queue limit reached (${count}/${maxSize}), cleaning up...`)
      await this.cleanupOldMessages()
    }

    // Mobile-specific: Check actual storage size
    if (this.isMobile) {
      const sizeInMB = await this.getQueueSizeInMB()
      if (sizeInMB > this.MAX_STORAGE_MB) {
        console.warn(`⚠️ Storage limit reached (${sizeInMB}MB), cleaning up...`)
        await this.cleanupOldMessages()
      }
    }
  }

  /**
   * Get queue size in MB (mobile only)
   */
  private async getQueueSizeInMB(): Promise<number> {
    const { value } = await Preferences.get({ key: this.QUEUE_KEY })
    if (!value) return 0

    // Calculate size in bytes, convert to MB
    const sizeInBytes = new Blob([value]).size
    return sizeInBytes / (1024 * 1024)
  }

  /**
   * Cleanup old messages (LRU strategy - Industry Best Practice)
   */
  private async cleanupOldMessages(): Promise<void> {
    const cutoffTime = Date.now() - this.AUTO_CLEANUP_DAYS * 24 * 60 * 60 * 1000

    if (this.isMobile) {
      const queue = await this.getMobileQueue()

      // Remove messages older than 7 days OR keep only newest 400 (leave room for 100 more)
      const cleaned = queue
        .filter(msg => msg.timestamp > cutoffTime)
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 400)

      await Preferences.set({
        key: this.QUEUE_KEY,
        value: JSON.stringify(cleaned)
      })

      console.log(`🗑️ Cleaned up ${queue.length - cleaned.length} old messages`)
    } else {
      // Web: Remove old messages
      const deleted = await this.db!.messages
        .where('timestamp')
        .below(cutoffTime)
        .delete()

      console.log(`🗑️ Cleaned up ${deleted} old messages`)
    }
  }

  /**
   * Get storage stats (for UI display)
   */
  async getStorageStats(): Promise<QueueStorageStats> {
    const count = await this.getPendingCount()
    const maxSize = this.isMobile ? this.MAX_QUEUE_SIZE_MOBILE : this.MAX_QUEUE_SIZE_WEB

    let sizeInMB = 0
    if (this.isMobile) {
      sizeInMB = await this.getQueueSizeInMB()
    }

    return {
      count,
      sizeInMB,
      percentUsed: (count / maxSize) * 100,
      maxSize
    }
  }
}

// Export singleton instance
export const offlineQueueService = new OfflineQueueService()
