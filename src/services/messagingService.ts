// src/services/messagingService.ts
// Enhanced messaging service layer with platform-specific network handling
// Story: 8.2.1 - Messaging Service Layer

import { supabase } from '../lib/supabase';
import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';
import { spamDetectionService } from './spamDetectionService';
import type {
  Message,
  Conversation,
  ConversationWithDetails,
  SendMessageParams,
  FetchMessagesResponse,
  MessageReadReceipt,
  UnsubscribeFunction
} from '../types/messaging';

import { useMessagingStore } from '../store/messagingStore';

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

  // ... (imports remain)

  // ...

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

        const conversationId = data as string;
        console.log('✅ Conversation ID:', conversationId);

        // Fetch full conversation details and update store immediately
        // This fixes the issue where the header shows skeleton after creating/reviving a chat
        const conversation = await this.fetchSingleConversation(conversationId);
        if (conversation) {
          console.log('📥 updating store with new/revived conversation');
          useMessagingStore.getState().upsertConversation(conversation);
        }

        return conversationId;
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
   * Send a message with spam detection and retry logic
   * 
   * @param params - Message parameters
   * @returns Message ID
   * @throws Error if message fails spam checks or rate limits
   */
  async sendMessage(params: SendMessageParams): Promise<string> {
    return this.retryWithBackoff(async () => {
      // Get current user for spam checks
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Not authenticated')
      }

      // ============================================================
      // SPAM DETECTION: Client-side pre-flight checks
      // ============================================================

      // 1. Rate limit check (prevent unnecessary network calls)
      const rateLimitCheck = await spamDetectionService.checkRateLimits(params.conversationId)
      if (!rateLimitCheck.allowed) {
        console.warn('[SpamDetection] Rate limit check failed:', rateLimitCheck.reason)
        throw new Error(rateLimitCheck.reason || 'Rate limit exceeded')
      }

      // 2. Spam content check
      const spamCheck = await spamDetectionService.isSpam(params.content, user.id)
      if (spamCheck.isSpam) {
        console.warn('[SpamDetection] Spam detected:', spamCheck.reason)

        // High severity: block message entirely
        if (spamCheck.severity === 'high') {
          throw new Error(spamCheck.reason || 'Message contains prohibited content')
        }

        // Medium/low severity: flag but allow (will be marked in DB for admin review)
        console.log('[SpamDetection] Flagging message for review (medium/low severity)')
      }

      // ============================================================
      // NETWORK & CONNECTIVITY CHECKS
      // ============================================================

      if (!this.isOnline && Capacitor.isNativePlatform()) {
        throw new Error('No internet connection. Message will be sent when online.')
      }

      // ============================================================
      // SEND MESSAGE VIA RPC
      // ============================================================

      const { data, error } = await supabase.rpc('send_message', {
        p_conversation_id: params.conversationId,
        p_content: params.content,
        p_type: params.type || 'text',
        p_media_urls: params.mediaUrls || null,
        p_thumbnail_url: params.thumbnailUrl || null,
        p_link_previews: params.linkPreviews || null,
        p_shared_coupon_id: params.sharedCouponId || null,
        p_shared_deal_id: params.sharedDealId || null,
        p_reply_to_id: params.replyToId || null
      })

      if (error) {
        // Check if error is from rate limit triggers
        if (error.message?.includes('rate limit')) {
          console.error('[RateLimit] Database trigger blocked message:', error.message)
          throw new Error('You are sending messages too quickly. Please wait a moment.')
        }
        throw error
      }

      console.log('✅ Message sent:', data)

      // ============================================================
      // POST-SEND: Flag for review if needed
      // ============================================================

      if (spamCheck.isSpam && spamCheck.severity !== 'high') {
        // Async flag for admin review (don't block on this)
        const messageId = data as string
        spamDetectionService.flagMessageForReview(
          messageId,
          spamCheck.reason || 'Spam detected',
          spamCheck.score || 0.5
        ).catch(err => {
          console.error('[SpamDetection] Failed to flag message:', err)
        })
      }

      return data as string
    })
  }

  /**
   * Forward message to multiple conversations
   * 
   * @param messageId - Original message ID
   * @param conversationIds - Target conversation IDs
   */
  async forwardMessage(
    messageId: string,
    conversationIds: string[],
    forwardContent?: string
  ): Promise<void> {
    return this.retryWithBackoff(async () => {
      if (!this.isOnline && Capacitor.isNativePlatform()) {
        throw new Error('No internet connection. Forwarding will be processed when online.');
      }

      console.log(
        "📤 Forwarding message to",
        conversationIds.length,
        "conversations"
      );

      // 1. Fetch original message details
      const { data: originalMessage, error: fetchError } = await supabase
        .from('messages')
        .select('*')
        .eq('id', messageId)
        .single();

      if (fetchError || !originalMessage) {
        throw new Error('Original message not found');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // 2. Prepare messages for insertion
      const messagesToInsert = conversationIds.map(conversationId => ({
        conversation_id: conversationId,
        sender_id: user.id,
        content: forwardContent || originalMessage.content, // Use provided content (with URL) or original
        type: originalMessage.type,
        media_urls: originalMessage.media_urls,
        link_previews: originalMessage.link_previews, // ✅ FIX: Explicitly copy link_previews
        is_forwarded: true,
        original_message_id: messageId
      }));

      // 3. Insert all forwarded messages
      // We use a loop/Promise.all to ensure we can track failures individually if needed, 
      // but a bulk insert is more efficient. Bulk insert is atomic by default.
      const { error: insertError } = await supabase
        .from('messages')
        .insert(messagesToInsert);

      if (insertError) throw insertError;

      // 4. Update forward count on original message (fire and forget)
      // We do this in a separate non-blocking call or just await it.
      try {
        await supabase.rpc('increment_forward_count', { message_id: messageId });
      } catch (error) {
        // Ignore error if RPC fails or doesn't exist
      }

      console.log("✅ Message forwarded successfully");
    });
  }

  /**
   * Update message status
   */
  async updateMessageStatus(
    messageId: string,
    status: 'sent' | 'delivered' | 'read'
  ): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .update({ status })
      .eq('id', messageId);

    if (error) {
      console.error('Failed to update message status:', error);
      throw error;
    }
  }

  /**
   * Mark message as delivered
   */
  async markMessageAsDelivered(messageId: string): Promise<void> {
    await this.updateMessageStatus(messageId, 'delivered');
  }

  /**
   * Get forward count for a message
   * 
   * @param messageId - Message UUID
   * @returns Forward count
   */
  async getForwardCount(messageId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("forward_count")
        .eq("id", messageId)
        .single();

      if (error) throw error;

      return data?.forward_count || 0;
    } catch (error) {
      console.error("Failed to get forward count:", error);
      return 0;
    }
  }

  // ============================================================================
  // Message Fetching with Pagination
  // ============================================================================

  /**
   * Fetch messages with cursor-based pagination
   * Now includes status derivation from read receipts (WhatsApp-style tick marks)
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
      console.log('📥 Fetching messages for conversation:', conversationId);

      // Get current user for status derivation
      const { data: userData } = await supabase.auth.getUser();
      const currentUserId = userData?.user?.id;

      const { data, error } = await supabase
        .rpc('get_conversation_messages', {
          p_conversation_id: conversationId,
          p_limit: limit + 1, // Fetch one extra to check hasMore
          p_before_id: beforeMessageId || null
        });

      if (error) throw error;

      // Get message IDs that the current user sent (for status derivation)
      const sentMessageIds = (data || [])
        .filter((msg: any) => msg.sender_id === currentUserId)
        .map((msg: any) => msg.id);

      // Fetch read receipts for sent messages
      let readReceiptsByMessageId: Record<string, boolean> = {};
      if (sentMessageIds.length > 0) {
        const { data: receipts } = await supabase
          .from('message_read_receipts')
          .select('message_id, read_at')
          .in('message_id', sentMessageIds)
          .not('read_at', 'is', null);

        // Create a map of message_id -> has been read 
        readReceiptsByMessageId = (receipts || []).reduce((acc: Record<string, boolean>, receipt: any) => {
          acc[receipt.message_id] = true;
          return acc;
        }, {});
      }

      // Fetch reported status for the current user
      let reportedMessageIds: Set<string> = new Set();
      if (data && data.length > 0) {
        const messageIds = data.map((m: any) => m.id);
        const { data: reports } = await supabase
          .from('message_reports')
          .select('message_id')
          .eq('reporter_id', currentUserId)
          .in('message_id', messageIds);

        if (reports) {
          reports.forEach((r: any) => reportedMessageIds.add(r.message_id));
        }
      }

      const messages = (data || []).map((msg: any) => {
        // Derive status for own messages
        let status: 'sent' | 'delivered' | 'read' | undefined;
        if (msg.sender_id === currentUserId) {
          // Own message - derive status from read receipts
          if (readReceiptsByMessageId[msg.id]) {
            status = 'read'; // Double blue check ✓✓
          } else {
            status = 'delivered'; // Double gray check ✓✓ (message exists in DB = delivered)
          }
        }
        // For received messages, status is not needed (we don't show ticks on received messages)

        return {
          ...msg,
          status,
          viewer_has_reported: reportedMessageIds.has(msg.id),
          // Ensure arrays are initialized
          media_urls: msg.media_urls || [],
          // Ensure timestamps are valid strings
          created_at: msg.created_at,
          updated_at: msg.updated_at,
          read_at: msg.read_at,
          deleted_at: msg.deleted_at,
          edited_at: msg.edited_at
        };
      });

      const hasMore = messages.length > limit;
      const finalMessages = (messages.slice(0, limit)).reverse(); // Reverse for chronological order

      console.log(`✅ Fetched ${finalMessages.length} messages with status derived`);
      return { messages: finalMessages, hasMore };
    } catch (error) {
      console.error('❌ Error fetching messages:', error);
      throw error;
    }
  }


  /**
   * Fetch conversations list with participant details
   * Enriches conversations with is_blocked status
   * 
   * @returns Array of conversations with details
   */
  async fetchConversations(): Promise<ConversationWithDetails[]> {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch conversations
      const { data, error } = await supabase
        .from('conversation_list')
        .select('*')
        // Filter out empty conversations (no messages ever sent or all history cleared)
        .not('last_message_id', 'is', null)
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get all blocked user IDs (both directions)
      const { data: blockedData } = await supabase
        .from('blocked_users')
        .select('blocker_id, blocked_id')
        .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);

      console.log('🚫 [fetchConversations] Blocked users query result:', blockedData);

      // Create a Set of blocked user IDs for quick lookup
      const blockedUserIds = new Set<string>();
      (blockedData || []).forEach(block => {
        if (block.blocker_id === user.id) {
          blockedUserIds.add(block.blocked_id);
          console.log(`🚫 [fetchConversations] I blocked user: ${block.blocked_id}`);
        } else {
          blockedUserIds.add(block.blocker_id);
          console.log(`🚫 [fetchConversations] User ${block.blocker_id} blocked me`);
        }
      });

      console.log(`🚫 [fetchConversations] Total blocked user IDs: ${blockedUserIds.size}`, Array.from(blockedUserIds));

      return (data || []).map((conv: any) => {
        const participant1_id = conv.participants?.[0];
        const participant2_id = conv.participants?.[1];

        // Determine the other participant
        const otherParticipantId = user.id === participant1_id ? participant2_id : participant1_id;

        // Check if other participant is blocked
        const is_blocked = blockedUserIds.has(otherParticipantId);

        if (is_blocked) {
          console.log(`🚫 [fetchConversations] Conversation ${conv.conversation_id} is BLOCKED (other participant: ${otherParticipantId})`);
        }

        return {
          ...conv,
          participant1_id,
          participant2_id,
          is_blocked,  // ✅ Add is_blocked field
        };
      });
    } catch (error: any) {
      // Only log non-auth errors
      if (!error?.message?.includes('Not authenticated')) {
        console.error('❌ Error fetching conversations:', error);
      }
      throw error;
    }
  }

  /**
   * Fetch a single conversation from conversation_list view
   * Used for optimized updates instead of refetching entire list
   * 
   * @param conversationId - Conversation UUID
   * @returns Single conversation with details, or null if not found
   */
  async fetchSingleConversation(conversationId: string): Promise<ConversationWithDetails | null> {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch single conversation from view
      const { data: viewData, error: viewError } = await supabase
        .from('conversation_list')
        .select('*')
        .eq('conversation_id', conversationId)
        .maybeSingle();

      if (viewError) throw viewError;

      let conversationData = viewData;

      // Fallback: If view returns null (e.g., new/empty conversation not yet in view),
      // fetch directly from tables
      if (!conversationData) {
        console.log(`ℹ️ [fetchSingleConversation] Not in view, fetching from tables: ${conversationId}`);

        // Use a different alias (cp_data) to avoid overwriting the native 'participants' UUID[] column
        const { data: rawConv, error: rawError } = await supabase
          .from('conversations')
          .select('*, cp_data:conversation_participants(user_id, is_archived, is_pinned)')
          .eq('id', conversationId)
          .single();

        if (rawError || !rawConv) {
          console.log(`ℹ️ [fetchSingleConversation] Conversation truly not found: ${conversationId}`, rawError);
          return null;
        }

        // The native 'participants' column is a UUID[] array
        const participantsArr: string[] = Array.isArray(rawConv.participants)
          ? rawConv.participants
          : [];

        console.log(`📋 [fetchSingleConversation] Participants from table:`, participantsArr);

        const otherUserId = participantsArr.find((id: string) => id !== user.id) || participantsArr[0];

        if (!otherUserId) {
          console.error(`❌ [fetchSingleConversation] Could not determine other participant`);
          return null;
        }

        // Fetch other profile
        const { data: otherProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', otherUserId)
          .single();

        // Construct object
        conversationData = {
          conversation_id: rawConv.id,
          type: rawConv.type,
          participants: participantsArr,
          created_at: rawConv.created_at,
          last_message_at: rawConv.created_at, // timestamps
          unread_count: 0,
          // Participant specific
          is_archived: false,
          is_pinned: false,
          is_muted: false,
          // Other details
          other_participant_id: otherUserId,
          other_participant_name: otherProfile?.full_name,
          other_participant_avatar: otherProfile?.avatar_url,
          other_participant_online: otherProfile?.is_online,
          // Nulls for messages
          last_message_id: null,
          last_message_content: null,
          last_message_type: null,
          last_message_sender_id: null,
          last_message_timestamp: null,
          last_message_status: null
        };
      }

      // Get blocked user IDs for this conversation
      const { data: blockedData } = await supabase
        .from('blocked_users')
        .select('blocker_id, blocked_id')
        .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);

      // Create a Set of blocked user IDs
      const blockedUserIds = new Set<string>();
      (blockedData || []).forEach(block => {
        if (block.blocker_id === user.id) {
          blockedUserIds.add(block.blocked_id);
        } else {
          blockedUserIds.add(block.blocker_id);
        }
      });

      // Enrich with blocking status
      const participant1_id = conversationData.participants?.[0];
      const participant2_id = conversationData.participants?.[1];
      const otherParticipantId = user.id === participant1_id ? participant2_id : participant1_id;
      const is_blocked = blockedUserIds.has(otherParticipantId);

      console.log(`✨ [fetchSingleConversation] Fetched conversation: ${conversationId}`, {
        is_blocked,
        lastMessage: conversationData.last_message_content?.substring(0, 30),
        fromFallback: !viewData
      });

      return {
        ...conversationData,
        participant1_id,
        participant2_id,
        is_blocked,
      };
    } catch (error) {
      console.error(`❌ Error fetching single conversation ${conversationId}:`, error);
      return null;
    }
  }

  /**
   * Get a single conversation with details
   * 
   * @param conversationId - Conversation UUID
   * @returns Conversation with details
   */
  async getConversation(conversationId: string): Promise<ConversationWithDetails | null> {
    try {
      const { data, error } = await supabase
        .from('conversation_list')
        .select('*')
        .eq('conversation_id', conversationId)
        .single();

      if (error) throw error;

      if (!data) return null;

      return {
        ...data,
        participant1_id: data.participants?.[0],
        participant2_id: data.participants?.[1]
      };
    } catch (error) {
      console.error('❌ Error fetching conversation:', error);
      return null;
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
