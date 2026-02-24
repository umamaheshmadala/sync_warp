// src/services/realtimeService.ts
// Realtime service layer for WebSocket management with platform-specific handling
// Story: 8.2.2 - Realtime Service Layer

import { supabase } from '../lib/supabase';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Network } from '@capacitor/network';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type { Message, Conversation } from '../types/messaging';
import { queryClient } from '../lib/react-query';

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
  private lastSyncTimestamp?: string;
  private activeConversationId?: string;

  // Multiplexed callback registries
  private globalCallbacks: {
    onConversationUpdate?: ConversationUpdateCallback;
    onNotification?: (payload: any) => void;
  } = {};

  private chatCallbacks: {
    onNewMessage?: MessageCallback;
    onMessageUpdate?: MessageCallback;
    onReadReceipt?: (payload: any) => void;
    onTypingChange?: TypingCallback;
  } = {};

  /**
   * Initialize the realtime service with platform-specific handlers
   */
  async init(): Promise<void> {
    console.log('🚀 Initializing RealtimeService...');

    if (Capacitor.isNativePlatform()) {
      await this.initMobileHandlers();
    }

    // Set initial sync timestamp
    this.lastSyncTimestamp = new Date().toISOString();
    console.log('✅ RealtimeService initialized');
  }

  /**
   * Initialize mobile-specific handlers (app lifecycle, network)
   */
  private async initMobileHandlers(): Promise<void> {
    console.log('📱 Setting up mobile handlers...');

    // Handle app state changes (background/foreground)
    this.appStateListener = await App.addListener('appStateChange', async ({ isActive }) => {
      this.isAppActive = isActive;

      if (!isActive) {
        console.log('📱 App went to background');

        // Determine timeout based on network type
        const status = await Network.getStatus();
        const timeoutDuration = status.connectionType === 'wifi'
          ? 5 * 60 * 1000  // 5 minutes on WiFi
          : 60 * 1000;     // 1 minute on Cellular

        console.log(`⏱️ Background disconnect timer set to ${timeoutDuration / 1000}s`);

        this.backgroundDisconnectTimer = setTimeout(() => {
          if (!this.isAppActive) {
            console.log('🔌 Disconnecting WebSocket (background timeout)');
            this.disconnectAll();
          }
        }, timeoutDuration);
      } else {
        console.log('📱 App came to foreground');
        // Clear disconnect timer and reconnect
        if (this.backgroundDisconnectTimer) {
          clearTimeout(this.backgroundDisconnectTimer);
          this.backgroundDisconnectTimer = null;
          console.log('⚡ Cancelled background disconnect timer');
        } else {
          // If timer already fired (socket disconnected), we need to catch up
          console.log('🔄 Socket was disconnected. Initiating catch-up...');
          await this.catchUpSync();
        }

        // Always ensure connected (safe to call if already connected)
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
   * Catch up on missed messages
   */
  private async catchUpSync(): Promise<void> {
    if (!this.lastSyncTimestamp) return;

    try {
      console.log('🎣 Catching up since:', this.lastSyncTimestamp);

      // Need dynamic import to avoid circular dependency since messagingService uses us? 
      // Or simply import it at the top (messagingService doesn't import realtimeService usually)
      const { messagingService } = await import('./messagingService');
      const { messageCacheManager } = await import('../utils/messageCacheManager');

      const missedMessages = await messagingService.fetchMessagesSince(this.lastSyncTimestamp);

      if (missedMessages.length > 0) {
        console.log(`📥 Upserting ${missedMessages.length} missed messages...`);
        messageCacheManager.upsertMessages(missedMessages);

        // Story 8.11.4 Fix: Invalidate React Query cache to reflect new messages in UI
        console.log('🔄 Invalidating text query cache to reflect catch-up...');
        await queryClient.invalidateQueries({ queryKey: ['messages'] });
      } else {
        console.log('✅ No missed messages found');
      }

      this.lastSyncTimestamp = new Date().toISOString();
    } catch (error: any) {
      console.error('❌ Catch-up sync failed:', error instanceof Error ? error.message : JSON.stringify(error));
    }
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
  // Multiplexed Channels
  // ============================================================================

  /**
   * Setup the single global channel for the user's conversation list and notifications
   * @param userId - ID of the authenticated user
   */
  setupGlobalChannel(userId: string): void {
    const channelName = 'user-global';

    // Prevent duplicated setup
    if (this.channels.has(channelName)) return;

    console.log(`🌐 [RealtimeService] Setting up global multiplexed channel for user: ${userId}`);

    const channel = supabase
      .channel(channelName)
      // 1. Conversation list updates
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversation_participants',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          this.globalCallbacks.onConversationUpdate?.(payload);
        }
      )
      // 2. In-app notifications
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notification_log',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          this.globalCallbacks.onNotification?.(payload);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ [RealtimeService] Global channel subscribed');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error(`❌ [RealtimeService] Global channel error: ${status}`);
          setTimeout(() => channel.subscribe(), 5000);
        }
      });

    this.channels.set(channelName, channel);
  }

  /**
   * Setup the single multiplexed channel for the currently active chat
   * @param conversationId - Conversation UUID
   */
  setupActiveChatChannel(conversationId: string): void {
    const channelName = 'chat-active';

    // Avoid reconnecting if already on this chat
    if (this.activeConversationId === conversationId && this.channels.has(channelName)) {
      return;
    }

    this.unsubscribe(channelName);
    this.activeConversationId = conversationId;

    // Reset callbacks for the new chat
    this.chatCallbacks = {};

    console.log(`💬 [RealtimeService] Setting up active chat multiplexed channel for: ${conversationId}`);

    const channel = supabase
      .channel(channelName)
      // 1. New messages
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          const newMessage = payload.new as Message;
          // Client-side safety filter
          if (newMessage.conversation_id === this.activeConversationId) {
            this.chatCallbacks.onNewMessage?.(newMessage);
          }
        }
      )
      // 2. Message updates (edits, deletions)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          const updatedMessage = payload.new as Message;
          if (updatedMessage.conversation_id === this.activeConversationId) {
            this.chatCallbacks.onMessageUpdate?.(updatedMessage);
          }
        }
      )
      // 3. Read receipts
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_read_receipts',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          this.chatCallbacks.onReadReceipt?.(payload.new);
        }
      )
      // 4. Typing indicators (broadcast)
      .on(
        'broadcast',
        { event: 'typing' },
        (payload) => {
          const { userId, isTyping } = payload.payload;
          this.chatCallbacks.onTypingChange?.(userId, isTyping);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`✅ [RealtimeService] Active chat channel subscribed (${conversationId})`);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error(`❌ [RealtimeService] Active chat channel error: ${status}`);
          setTimeout(() => channel.subscribe(), 5000);
        }
      });

    this.channels.set(channelName, channel);
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
    if (this.activeConversationId === conversationId) {
      this.chatCallbacks.onNewMessage = onNewMessage;
      return () => {
        if (this.chatCallbacks.onNewMessage === onNewMessage) {
          this.chatCallbacks.onNewMessage = undefined;
        }
      };
    }
    return () => { };
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
    if (this.activeConversationId === conversationId) {
      this.chatCallbacks.onMessageUpdate = onMessageUpdate;
      return () => {
        if (this.chatCallbacks.onMessageUpdate === onMessageUpdate) {
          this.chatCallbacks.onMessageUpdate = undefined;
        }
      };
    }
    return () => { };
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
    if (this.activeConversationId === conversationId) {
      this.chatCallbacks.onReadReceipt = onReadReceipt;
      return () => {
        if (this.chatCallbacks.onReadReceipt === onReadReceipt) {
          this.chatCallbacks.onReadReceipt = undefined;
        }
      };
    }
    return () => { };
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
    if (!userId) {
      console.warn('[RealtimeService] ⚠️ Cannot subscribe to notifications: userId is missing');
      return () => { };
    }

    this.globalCallbacks.onNotification = onNotification;
    return () => {
      if (this.globalCallbacks.onNotification === onNotification) {
        this.globalCallbacks.onNotification = undefined;
      }
    };
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
    if (this.activeConversationId === conversationId) {
      this.chatCallbacks.onTypingChange = onTypingChange;
      return () => {
        if (this.chatCallbacks.onTypingChange === onTypingChange) {
          this.chatCallbacks.onTypingChange = undefined;
        }
      };
    }
    return () => { };
  }

  /**
   * Broadcast typing indicator to other participants
   * 
   * @param conversationId - Conversation UUID
   * @param isTyping - Whether user is typing
   */
  async broadcastTyping(conversationId: string, isTyping: boolean): Promise<void> {
    const channelName = 'chat-active';
    const channel = this.channels.get(channelName);

    if (channel && this.activeConversationId === conversationId) {
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
      console.warn('⚠️ Typing channel not found or inactive. Call subscribeToTyping first.');
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
 * Triggers on new conversations and changes relevant to the current user
 * 
 * @param userId - The ID of the authenticated user
 * @param onUpdate - Callback when conversation list should refresh
 * @returns Unsubscribe function
 */
  subscribeToConversations(userId: string, onUpdate: ConversationUpdateCallback): () => void {
    this.globalCallbacks.onConversationUpdate = onUpdate;
    return () => {
      if (this.globalCallbacks.onConversationUpdate === onUpdate) {
        this.globalCallbacks.onConversationUpdate = undefined;
      }
    };
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
    const channelToRemove = this.channels.get(channelName);
    if (channelToRemove) {
      try {
        await supabase.removeChannel(channelToRemove);

        // Critical Fix: Only delete from map if the CURRENT channel is the one we just removed.
        // This prevents race conditions where a NEW subscription (created during the await) gets deleted by an OLD unsubscribe.
        const currentChannel = this.channels.get(channelName);
        if (currentChannel === channelToRemove) {
          this.channels.delete(channelName);
          console.log('🔌 Unsubscribed from:', channelName);
        } else {
          console.log('🔌 Unsub finished, but channel was replaced - skipping map delete:', channelName);
        }
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
