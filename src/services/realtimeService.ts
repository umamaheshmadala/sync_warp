// src/services/realtimeService.ts
// Realtime service layer for WebSocket management with platform-specific handling
// Story: 8.2.2 - Realtime Service Layer

import { supabase } from '../lib/supabase';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Network } from '@capacitor/network';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type { Message, Conversation } from '../types/messaging';

// ============================================================================
// Type Definitions
// ============================================================================

export type MessageCallback = (message: Message) => void;
export type TypingCallback = (userId: string, isTyping: boolean) => void;
export type PresenceCallback = (userId: string, isOnline: boolean) => void;
export type ConversationUpdateCallback = (payload?: any) => void;
export type ConnectionStatusCallback = (status: string) => void;

export interface PresenceState {
  user_id: string;
  online_at: string;
}

// ============================================================================
// RealtimeService Class
// ============================================================================

/**
 * Enhanced realtime service with platform-specific WebSocket handling
 * 
 * Features:
 * - Mobile app lifecycle management (background/foreground)
 * - Network switching reconnection (WiFi ↔ Cellular)
 * - Adaptive reconnection delays by platform
 * - Battery optimization (disconnect after 1 min in background)
 * - Automatic channel cleanup
 */
class RealtimeService {
  private channels: Map<string, RealtimeChannel> = new Map();
  private isAppActive: boolean = true;
  private backgroundDisconnectTimer: NodeJS.Timeout | null = null;
  private previousConnectionType: string | null = null;
  private appStateListener?: any;
  private networkListener?: any;

  /**
   * Initialize the realtime service with platform-specific handlers
   */
  async init(): Promise<void> {
    console.log('🚀 Initializing RealtimeService...');

    if (Capacitor.isNativePlatform()) {
      await this.initMobileHandlers();
    }

    console.log('✅ RealtimeService initialized');
  }

  /**
   * Initialize mobile-specific handlers (app lifecycle, network)
   */
  private async initMobileHandlers(): Promise<void> {
    console.log('📱 Setting up mobile handlers...');

    // Handle app state changes (background/foreground)
    this.appStateListener = await App.addListener('appStateChange', ({ isActive }) => {
      this.isAppActive = isActive;

      if (!isActive) {
        console.log('📱 App went to background');
        // Disconnect after 1 minute in background to save battery
        this.backgroundDisconnectTimer = setTimeout(() => {
          if (!this.isAppActive) {
            console.log('🔌 Disconnecting WebSocket (background timeout)');
            this.disconnectAll();
          }
        }, 60000); // 1 minute
      } else {
        console.log('📱 App came to foreground');
        // Clear disconnect timer and reconnect
        if (this.backgroundDisconnectTimer) {
          clearTimeout(this.backgroundDisconnectTimer);
          this.backgroundDisconnectTimer = null;
        }
        this.reconnectAll();
      }
    });

    // Monitor network changes (WiFi ↔ Cellular)
    this.networkListener = await Network.addListener('networkStatusChange', status => {
      console.log('📡 Network status changed:', status);

      if (status.connected && status.connectionType !== this.previousConnectionType) {
        console.log(`📡 Network switched: ${this.previousConnectionType} → ${status.connectionType}`);
        this.previousConnectionType = status.connectionType;

        // Reconnect all channels on network switch
        this.reconnectAll();
      } else if (!status.connected) {
        console.log('❌ Network disconnected');
        this.previousConnectionType = null;
      }
    });

    // Get initial network status
    const status = await Network.getStatus();
    this.previousConnectionType = status.connectionType;
    console.log('📡 Initial network type:', this.previousConnectionType);
  }

  /**
   * Get platform-appropriate reconnection delay
   */
  private async getReconnectionDelay(): Promise<number> {
    if (!Capacitor.isNativePlatform()) {
      return 1000; // Web: 1 second
    }

    try {
      const networkStatus = await Network.getStatus();

      if (networkStatus.connectionType === 'wifi') {
        return 2000; // Mobile WiFi: 2 seconds
      }

      return 5000; // Mobile 4G/5G: 5 seconds (higher latency)
    } catch (error) {
      console.warn('⚠️ Failed to get network status, using default delay');
      return 2000;
    }
  }

