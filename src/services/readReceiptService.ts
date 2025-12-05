// src/services/readReceiptService.ts
// Read receipts service for tracking message read status
// Story: 8.5.1 - Read Receipts Implementation

import { supabase } from '../lib/supabase';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

/**
 * Read receipt information
 */
export interface ReadReceipt {
  messageId: string;
  userId: string;
  username?: string;
  avatarUrl?: string;
  readAt: string;
}

/**
 * Read receipt service for managing message read status
 * 
 * Features:
 * - Mark individual messages as read
 * - Mark all conversation messages as read
 * - Get read receipt details (who read, when)
 * - Subscribe to real-time read receipt updates
 * - Visibility-based automatic read marking
 */
class ReadReceiptService {
  private markedMessages: Set<string> = new Set();
  private isDocumentVisible: boolean = true;

  constructor() {
    // Track document visibility for read marking
    if (typeof document !== 'undefined') {
      this.isDocumentVisible = !document.hidden;
      document.addEventListener('visibilitychange', () => {
        this.isDocumentVisible = !document.hidden;
      });
    }
  }

  /**
   * Mark a single message as read
   * Skips if already marked in this session to prevent duplicate calls
   */
  async markAsRead(messageId: string): Promise<boolean> {
    // Skip if already marked
    if (this.markedMessages.has(messageId)) {
      return true;
    }

    try {
      const { error } = await supabase.rpc('mark_message_as_read', {
        p_message_id: messageId
      });

      if (error) {
        console.error('❌ Error marking message as read:', error);
        return false;
      }

      this.markedMessages.add(messageId);
      console.log(`📖 Marked message ${messageId} as read`);
      return true;
    } catch (error) {
      console.error('❌ Error marking message as read:', error);
      return false;
    }
  }

  /**
   * Mark all unread messages in a conversation as read
   * Only marks messages not sent by current user
   * 
   * PRIVACY: Checks if current user has read receipts enabled
   * If disabled, messages won't be marked as read (senders won't see 'read' status)
   * 
   * @param conversationId - Conversation UUID
   * @returns Number of messages marked as read
   */
  async markConversationAsRead(conversationId: string): Promise<number> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return 0;

      // PRIVACY CHECK: If user has disabled read receipts, don't mark as read
      // This prevents senders from seeing 'read' status
      const readReceiptsEnabled = await this.isReadReceiptsEnabled();
      if (!readReceiptsEnabled) {
        console.log('📖 Read receipts disabled - not marking conversation as read');
        return 0;
      }

      // Get messages not from current user that aren't already 'read'
      // This includes: null, 'sent', 'delivered' status
      const { data: unreadMessages, error } = await supabase
        .from('messages')
        .select('id, status')
        .eq('conversation_id', conversationId)
        .eq('is_deleted', false)
        .neq('sender_id', user.user.id)
        .or('status.is.null,status.neq.read'); // Get messages where status is null OR not 'read'

      if (error) {
        console.error('❌ Error fetching unread messages:', error);
        return 0;
      }

      if (!unreadMessages || unreadMessages.length === 0) {
        return 0;
      }

      // Filter out already marked messages
      const messagesToMark = unreadMessages.filter(
        msg => !this.markedMessages.has(msg.id)
      );

      if (messagesToMark.length === 0) {
        return 0;
      }

      // Mark each as read (batch operation)
      await Promise.all(
        messagesToMark.map(msg => this.markAsRead(msg.id))
      );

