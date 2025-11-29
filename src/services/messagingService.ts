// src/services/messagingService.ts
// Enhanced messaging service layer with platform-specific network handling
// Story: 8.2.1 - Messaging Service Layer

import { supabase } from '../lib/supabase';
import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';
import type {
  Message,
  Conversation,
  ConversationWithDetails,
  SendMessageParams,
  FetchMessagesResponse,
  MessageReadReceipt,
  UnsubscribeFunction
} from '../types/messaging';

// Re-export types for backward compatibility
export type {
  Message,
  Conversation,
  ConversationWithDetails,
  SendMessageParams,
  FetchMessagesResponse,
  MessageReadReceipt,
  UnsubscribeFunction
} from '../types/messaging';

// ============================================================================
// MessagingService Class
// ============================================================================

/**
 * Enhanced messaging service with platform-specific network handling
 * 
 * Features:
 * - Adaptive timeouts (60s mobile, 30s web)
 * - Retry logic with exponential backoff for mobile
 * - Network status monitoring
 * - Cursor-based pagination
 * - Platform-specific error messages
 */
class MessagingService {
  private isOnline: boolean = true;
  private networkListener?: any;

  /**
   * Initialize the service and setup network monitoring for mobile
   */
  async init(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      try {
        // Listen to network status changes
        this.networkListener = await Network.addListener('networkStatusChange', status => {
          this.isOnline = status.connected;
          console.log('📡 Network status:', status.connected ? 'Online' : 'Offline');
        });
        
        // Get initial status
        const status = await Network.getStatus();
        this.isOnline = status.connected;
        console.log('📡 Initial network status:', this.isOnline ? 'Online' : 'Offline');
      } catch (error) {
        console.warn('⚠️ Network monitoring unavailable:', error);
      }
    }
  }

  /**
   * Cleanup network listeners
   */
  async cleanup(): Promise<void> {
    if (this.networkListener) {
      await this.networkListener.remove();
    }
  }

  /**
   * Get platform-appropriate timeout
   * Mobile: 60 seconds (slower networks, 3G/4G)
   * Web: 30 seconds
   */
  private getTimeout(): number {
    return Capacitor.isNativePlatform() ? 60000 : 30000;
  }

  /**
   * Get user-friendly error message based on platform
   */
  private getErrorMessage(error: any): string {
    const platform = Capacitor.getPlatform(); // 'web', 'ios', 'android'
    
    if (error.message?.includes('timeout')) {
      if (platform === 'ios' || platform === 'android') {
        return 'Poor connection. Please check your network and try again.';
      }
      return 'Request timed out. Please try again.';
    }
    
    if (error.message?.includes('network')) {
      if (platform === 'ios' || platform === 'android') {
        return 'Connection lost. Make sure you have WiFi or mobile data enabled.';
      }
      return 'Network error. Please check your connection.';
    }
    
    return error.message || 'An unexpected error occurred';
  }

  /**
   * Retry operation with exponential backoff (mobile only)
   * Mobile networks are less reliable due to WiFi ↔ Cellular switching
   */
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    const isMobile = Capacitor.isNativePlatform();
    const retries = isMobile ? maxRetries : 1; // Only retry on mobile
    
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        const isNetworkError = error.message?.includes('network') || 
                              error.message?.includes('timeout');
        
        if (isNetworkError && attempt < retries - 1) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`🔄 Retry attempt ${attempt + 1}/${retries} after ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw error;
        }
      }
    }
    throw new Error('Max retries exceeded');
  }

  // ============================================================================
  // Conversation Management
  // ============================================================================

  /**
   * Create or get existing 1:1 conversation
   * 
   * @param friendId - Friend's user ID
   * @returns Conversation ID
   */
  async createOrGetConversation(friendId: string): Promise<string> {
    return this.retryWithBackoff(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.getTimeout());
      
      try {
        if (!this.isOnline && Capacitor.isNativePlatform()) {
          throw new Error('No internet connection. Please check your network.');
        }

        console.log('🔄 Creating/getting conversation with:', friendId);
        
        const { data, error } = await supabase
          .rpc('create_or_get_conversation', { p_participant_id: friendId })
          .abortSignal(controller.signal);
        
        if (error) throw error;
        
        console.log('✅ Conversation ID:', data);
        return data as string;
      } catch (error: any) {
        if (error.name === 'AbortError') {
          throw new Error('Request timed out. Please check your connection.');
        }
        console.error('❌ Error creating conversation:', error);
        throw new Error(this.getErrorMessage(error));
      } finally {
        clearTimeout(timeoutId);
      }
    });
  }

  // ============================================================================
  // Message Sending
  // ============================================================================

  /**
   * Send a message with retry logic
   * 
   * @param params - Message parameters
   * @returns Message ID
   */
  async sendMessage(params: SendMessageParams): Promise<string> {
    return this.retryWithBackoff(async () => {
      if (!this.isOnline && Capacitor.isNativePlatform()) {
        throw new Error('No internet connection. Message will be sent when online.');
      }

      const { data, error } = await supabase.rpc('send_message', {
        p_conversation_id: params.conversationId,
        p_content: params.content,
        p_type: params.type || 'text',
        p_media_urls: params.mediaUrls || null,
        p_thumbnail_url: params.thumbnailUrl || null,
        p_link_preview: params.linkPreview || null,
        p_shared_coupon_id: params.sharedCouponId || null,
        p_shared_deal_id: params.sharedDealId || null,
        p_reply_to_id: params.replyToId || null
      });
      
      if (error) throw error;
      
      console.log('✅ Message sent:', data);
      return data as string;
    });
  }

  // ============================================================================
  // Message Fetching with Pagination
  // ============================================================================

  /**
   * Fetch messages with cursor-based pagination
   * 
   * @param conversationId - Conversation UUID
   * @param limit - Max messages to fetch (default 50)
   * @param beforeMessageId - Cursor for pagination (fetch messages before this ID)
   * @returns Messages array with hasMore flag
   */
  async fetchMessages(
    conversationId: string,
    limit: number = 50,
    beforeMessageId?: string
  ): Promise<FetchMessagesResponse> {
    try {
      let query = supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(limit + 1); // Fetch one extra to check hasMore
      
      // Cursor-based pagination
      if (beforeMessageId) {
        const { data: cursorMsg } = await supabase
          .from('messages')
          .select('created_at')
          .eq('id', beforeMessageId)
          .single();
        
        if (cursorMsg) {
          query = query.lt('created_at', cursorMsg.created_at);
        }
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      const hasMore = (data?.length || 0) > limit;
      const messages = (data?.slice(0, limit) || []).reverse(); // Reverse for chronological order
      
      return { messages, hasMore };
    } catch (error) {
      console.error('❌ Error fetching messages:', error);
      throw error;
    }
  }

  /**
   * Fetch conversations list with participant details
   * 
   * @returns Array of conversations with details
   */
  async fetchConversations(): Promise<ConversationWithDetails[]> {
    try {
      const { data, error } = await supabase
        .from('conversation_list')
        .select('*')
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map((conv: any) => ({
        ...conv,
        participant1_id: conv.participants?.[0],
        participant2_id: conv.participants?.[1]
      }));
    } catch (error) {
      console.error('❌ Error fetching conversations:', error);
      throw error;
    }
  }

  // ============================================================================
  // Read Receipts
  // ============================================================================

  /**
   * Mark a single message as read
   * 
   * @param messageId - Message UUID
   */
  async markMessageAsRead(messageId: string): Promise<void> {
    try {
      const { error } = await supabase
        .rpc('mark_message_as_read', { p_message_id: messageId });
      
      if (error) throw error;
    } catch (error) {
      console.error('❌ Error marking message as read:', error);
      // Don't throw - read receipts are non-critical
    }
  }

  /**
   * Mark all unread messages in a conversation as read
   * 
   * @param conversationId - Conversation UUID
   */
  async markConversationAsRead(conversationId: string): Promise<void> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Get unread messages in this conversation
      const { data: unreadMessages } = await supabase
        .from('messages')
        .select('id')
        .eq('conversation_id', conversationId)
        .eq('is_deleted', false)
        .neq('sender_id', user.user.id);
      
      // Mark each as read (batch operation)
      if (unreadMessages && unreadMessages.length > 0) {
        await Promise.all(
          unreadMessages.map(msg => this.markMessageAsRead(msg.id))
        );
      }
    } catch (error) {
      console.error('❌ Error marking conversation as read:', error);
    }
  }

  /**
   * Get total unread message count for current user
   * 
   * @returns Unread count
   */
  async getUnreadCount(): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('get_unread_message_count');
      
      if (error) throw error;
      
      return data as number;
    } catch (error) {
      console.error('❌ Error getting unread count:', error);
      return 0;
    }
  }

  // ============================================================================
  // Message Editing & Deletion
  // ============================================================================

  /**
   * Soft delete a message
   * 
   * @param messageId - Message UUID
   */
  async deleteMessage(messageId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ 
          is_deleted: true, 
          deleted_at: new Date().toISOString() 
        })
        .eq('id', messageId);
      
      if (error) throw error;
    } catch (error) {
      console.error('❌ Error deleting message:', error);
      throw error;
    }
  }

  /**
   * Edit a message
   * 
   * @param messageId - Message UUID
   * @param newContent - Updated message content
   */
  async editMessage(messageId: string, newContent: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ 
          content: newContent,
          is_edited: true,
          edited_at: new Date().toISOString()
        })
        .eq('id', messageId);
      
      if (error) throw error;
    } catch (error) {
      console.error('❌ Error editing message:', error);
      throw error;
    }
  }

  // ============================================================================
  // Realtime Subscriptions
  // ============================================================================

  /**
   * Subscribe to new messages in a conversation
   * 
   * @param conversationId - Conversation UUID
   * @param onMessage - Callback when new message arrives
   * @returns Unsubscribe function
   */
  subscribeToMessages(
    conversationId: string,
    onMessage: (message: Message) => void
  ): UnsubscribeFunction {
    const subscription = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          onMessage(payload.new as Message);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }

  /**
   * Subscribe to conversation updates
   * 
   * @param onUpdate - Callback when conversation updates
   * @returns Unsubscribe function
   */
  subscribeToConversations(
    onUpdate: (conversation: Conversation) => void
  ): UnsubscribeFunction {
    const subscription = supabase
      .channel('conversations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations'
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            onUpdate(payload.new as Conversation);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }

  /**
   * Subscribe to read receipts for sent messages
   * 
   * @param messageIds - Array of message IDs to monitor
   * @param onReceiptUpdate - Callback when receipt status changes
   * @returns Unsubscribe function
   */
  subscribeToReadReceipts(
    messageIds: string[],
    onReceiptUpdate: (receipt: MessageReadReceipt) => void
  ): UnsubscribeFunction {
    const subscription = supabase
      .channel('read_receipts')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'message_read_receipts'
        },
        (payload) => {
          const receipt = payload.new as MessageReadReceipt;
          if (messageIds.includes(receipt.message_id)) {
            onReceiptUpdate(receipt);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

/**
 * Singleton instance of MessagingService
 * Initialize once in your app and use throughout
 * 
 * Example:
 * ```typescript
 * import { messagingService } from '@/services/messagingService';
 * 
 * // Initialize (call once in app startup)
 * await messagingService.init();
 * 
 * // Use the service
 * const convId = await messagingService.createOrGetConversation(friendId);
 * await messagingService.sendMessage({ conversationId: convId, content: 'Hello!' });
 * ```
 */
export const messagingService = new MessagingService();

// ============================================================================
// Backward Compatibility Exports (deprecated - use messagingService instance)
// ============================================================================

/**
 * @deprecated Use messagingService.createOrGetConversation() instead
 */
export const createOrGetConversation = async (participantId: string): Promise<{
  conversationId?: string;
  error?: string;
}> => {
  try {
    const conversationId = await messagingService.createOrGetConversation(participantId);
    return { conversationId };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Failed to create conversation'
    };
  }
};

/**
 * @deprecated Use messagingService.sendMessage() instead
 */
export const sendMessage = async (params: SendMessageParams): Promise<{
  messageId?: string;
  error?: string;
}> => {
  try {
    const messageId = await messagingService.sendMessage(params);
    return { messageId };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Failed to send message'
    };
  }
};

/**
 * @deprecated Use messagingService.fetchMessages() instead
 */
export const getMessages = async (
  conversationId: string,
  limit = 50,
  beforeTimestamp?: string
): Promise<{
  messages?: Message[];
  error?: string;
}> => {
  try {
    let query = supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (beforeTimestamp) {
      query = query.lt('created_at', beforeTimestamp);
    }

    const { data, error } = await query;

    if (error) {
      console.error('getMessages error:', error);
      return { error: error.message };
    }

    return { messages: data as Message[] };
  } catch (err) {
    console.error('getMessages unexpected error:', err);
    return {
      error: err instanceof Error ? err.message : 'Failed to fetch messages'
    };
  }
};

/**
 * @deprecated Use messagingService.fetchConversations() instead
 */
export const getConversations = async (limit = 20): Promise<{
  conversations?: Conversation[];
  error?: string;
}> => {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('getConversations error:', error);
      return { error: error.message };
    }

    return { conversations: data as Conversation[] };
  } catch (err) {
    console.error('getConversations unexpected error:', err);
    return {
      error: err instanceof Error ? err.message : 'Failed to fetch conversations'
    };
  }
};

/**
 * @deprecated Use messagingService.markMessageAsRead() instead
 */
export const markMessageAsRead = async (messageId: string): Promise<{
  success?: boolean;
  error?: string;
}> => {
  try {
    await messagingService.markMessageAsRead(messageId);
    return { success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Failed to mark message as read'
    };
  }
};

/**
 * @deprecated Use messagingService.getUnreadCount() instead
 */
export const getUnreadMessageCount = async (): Promise<{
  count?: number;
  error?: string;
}> => {
  try {
    const count = await messagingService.getUnreadCount();
    return { count };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Failed to get unread count'
    };
  }
};

/**
 * @deprecated Use messagingService.subscribeToMessages() instead
 */
export const subscribeToMessages = (
  conversationId: string,
  onMessage: (message: Message) => void
): UnsubscribeFunction => {
  return messagingService.subscribeToMessages(conversationId, onMessage);
};

/**
 * @deprecated Use messagingService.subscribeToConversations() instead
 */
export const subscribeToConversations = (
  onUpdate: (conversation: Conversation) => void
): UnsubscribeFunction => {
  return messagingService.subscribeToConversations(onUpdate);
};

/**
 * @deprecated Use messagingService.subscribeToReadReceipts() instead
 */
export const subscribeToReadReceipts = (
  messageIds: string[],
  onReceiptUpdate: (receipt: MessageReadReceipt) => void
): UnsubscribeFunction => {
  return messagingService.subscribeToReadReceipts(messageIds, onReceiptUpdate);
};
