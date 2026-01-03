/**
 * Message Deduplication Utilities
 * 
 * Provides client-side deduplication logic for messages to handle:
 * - Timestamp conflicts
 * - Duplicate content detection
 * - Rapid offline/online transitions
 * 
 * Industry Best Practices:
 * - WhatsApp: Content + timestamp window deduplication
 * - Slack: Idempotency keys + client-side tracking
 * - Telegram: Server-side unique constraints
 */

export interface Message {
  id: string
  conversation_id: string
  content: string
  created_at: string
  idempotency_key?: string
  [key: string]: any
}

/**
 * Deduplicate messages by content and timestamp
 * 
 * Uses a 1-second time window to detect duplicates that may have
 * slightly different timestamps due to clock skew or rapid sends.
 * 
 * @param messages - Array of messages to deduplicate
 * @returns Deduplicated array of messages
 */
export function deduplicateMessages(messages: Message[]): Message[] {
  const seen = new Map<string, Message>()

  for (const msg of messages) {
    // Create dedup key from content + conversation + approximate time
    // Using 1-second window to handle clock skew
    const timeWindow = Math.floor(new Date(msg.created_at).getTime() / 1000)
    const dedupKey = `${msg.conversation_id}:${msg.content}:${timeWindow}`

    const existing = seen.get(dedupKey)

    if (!existing) {
      seen.set(dedupKey, msg)
    } else {
      // Keep the one with earlier timestamp (first one wins)
      if (new Date(msg.created_at) < new Date(existing.created_at)) {
        seen.set(dedupKey, msg)
      }
    }
  }

  return Array.from(seen.values())
}

/**
 * Deduplicate messages by idempotency key
 * 
 * More reliable than content-based deduplication when idempotency keys
 * are available (from offline queue).
 * 
 * @param messages - Array of messages to deduplicate
 * @returns Deduplicated array of messages
 */
export function deduplicateByIdempotencyKey(messages: Message[]): Message[] {
  const seen = new Map<string, Message>()

  for (const msg of messages) {
    if (msg.idempotency_key) {
      const existing = seen.get(msg.idempotency_key)

      if (!existing) {
        seen.set(msg.idempotency_key, msg)
      } else {
        // Keep the one with earlier timestamp
        if (new Date(msg.created_at) < new Date(existing.created_at)) {
          seen.set(msg.idempotency_key, msg)
        }
      }
    } else {
      // No idempotency key, keep as-is (use message ID as key)
      seen.set(msg.id, msg)
    }
  }

  return Array.from(seen.values())
}

/**
 * Deduplicate messages by ID
 * 
 * Simple deduplication by message ID. Useful for merging multiple
 * message arrays (e.g., cached + fresh data).
 * 
 * @param messages - Array of messages to deduplicate
 * @returns Deduplicated array of messages
 */
export function deduplicateById(messages: Message[]): Message[] {
  const seen = new Map<string, Message>()

  for (const msg of messages) {
    if (!seen.has(msg.id)) {
      seen.set(msg.id, msg)
    }
  }

  return Array.from(seen.values())
}

/**
 * Merge and deduplicate message arrays
 * 
 * Combines multiple message arrays and removes duplicates.
 * Useful for merging cached messages with fresh data.
 * 
 * Priority: Fresh data > Cached data (keeps newer version)
 * 
 * @param arrays - Arrays of messages to merge
 * @returns Merged and deduplicated array
 */
export function mergeAndDeduplicate(...arrays: Message[][]): Message[] {
  const allMessages = arrays.flat()
  
  // First deduplicate by ID
  const byId = deduplicateById(allMessages)
  
  // Then deduplicate by idempotency key (if available)
  const byIdempotencyKey = deduplicateByIdempotencyKey(byId)
  
  // Finally deduplicate by content + timestamp
  return deduplicateMessages(byIdempotencyKey)
}

/**
 * Check if two messages are duplicates
 * 
 * @param msg1 - First message
 * @param msg2 - Second message
 * @returns True if messages are duplicates
 */
export function areDuplicates(msg1: Message, msg2: Message): boolean {
  // Same ID = duplicate
  if (msg1.id === msg2.id) return true
  
  // Same idempotency key = duplicate
  if (msg1.idempotency_key && msg2.idempotency_key && 
      msg1.idempotency_key === msg2.idempotency_key) {
    return true
  }
  
  // Same content + conversation + similar timestamp = duplicate
  if (msg1.conversation_id === msg2.conversation_id &&
      msg1.content === msg2.content) {
    const time1 = new Date(msg1.created_at).getTime()
    const time2 = new Date(msg2.created_at).getTime()
    const timeDiff = Math.abs(time1 - time2)
    
    // Within 1 second = duplicate
    if (timeDiff < 1000) {
      return true
    }
  }
  
  return false
}