      console.log(`📚 Marked ${messagesToMark.length} messages as read in conversation`);
      return messagesToMark.length;
    } catch (error) {
      console.error('❌ Error marking conversation as read:', error);
      return 0;
    }
  }

  /**
   * Mark messages as read when the document becomes visible
   * Call this when entering a conversation
   * 
   * PRIVACY: Checks if current user has read receipts enabled before marking
   */
  async markVisibleMessagesAsRead(
    conversationId: string,
    messageIds: string[]
  ): Promise<void> {
    if (!this.isDocumentVisible) {
      return;
    }

    // PRIVACY CHECK: If user has disabled read receipts, don't mark as read
    const readReceiptsEnabled = await this.isReadReceiptsEnabled();
    if (!readReceiptsEnabled) {
      console.log('📖 Read receipts disabled - not marking visible messages as read');
      return;
    }

    for (const messageId of messageIds) {
      await this.markAsRead(messageId);
    }
  }

  /**
   * Get read receipts for a specific message
   * Returns list of users who have read the message
   */
  async getReadReceipts(messageId: string): Promise<ReadReceipt[]> {
    try {
      const { data, error } = await supabase
        .from('message_read_receipts')
        .select(`
          message_id,
          user_id,
          read_at,
          users!message_read_receipts_user_id_fkey(
            id,
            username,
            avatar_url
          )
        `)
        .eq('message_id', messageId)
        .order('read_at', { ascending: true });

      if (error) {
        console.error('❌ Error fetching read receipts:', error);
        return [];
      }

      return (data || []).map((receipt: any) => ({
        messageId: receipt.message_id,
        userId: receipt.user_id,
        username: receipt.users?.username,
        avatarUrl: receipt.users?.avatar_url,
        readAt: receipt.read_at
      }));
    } catch (error) {
      console.error('❌ Error fetching read receipts:', error);
      return [];
    }
  }

  /**
   * Get read receipt count for a message
   */
  async getReadCount(messageId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('message_read_receipts')
        .select('*', { count: 'exact', head: true })
        .eq('message_id', messageId);

      if (error) {
        console.error('❌ Error fetching read count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('❌ Error fetching read count:', error);
      return 0;
    }
  }

  /**
   * Subscribe to read receipt updates for a conversation
   * Calls the callback when any message in the conversation is read
   * 
   * @param conversationId - Conversation to watch
   * @param onReadReceipt - Callback when a message is read
   * @returns Unsubscribe function
   */
  subscribeToReadReceipts(
    conversationId: string,
    onReadReceipt: (receipt: ReadReceipt) => void
  ): () => void {
    const channel = supabase
      .channel(`read_receipts:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_read_receipts'
        },
        async (payload) => {
          // Verify this receipt is for a message in our conversation
          const { data: message } = await supabase
            .from('messages')
            .select('conversation_id')
            .eq('id', payload.new.message_id)
            .single();

          if (message?.conversation_id === conversationId) {
            // Fetch user details
            const { data: user } = await supabase
              .from('users')
              .select('username, avatar_url')
              .eq('id', payload.new.user_id)
              .single();

            onReadReceipt({
              messageId: payload.new.message_id,
              userId: payload.new.user_id,
              username: user?.username,
              avatarUrl: user?.avatar_url,
              readAt: payload.new.read_at
            });

            // Light haptic feedback on mobile when message is read
            if (Capacitor.isNativePlatform()) {
              try {
                await Haptics.impact({ style: ImpactStyle.Light });
              } catch (e) {
                // Ignore haptic errors
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  /**
   * Check if current user has read a message
   */
  async hasUserRead(messageId: string): Promise<boolean> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return false;

      const { data, error } = await supabase
        .from('message_read_receipts')
        .select('id')
        .eq('message_id', messageId)
        .eq('user_id', user.user.id)
        .single();

      return !!data && !error;
    } catch {
      return false;
    }
  }

  /**
   * Clear the marked messages cache
   * Call this when switching conversations
   */
  clearCache(): void {
    this.markedMessages.clear();
  }

  /**
   * Get the visibility state
   */
  get isVisible(): boolean {
    return this.isDocumentVisible;
  }

  /**
   * Check if current user has read receipts enabled
   * Reciprocal: if disabled, user won't send or see read receipts
   */
  async isReadReceiptsEnabled(): Promise<boolean> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return false;

      const { data, error } = await supabase
        .from('profiles')
        .select('privacy_settings')
        .eq('id', user.user.id)
        .single();

      if (error) {
        console.error('❌ Error fetching privacy settings:', error);
        return true; // Default to enabled if error
      }

      const settings = data?.privacy_settings;
      // Default to true if setting doesn't exist
      return settings?.read_receipts_enabled !== false;
    } catch (error) {
      console.error('❌ Error checking read receipt setting:', error);
      return true; // Default to enabled
    }
  }

  /**
   * Check if read receipts can be shown for a message in a 1:1 conversation
   * Both parties must have read receipts enabled (reciprocal)
   * 
   * @param otherUserId - The other participant in the conversation
   * @returns true if both users have read receipts enabled
   */
  async canShowReadReceipts(otherUserId: string): Promise<boolean> {
    try {
      // Check current user's setting
      const currentUserEnabled = await this.isReadReceiptsEnabled();
      if (!currentUserEnabled) return false;

      // Check other user's setting
      const { data, error } = await supabase
        .from('profiles')
        .select('privacy_settings')
        .eq('id', otherUserId)
        .single();

      if (error) {
        console.error('❌ Error fetching other user privacy settings:', error);
        return true; // Default to showing if error
      }

      const settings = data?.privacy_settings;
      return settings?.read_receipts_enabled !== false;
    } catch (error) {
      console.error('❌ Error checking other user read receipt setting:', error);
      return true;
    }
  }

  /**
   * Mark message as read with privacy check
   * Only marks if read receipts are enabled for current user
   */
  async markAsReadWithPrivacyCheck(messageId: string): Promise<boolean> {
    const enabled = await this.isReadReceiptsEnabled();
    if (!enabled) {
      console.log('📖 Read receipts disabled - not marking as read');
      return false;
    }
    return this.markAsRead(messageId);
  }
}

// Export singleton instance
export const readReceiptService = new ReadReceiptService();