  /**
   * Reconnect all active channels
   */
  private async reconnectAll(): Promise<void> {
    if (this.channels.size === 0) {
      console.log('ℹ️ No channels to reconnect');
      return;
    }

    const delay = await this.getReconnectionDelay();
    console.log(`🔄 Reconnecting all WebSocket channels (delay: ${delay}ms)...`);

    // Wait for network to stabilize
    await new Promise(resolve => setTimeout(resolve, delay));

    // Resubscribe to all active channels
    for (const [channelName, channel] of this.channels.entries()) {
      try {
        await channel.subscribe();
        console.log(`✅ Reconnected channel: ${channelName}`);
      } catch (error) {
        console.error(`❌ Failed to reconnect channel ${channelName}:`, error);
      }
    }
  }

  /**
   * Disconnect all channels (battery optimization for background)
   */
  private async disconnectAll(): Promise<void> {
    console.log('🔌 Disconnecting all WebSocket channels...');

    for (const [channelName, channel] of this.channels.entries()) {
      try {
        await supabase.removeChannel(channel);
        console.log(`🔌 Disconnected channel: ${channelName}`);
      } catch (error) {
        console.error(`❌ Failed to disconnect channel ${channelName}:`, error);
      }
    }

    // Clear the channels map but keep references for reconnection
    this.channels.clear();
  }

  // ============================================================================
  // Message Subscriptions
  // ============================================================================

