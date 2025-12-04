/**
 * Message Cache Service
 * 
 * Caches messages and conversations for faster app loading and offline access.
 * 
 * Features:
 * - Cache last 50 conversations
 * - Cache last 200 messages per conversation
 * - Platform-specific storage (IndexedDB for web, Preferences for mobile)
 * - Instant load from cache on app startup
 * - Background sync for fresh data
 * - Auto-cleanup on logout
 * 
 * Performance Targets:
 * - Cache load time: < 500ms
 * - Cache write time: < 1s
 * - Cache hit rate: > 90%
 */

import Dexie, { Table } from 'dexie'
import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

// Simplified types (will match actual types when integrated)
interface Conversation {
  id: string
  lastMessageTimestamp?: number
  [key: string]: any
}

interface Message {
  id: string
  conversationId: string
  createdAt: string
  [key: string]: any
}

/**
 * IndexedDB schema for web message cache
 */
class MessageCacheDB extends Dexie {
  conversations!: Table<Conversation, string>
  messages!: Table<Message, string>

  constructor() {
    super('SyncMessageCache')
    this.version(1).stores({
      conversations: 'id, lastMessageTimestamp',
      messages: 'id, conversationId, createdAt'
    })
  }
}

class MessageCacheService {
  private db: MessageCacheDB | null = null
  private isMobile: boolean
  private readonly CONV_CACHE_KEY = 'cached_conversations'
  private readonly MSG_CACHE_PREFIX = 'cached_messages_'
  private readonly CACHE_INDEX_KEY = 'cached_conversation_ids'
  
  // Cache limits
  private readonly MAX_CONVERSATIONS = 50
  private readonly MAX_MESSAGES_PER_CONVERSATION = 200

  constructor() {
    this.isMobile = Capacitor.isNativePlatform()

    if (!this.isMobile) {
      this.db = new MessageCacheDB()
      console.log('💾 Message cache initialized (IndexedDB)')
    } else {
      console.log('💾 Message cache initialized (Capacitor Preferences)')
    }
  }

  /**
   * Cache conversations
   */
  async cacheConversations(conversations: Conversation[]): Promise<void> {
    const toCache = conversations.slice(0, this.MAX_CONVERSATIONS)

    if (this.isMobile) {
      await Preferences.set({
        key: this.CONV_CACHE_KEY,
        value: JSON.stringify(toCache)
      })
    } else {
      // Clear old conversations
      await this.db!.conversations.clear()
      // Add new conversations
      await this.db!.conversations.bulkPut(toCache)
    }

    console.log(`💾 Cached ${toCache.length} conversations`)
  }

  /**
   * Get cached conversations
   */
  async getCachedConversations(): Promise<Conversation[]> {
    try {
      if (this.isMobile) {
        const { value } = await Preferences.get({ key: this.CONV_CACHE_KEY })
        return value ? JSON.parse(value) : []
      } else {
        return await this.db!.conversations
          .orderBy('lastMessageTimestamp')
          .reverse()
          .toArray()
      }
    } catch (error) {
      console.error('Failed to get cached conversations:', error)
      return []
    }
  }

  /**
   * Cache messages for a conversation
   */
  async cacheMessages(
    conversationId: string,
    messages: Message[]
  ): Promise<void> {
    const toCache = messages.slice(0, this.MAX_MESSAGES_PER_CONVERSATION)

    if (this.isMobile) {
      // Save messages
      await Preferences.set({
        key: `${this.MSG_CACHE_PREFIX}${conversationId}`,
        value: JSON.stringify(toCache)
      })

      // Update cache index
      await this.updateCacheIndex(conversationId)
    } else {
      // Clear old messages for this conversation
      await this.db!.messages
        .where('conversationId')
        .equals(conversationId)
        .delete()

      // Add new messages
      await this.db!.messages.bulkPut(toCache)
    }

    console.log(`💾 Cached ${toCache.length} messages for ${conversationId}`)
  }