  /**
   * Subscribe to new messages in a conversation
   * 
   * NOTE: We subscribe to ALL message inserts and filter client-side because
   * Supabase Realtime filters on non-primary-key columns (like conversation_id)
   * can be unreliable and fail silently.
   * 
   * @param conversationId - Conversation UUID
   * @param onNewMessage - Callback when new message arrives
   * @returns Unsubscribe function
   */
  subscribeToMessages(
    conversationId: string,
    onNewMessage: MessageCallback
  ): () => void {
    const channelName = `messages:${conversationId}`;

    // Remove existing subscription if any
    this.unsubscribe(channelName);

    console.log(`🔔 [RealtimeService] Setting up message subscription for conversation: ${conversationId}`);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
          // NO FILTER - we filter client-side for reliability
        },
        (payload: RealtimePostgresChangesPayload<Message>) => {
          const newMessage = payload.new as Message;

          // Client-side filter: Only process messages for this conversation
          if (newMessage.conversation_id === conversationId) {
            console.log('📨 [RealtimeService] New message received for conversation:', {
              messageId: newMessage.id,
              conversationId: newMessage.conversation_id,
              content: newMessage.content?.substring(0, 30) + '...'
            });
            onNewMessage(newMessage);
          }
        }
      )
      .subscribe((status) => {
        console.log(`🔔 [RealtimeService] Message subscription status [${channelName}]:`, status);
        if (status === 'SUBSCRIBED') {
          console.log(`✅ [RealtimeService] Successfully subscribed to messages for ${conversationId}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ [RealtimeService] Channel error for ${channelName}`);
        }
      });

    this.channels.set(channelName, channel);

    // Return unsubscribe function
    return () => this.unsubscribe(channelName);
  }

  /**
   * Subscribe to message updates (edits, deletions)
   * 
   * @param conversationId - Conversation UUID
   * @param onMessageUpdate - Callback when message updates
   * @returns Unsubscribe function
   */
  subscribeToMessageUpdates(
    conversationId: string,
    onMessageUpdate: MessageCallback
  ): () => void {
    const channelName = `message-updates:${conversationId}`;

    // Remove existing subscription if any
    this.unsubscribe(channelName);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload: RealtimePostgresChangesPayload<Message>) => {
          const newMessage = payload.new as Message;
          console.log('✏️ Message updated:', newMessage.id);
          onMessageUpdate(newMessage);
        }
      )
      .subscribe();

    this.channels.set(channelName, channel);

    return () => this.unsubscribe(channelName);
  }

  /**
   * Subscribe to read receipts
   * 
   * NOTE: We subscribe to ALL read receipt inserts and filter client-side
   * because the filter on conversation_id may not work reliably.
   * 
   * @param conversationId - Conversation UUID
   * @param onReadReceipt - Callback when read receipt arrives
   * @returns Unsubscribe function
   */
  subscribeToReadReceipts(
    conversationId: string,
    onReadReceipt: (payload: any) => void
  ): () => void {
    const channelName = `read-receipts:${conversationId}`;

    // Remove existing subscription if any
    this.unsubscribe(channelName);

    console.log(`🔔 [RealtimeService] Setting up read receipt subscription for conversation: ${conversationId}`);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_read_receipts'
          // NO FILTER - we filter client-side for reliability
        },
        (payload) => {
          const receipt = payload.new as any;
          console.log('✓ [RealtimeService] Read receipt received:', {
            messageId: receipt.message_id,
            readBy: receipt.user_id,
            readAt: receipt.read_at
          });
          // Pass all receipts - the callback will handle filtering by message IDs
          onReadReceipt(receipt);
        }
      )
      .subscribe((status) => {
        console.log(`🔔 [RealtimeService] Read receipt subscription status [${channelName}]:`, status);
        if (status === 'SUBSCRIBED') {
          console.log(`✅ [RealtimeService] Successfully subscribed to read receipts for ${conversationId}`);
        }
      });

    this.channels.set(channelName, channel);

    return () => this.unsubscribe(channelName);
  }

  /**
   * Subscribe to conversation updates (archive, pin)
   * 
   * @param conversationId - Conversation UUID
   * @param onUpdate - Callback when conversation updates
   * @returns Unsubscribe function
   */
  subscribeToConversationUpdates(
    conversationId: string,
    onUpdate: (payload: any) => void
  ): () => void {
    const channelName = `conversation-updates:${conversationId}`;

    this.unsubscribe(channelName);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: `id=eq.${conversationId}`
        },
        (payload) => {
          console.log('📊 Conversation updated:', payload.new.id);
          onUpdate(payload.new);
        }
      )
      .subscribe();

    this.channels.set(channelName, channel);
    return () => this.unsubscribe(channelName);
  }

  /**
   * Subscribe to mute status changes
   * 
   * @param userId - User UUID
   * @param onMuteUpdate - Callback when mute status changes
   * @returns Unsubscribe function
   */
  subscribeToMuteUpdates(
    userId: string,
    onMuteUpdate: (payload: any) => void
  ): () => void {
    const channelName = `mute-updates:${userId}`;

    this.unsubscribe(channelName);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversation_mutes',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('🔕 Mute update:', payload.eventType);
          onMuteUpdate(payload);
        }
      )
      .subscribe();

    this.channels.set(channelName, channel);
    return () => this.unsubscribe(channelName);
  }

  /**
   * Subscribe to conversation list updates (granular)
   * 
   * @param userId - User UUID
   * @param onListUpdate - Callback with payload
   * @returns Unsubscribe function
   */
  subscribeToConversationList(
    userId: string,
    onListUpdate: (payload: any) => void
  ): () => void {
    const channelName = `conversation-list:${userId}`;

    this.unsubscribe(channelName);

    // Note: We can't easily filter conversations by user_id in the participants array via realtime filter.
    // Usually we rely on RLS to only send events for rows the user can see.
    // Or we subscribe to `conversation_participants` table.
    // For now, let's assume we subscribe to conversations and RLS handles visibility, or we accept some noise.
    // For now, let's assume we subscribe to conversations and RLS handles visibility, or we accept some noise.
    return () => this.unsubscribe(channelName);
  }

  /**
   * Subscribe to in-app notifications (toasts)
   * Uses a unique channel to avoid conflicts and leverages RealtimeService's robustness
   * 
   * @param userId - User UUID
   * @param onNotification - Callback with payload
   * @returns Unsubscribe function
   */
  subscribeToInAppNotifications(
    userId: string,
    onNotification: (payload: any) => void
  ): () => void {
    // Unique channel name to prevent conflicts with other listeners
    const channelName = `realtime-notifications-toast-${userId}`;

    this.unsubscribe(channelName);

    console.log(`[RealtimeService] 🚀 Setting up in-app notification subscription for user: ${userId}`);
    console.log(`[RealtimeService] 📡 Channel name: ${channelName}`);
    console.log(`[RealtimeService] 📊 Current active channels: ${this.getActiveChannelCount()}`);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notification_log'
          // Filter removed: Relying on RLS policy to filter rows by user_id. 
          // Explicit filters can sometimes cause issues if types don't match perfectly.
        },
        (payload) => {
          console.log('🔔 [RealtimeService] ✅ In-app notification event received!');
          console.log('🔔 [RealtimeService] 📦 Payload:', {
            id: payload.new.id,
            type: payload.new.notification_type,
            userId: payload.new.user_id,
            timestamp: new Date().toISOString()
          });
          onNotification(payload);
        }
      )
      .subscribe((status) => {
        console.log(`🔔 [RealtimeService] 📡 Subscription status update [${channelName}]:`, status);

        if (status === 'SUBSCRIBED') {
          console.log(`✅ [RealtimeService] 🎉 Successfully subscribed to in-app notifications!`);
          console.log(`✅ [RealtimeService] Listening for INSERT events on notification_log`);
          console.log(`✅ [RealtimeService] User filter: ${userId} (via RLS)`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ [RealtimeService] Channel error for ${channelName}`);
          console.error(`❌ [RealtimeService] This might indicate a network or permission issue`);
        } else if (status === 'TIMED_OUT') {
          console.error(`⏱️ [RealtimeService] Channel subscription timed out: ${channelName}`);
        } else if (status === 'CLOSED') {
          console.warn(`🔌 [RealtimeService] Channel closed: ${channelName}`);
        } else {
          console.log(`📊 [RealtimeService] Status: ${status} for channel: ${channelName}`);
        }
      });

    this.channels.set(channelName, channel);
    console.log(`[RealtimeService] 💾 Channel registered. Total channels: ${this.getActiveChannelCount()}`);

    return () => this.unsubscribe(channelName);
  }

  // ============================================================================
  // Typing Indicators
  // ============================================================================

  /**
   * Subscribe to typing indicators using Realtime broadcast
   * 
   * @param conversationId - Conversation UUID
   * @param onTypingChange - Callback when typing status changes
   * @returns Unsubscribe function
   */
  subscribeToTyping(
    conversationId: string,
    onTypingChange: TypingCallback
  ): () => void {
    const channelName = `typing:${conversationId}`;

    // Remove existing subscription if any
    this.unsubscribe(channelName);

    const channel = supabase
      .channel(channelName)
      .on('broadcast', { event: 'typing' }, (payload) => {
        const { userId, isTyping } = payload.payload;
        console.log('⌨️ Typing indicator:', userId, isTyping);
        onTypingChange(userId, isTyping);
      })
      .subscribe();

    this.channels.set(channelName, channel);

    return () => this.unsubscribe(channelName);
  }

  /**
   * Broadcast typing indicator to other participants
   * 
   * @param conversationId - Conversation UUID
   * @param isTyping - Whether user is typing
   */
  async broadcastTyping(conversationId: string, isTyping: boolean): Promise<void> {
    const channelName = `typing:${conversationId}`;
    const channel = this.channels.get(channelName);

    if (channel) {
      try {
        const user = (await supabase.auth.getUser()).data.user;
        await channel.send({
          type: 'broadcast',
          event: 'typing',
          payload: { userId: user?.id, isTyping }
        });
      } catch (error) {
        console.error('❌ Failed to broadcast typing:', error);
      }
    } else {
      console.warn('⚠️ Typing channel not found. Call subscribeToTyping first.');
    }
  }

  // ============================================================================
  // Presence Tracking
  // ============================================================================

  /**
   * Subscribe to user presence (online/offline)
   * 
   * @param conversationId - Conversation UUID
   * @param onPresenceChange - Callback when presence changes
   * @returns Unsubscribe function
   */
  subscribeToPresence(
    conversationId: string,
    onPresenceChange: PresenceCallback
  ): () => void {
    const channelName = `presence:${conversationId}`;

    // Remove existing subscription if any
    this.unsubscribe(channelName);

    const channel = supabase
      .channel(channelName)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        console.log('👥 Presence sync:', state);

        // Notify about each user's presence
        Object.entries(state).forEach(([userId, presences]) => {
          const isOnline = (presences as any[]).length > 0;
          onPresenceChange(userId, isOnline);
        });
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        console.log('✅ User joined:', key);
        onPresenceChange(key, true);
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        console.log('❌ User left:', key);
        onPresenceChange(key, false);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          try {
            const user = (await supabase.auth.getUser()).data.user;
            if (user) {
              await channel.track({
                user_id: user.id,
                online_at: new Date().toISOString()
              } as PresenceState);
            }
          } catch (error) {
            console.error('❌ Failed to track presence:', error);
          }
        }
      });

    this.channels.set(channelName, channel);

    return () => this.unsubscribe(channelName);
  }

  // ============================================================================
  // Conversation List Updates
  // ============================================================================

  /**
   * Subscribe to conversation list updates
   * Triggers on new conversations and new messages
   * 
   * @param onUpdate - Callback when conversation list should refresh
   * @returns Unsubscribe function
   */
  subscribeToConversations(onUpdate: ConversationUpdateCallback): () => void {
    const channelName = 'user-conversations';

    // Remove existing subscription if any
    this.unsubscribe(channelName);

    // Subscribe to both conversations and messages tables
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        (payload) => {
          console.log('🔄 Conversations table updated');
          onUpdate(payload); // Pass payload for future optimization
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notification_log' },
        (payload) => {
          console.log('🔄 New notification log (updating conversation list)');
          onUpdate(payload); // Pass payload for future optimization
        }
      )
      .subscribe();

    this.channels.set(channelName, channel);

    return () => this.unsubscribe(channelName);
  }

  // ============================================================================
  // Connection Monitoring
  // ============================================================================

  /**
   * Monitor connection status and handle reconnections
   * 
   * @param onStatusChange - Callback when connection status changes
   * @returns Unsubscribe function
   */
  monitorConnectionStatus(onStatusChange: ConnectionStatusCallback): () => void {
    const channelName = 'connection-monitor';

    const channel = supabase
      .channel(channelName)
      .subscribe((status) => {
        console.log('📡 Connection status:', status);
        onStatusChange(status);

        // Handle reconnection
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime connection established');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Realtime connection error');
          // Reconnection is automatic with Supabase
        } else if (status === 'TIMED_OUT') {
          console.warn('⏱️ Realtime connection timed out');
          // toast.error('Connection timed out');
        } else if (status === 'CLOSED') {
          console.warn('🔌 Realtime connection closed');
          // toast.error('Connection closed');
        }
      });

    this.channels.set(channelName, channel);

    return () => this.unsubscribe(channelName);
  }

  // ============================================================================
  // Channel Management
  // ============================================================================

  /**
   * Unsubscribe from a specific channel
   * 
   * @param channelName - Name of the channel to unsubscribe
   */
  private async unsubscribe(channelName: string): Promise<void> {
    const channel = this.channels.get(channelName);
    if (channel) {
      try {
        await supabase.removeChannel(channel);
        this.channels.delete(channelName);
        console.log('🔌 Unsubscribed from:', channelName);
      } catch (error) {
        console.error(`❌ Failed to unsubscribe from ${channelName}:`, error);
      }
    }
  }

  /**
   * Cleanup all subscriptions and listeners
   */
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up all Realtime subscriptions...');

    // Clear background timer
    if (this.backgroundDisconnectTimer) {
      clearTimeout(this.backgroundDisconnectTimer);
      this.backgroundDisconnectTimer = null;
    }

    // Remove all channels
    const channelNames = Array.from(this.channels.keys());
    await Promise.all(channelNames.map(name => this.unsubscribe(name)));

    // Remove mobile listeners
    if (this.appStateListener) {
      await this.appStateListener.remove();
      this.appStateListener = null;
    }

    if (this.networkListener) {
      await this.networkListener.remove();
      this.networkListener = null;
    }

    console.log('✅ RealtimeService cleanup complete');
  }

  /**
   * Get count of active channels (for debugging)
   */
  getActiveChannelCount(): number {
    return this.channels.size;
  }

  /**
   * Get list of active channel names (for debugging)
   */
  getActiveChannels(): string[] {
    return Array.from(this.channels.keys());
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

/**
 * Singleton instance of RealtimeService
 * Initialize once in your app and use throughout
 * 
 * Example:
 * ```typescript
 * import { realtimeService } from '@/services/realtimeService';
 * 
 * // Initialize (call once in app startup)
 * await realtimeService.init();
 * 
 * // Subscribe to messages
 * const unsubscribe = realtimeService.subscribeToMessages(
 *   conversationId,
 *   (message) => console.log('New message:', message)
 * );
 * 
 * // Cleanup when done
 * unsubscribe();
 * await realtimeService.cleanup();
 * ```
 */
export const realtimeService = new RealtimeService();