  /**
   * Get cached messages for a conversation
   */
  async getCachedMessages(conversationId: string): Promise<Message[]> {
    try {
      if (this.isMobile) {
        const { value } = await Preferences.get({
          key: `${this.MSG_CACHE_PREFIX}${conversationId}`
        })
        return value ? JSON.parse(value) : []
      } else {
        return await this.db!.messages
          .where('conversationId')
          .equals(conversationId)
          .reverse()
          .sortBy('createdAt')
      }
    } catch (error) {
      console.error(`Failed to get cached messages for ${conversationId}:`, error)
      return []
    }
  }

  /**
   * Update cache index (mobile only)
   * Keeps track of which conversations have cached messages
   */
  private async updateCacheIndex(conversationId: string): Promise<void> {
    const { value } = await Preferences.get({ key: this.CACHE_INDEX_KEY })
    const index = value ? JSON.parse(value) : []

    if (!index.includes(conversationId)) {
      index.push(conversationId)
      await Preferences.set({
        key: this.CACHE_INDEX_KEY,
        value: JSON.stringify(index)
      })
    }
  }

  /**
   * Clear cache for a specific conversation
   */
  async clearConversationCache(conversationId: string): Promise<void> {
    if (this.isMobile) {
      await Preferences.remove({
        key: `${this.MSG_CACHE_PREFIX}${conversationId}`
      })

      // Update index
      const { value } = await Preferences.get({ key: this.CACHE_INDEX_KEY })
      if (value) {
        const index = JSON.parse(value)
        const filtered = index.filter((id: string) => id !== conversationId)
        await Preferences.set({
          key: this.CACHE_INDEX_KEY,
          value: JSON.stringify(filtered)
        })
      }
    } else {
      await this.db!.messages
        .where('conversationId')
        .equals(conversationId)
        .delete()
    }

    console.log(`🗑️ Cleared cache for conversation ${conversationId}`)
  }

  /**
   * Clear all cache (on logout)
   */
  async clearCache(): Promise<void> {
    if (this.isMobile) {
      // Clear conversations
      await Preferences.remove({ key: this.CONV_CACHE_KEY })

      // Clear all message caches using index
      const { value } = await Preferences.get({ key: this.CACHE_INDEX_KEY })
      if (value) {
        const index = JSON.parse(value)
        for (const conversationId of index) {
          await Preferences.remove({
            key: `${this.MSG_CACHE_PREFIX}${conversationId}`
          })
        }
      }

      // Clear index
      await Preferences.remove({ key: this.CACHE_INDEX_KEY })
    } else {
      await this.db!.conversations.clear()
      await this.db!.messages.clear()
    }

    console.log('🗑️ All cache cleared')
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    conversationCount: number
    messageCount: number
    estimatedSizeKB: number
  }> {
    if (this.isMobile) {
      const { value: convValue } = await Preferences.get({ key: this.CONV_CACHE_KEY })
      const { value: indexValue } = await Preferences.get({ key: this.CACHE_INDEX_KEY })
      
      const conversationCount = convValue ? JSON.parse(convValue).length : 0
      const cachedConversations = indexValue ? JSON.parse(indexValue).length : 0
      
      // Estimate size (rough calculation)
      const convSize = convValue ? new Blob([convValue]).size : 0
      let msgSize = 0
      
      if (indexValue) {
        const index = JSON.parse(indexValue)
        for (const conversationId of index) {
          const { value } = await Preferences.get({
            key: `${this.MSG_CACHE_PREFIX}${conversationId}`
          })
          if (value) {
            msgSize += new Blob([value]).size
          }
        }
      }

      return {
        conversationCount,
        messageCount: cachedConversations,
        estimatedSizeKB: Math.round((convSize + msgSize) / 1024)
      }
    } else {
      const conversationCount = await this.db!.conversations.count()
      const messageCount = await this.db!.messages.count()

      return {
        conversationCount,
        messageCount,
        estimatedSizeKB: 0 // IndexedDB doesn't easily provide size
      }
    }
  }
}

export const messageCacheService = new MessageCacheService()
