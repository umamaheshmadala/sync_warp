// src/store/messagingStore.ts
// Global messaging state management with platform-specific memory optimizations
// Story: 8.2.3 - Zustand State Management

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import type { Message, ConversationWithDetails } from '../types/messaging';

// ============================================================================
// Constants - Platform-Specific Memory Limits
// ============================================================================

/**
 * Memory constraints by platform:
 * - Web (Desktop): 16-32GB RAM → 200-500MB budget for messaging
 * - iOS: 2-6GB RAM → 50-100MB budget
 * - Android: 2-8GB RAM → 50-150MB budget
 */
const MAX_CACHED_MESSAGES = Capacitor.isNativePlatform() ? 100 : 500;
const MAX_CACHED_CONVERSATIONS = Capacitor.isNativePlatform() ? 50 : 200;

// Persistence keys for mobile
const STORAGE_KEYS = {
  UNREAD_COUNTS: 'messaging_unread_counts',
  ACTIVE_CONVERSATION: 'messaging_active_conversation',
};

// ============================================================================
// State Interface
// ============================================================================

interface MessagingState {
  // Conversations
  conversations: ConversationWithDetails[];
  activeConversationId: string | null;
  
  // Messages (Map for efficient O(1) lookup by conversation ID)
  messages: Map<string, Message[]>;
  
  // Unread counts
  unreadCounts: Map<string, number>; // conversationId -> count
  totalUnreadCount: number;
  
  // Typing indicators (Map<conversationId, Set<userId>>)
  typingUsers: Map<string, Set<string>>;
  
  // UI Loading States
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  isSendingMessage: boolean;
  
  // ============================================================================
  // Conversation Actions
  // ============================================================================
  
  setConversations: (conversations: ConversationWithDetails[]) => void;
  addConversation: (conversation: ConversationWithDetails) => void;
  updateConversation: (conversationId: string, updates: Partial<ConversationWithDetails>) => void;
  removeConversation: (conversationId: string) => void;
  setActiveConversation: (conversationId: string | null) => void;
  
  // ============================================================================
  // Message Actions
  // ============================================================================
  
  setMessages: (conversationId: string, messages: Message[]) => void;
  addMessage: (conversationId: string, message: Message) => void;
  updateMessage: (conversationId: string, messageId: string, updates: Partial<Message>) => void;
  removeMessage: (conversationId: string, messageId: string) => void;
  prependMessages: (conversationId: string, messages: Message[]) => void; // For pagination
  
  // Optimistic Updates (Story 8.2.7)
  addOptimisticMessage: (conversationId: string, message: Message) => void;
  replaceOptimisticMessage: (conversationId: string, tempId: string, realMessage: Message) => void;
  markMessageFailed: (conversationId: string, tempId: string) => void;
  
  // ============================================================================
  // Unread Count Actions
  // ============================================================================
  
  setUnreadCount: (conversationId: string, count: number) => void;
  incrementUnreadCount: (conversationId: string) => void;
  clearUnreadCount: (conversationId: string) => void;
  setTotalUnreadCount: (count: number) => void;
  
  // ============================================================================
  // Optimistic Conversation Actions
  // ============================================================================
  
  togglePinOptimistic: (conversationId: string) => void;
  toggleArchiveOptimistic: (conversationId: string) => void;
  toggleMuteOptimistic: (conversationId: string, isMuted: boolean) => void;
  
  // ============================================================================
  // Typing Indicator Actions
  // ============================================================================
  
  addTypingUser: (conversationId: string, userId: string) => void;
  removeTypingUser: (conversationId: string, userId: string) => void;
  getTypingUsers: (conversationId: string) => string[];
  
  // ============================================================================
  // Loading State Actions
  // ============================================================================
  
  setLoadingConversations: (loading: boolean) => void;
  setLoadingMessages: (loading: boolean) => void;
  setSendingMessage: (sending: boolean) => void;
  
  // ============================================================================
  // Persistence & Reset
  // ============================================================================
  
  saveUnreadCounts: () => Promise<void>;
  loadUnreadCounts: () => Promise<void>;
  reset: () => void;
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useMessagingStore = create<MessagingState>()(
  devtools(
    (set, get) => ({
      // Initial State
      conversations: [],
      activeConversationId: null,
      messages: new Map(),
      unreadCounts: new Map(),
      totalUnreadCount: 0,
      typingUsers: new Map(),
      isLoadingConversations: false,
      isLoadingMessages: false,
      isSendingMessage: false,

      // ========================================================================
      // Conversation Actions
      // ========================================================================

      setConversations: (conversations) => {
        // Apply platform-specific limits
        const limitedConversations = Capacitor.isNativePlatform()
          ? conversations.slice(0, MAX_CACHED_CONVERSATIONS)
          : conversations;
        
        // Calculate unread counts
        const unreadCounts = new Map<string, number>();
        let totalUnreadCount = 0;
        
        limitedConversations.forEach(c => {
          const count = c.unread_count || 0;
          if (count > 0) {
            unreadCounts.set(c.conversation_id, count);
            totalUnreadCount += count;
          }
        });

        set({ 
          conversations: limitedConversations,
          unreadCounts,
          totalUnreadCount
        }, false, 'setConversations');
      },

      addConversation: (conversation) =>
        set((state) => {
          const updatedConversations = [conversation, ...state.conversations];
          
          // Trim excess conversations on mobile to prevent memory bloat
          const finalConversations = Capacitor.isNativePlatform()
            ? updatedConversations.slice(0, MAX_CACHED_CONVERSATIONS)
            : updatedConversations;
          
          // Update counts
          const newCounts = new Map(state.unreadCounts);
          const count = conversation.unread_count || 0;
          if (count > 0) {
            newCounts.set(conversation.conversation_id, count);
          }
          
          return { 
            conversations: finalConversations,
            unreadCounts: newCounts,
            totalUnreadCount: state.totalUnreadCount + count
          };
        }, false, 'addConversation'),

      updateConversation: (conversationId, updates) =>
        set((state) => {
          const updatedConversations = state.conversations.map(conv =>
            conv.conversation_id === conversationId
              ? { ...conv, ...updates }
              : conv
          );

          // Recalculate if unread_count changed
          let unreadCounts = state.unreadCounts;
          let totalUnreadCount = state.totalUnreadCount;

          if (updates.unread_count !== undefined) {
            unreadCounts = new Map(state.unreadCounts);
            const oldCount = state.unreadCounts.get(conversationId) || 0;
            const newCount = updates.unread_count;
            
            unreadCounts.set(conversationId, newCount);
            totalUnreadCount = totalUnreadCount - oldCount + newCount;
          }

          return {
            conversations: updatedConversations,
            unreadCounts,
            totalUnreadCount
          };
        }, false, 'updateConversation'),

      removeConversation: (conversationId) =>
        set((state) => {
          const updatedConversations = state.conversations.filter(
            c => c.conversation_id !== conversationId
          );
          
          // Also remove from unread counts
          const newCounts = new Map(state.unreadCounts);
          const removedCount = newCounts.get(conversationId) || 0;
          newCounts.delete(conversationId);
          
          return {
            conversations: updatedConversations,
            unreadCounts: newCounts,
            totalUnreadCount: Math.max(0, state.totalUnreadCount - removedCount)
          };
        }, false, 'removeConversation'),

      setActiveConversation: (conversationId) => {
        set({ activeConversationId: conversationId }, false, 'setActiveConversation');
        
        // Persist active conversation on mobile
        if (Capacitor.isNativePlatform() && conversationId) {
          Preferences.set({
            key: STORAGE_KEYS.ACTIVE_CONVERSATION,
            value: conversationId
          }).catch(err => console.error('Failed to save active conversation:', err));
        }
      },

      // ========================================================================
      // Message Actions
      // ========================================================================

      setMessages: (conversationId, messages) =>
        set((state) => {
          const newMessages = new Map(state.messages);
          
          // Limit cache on mobile to prevent memory bloat
          const limitedMessages = Capacitor.isNativePlatform()
            ? messages.slice(-MAX_CACHED_MESSAGES) // Keep last N messages
            : messages;
          
          newMessages.set(conversationId, limitedMessages);
          return { messages: newMessages };
        }, false, 'setMessages'),

      addMessage: (conversationId, message) =>
        set((state) => {
          const newMessages = new Map(state.messages);
          const conversationMessages = newMessages.get(conversationId) || [];
          
          // Prevent duplicates (fix for double rendering on realtime + fetch race)
          if (conversationMessages.some(m => m.id === message.id)) {
            return {}; // No change if message already exists
          }

          const updatedMessages = [...conversationMessages, message];
          
          // Enforce cache limit on mobile
          const finalMessages = Capacitor.isNativePlatform()
            ? updatedMessages.slice(-MAX_CACHED_MESSAGES)
            : updatedMessages;
          
          newMessages.set(conversationId, finalMessages);
          return { messages: newMessages };
        }, false, 'addMessage'),

      updateMessage: (conversationId, messageId, updates) =>
        set((state) => {
          const newMessages = new Map(state.messages);
          const conversationMessages = newMessages.get(conversationId) || [];
          newMessages.set(
            conversationId,
            conversationMessages.map(msg =>
              msg.id === messageId ? { ...msg, ...updates } : msg
            )
          );
          return { messages: newMessages };
        }, false, 'updateMessage'),

      removeMessage: (conversationId, messageId) =>
        set((state) => {
          const newMessages = new Map(state.messages);
          const conversationMessages = newMessages.get(conversationId) || [];
          newMessages.set(
            conversationId,
            conversationMessages.filter(msg => msg.id !== messageId)
          );
          return { messages: newMessages };
        }, false, 'removeMessage'),

      prependMessages: (conversationId, messages) =>
        set((state) => {
          const newMessages = new Map(state.messages);
          const existing = newMessages.get(conversationId) || [];
          const combined = [...messages, ...existing];
          
          // Enforce cache limit on mobile
          const finalMessages = Capacitor.isNativePlatform()
            ? combined.slice(-MAX_CACHED_MESSAGES)
            : combined;
          
          newMessages.set(conversationId, finalMessages);
          return { messages: newMessages };
        }, false, 'prependMessages'),
      
      // ========================================================================
      // Optimistic Update Actions (Story 8.2.7)
      // ========================================================================
      
      addOptimisticMessage: (conversationId, message) =>
        set((state) => {
          const newMessages = new Map(state.messages);
          const conversationMessages = newMessages.get(conversationId) || [];
          
          // Add optimistic message with _optimistic flag
          const optimisticMessage = {
            ...message,
            _optimistic: true,
            _failed: false
          };
          
          const updatedMessages = [...conversationMessages, optimisticMessage];
          
          // Enforce cache limit on mobile
          const finalMessages = Capacitor.isNativePlatform()
            ? updatedMessages.slice(-MAX_CACHED_MESSAGES)
            : updatedMessages;
          
          newMessages.set(conversationId, finalMessages);
          return { messages: newMessages };
        }, false, 'addOptimisticMessage'),
      
      replaceOptimisticMessage: (conversationId, tempId, realMessage) =>
        set((state) => {
          const newMessages = new Map(state.messages);
          const conversationMessages = newMessages.get(conversationId) || [];
          
          // Find and replace optimistic message with real message
          const updatedMessages = conversationMessages.map(msg =>
            msg._tempId === tempId ? realMessage : msg
          );
          
          newMessages.set(conversationId, updatedMessages);
          return { messages: newMessages };
        }, false, 'replaceOptimisticMessage'),
      
      markMessageFailed: (conversationId, tempId) =>
        set((state) => {
          const newMessages = new Map(state.messages);
          const conversationMessages = newMessages.get(conversationId) || [];
          
          // Mark optimistic message as failed
          const updatedMessages = conversationMessages.map(msg =>
            msg._tempId === tempId
              ? { ...msg, _optimistic: false, _failed: true }
              : msg
          );
          
          newMessages.set(conversationId, updatedMessages);
          return { messages: newMessages };
        }, false, 'markMessageFailed'),

      // ========================================================================
      // Unread Count Actions
      // ========================================================================

      setUnreadCount: (conversationId, count) =>
        set((state) => {
          const newCounts = new Map(state.unreadCounts);
          newCounts.set(conversationId, count);
          
          // Auto-save on mobile
          if (Capacitor.isNativePlatform()) {
            get().saveUnreadCounts().catch(err => 
              console.error('Failed to save unread counts:', err)
            );
          }
          
          return { unreadCounts: newCounts };
        }, false, 'setUnreadCount'),

      incrementUnreadCount: (conversationId) =>
        set((state) => {
          const newCounts = new Map(state.unreadCounts);
          const current = newCounts.get(conversationId) || 0;
          newCounts.set(conversationId, current + 1);
          
          // Auto-save on mobile
          if (Capacitor.isNativePlatform()) {
            get().saveUnreadCounts().catch(err => 
              console.error('Failed to save unread counts:', err)
            );
          }
          
          return {
            unreadCounts: newCounts,
            totalUnreadCount: state.totalUnreadCount + 1
          };
        }, false, 'incrementUnreadCount'),

      clearUnreadCount: (conversationId) =>
        set((state) => {
          const newCounts = new Map(state.unreadCounts);
          const removed = newCounts.get(conversationId) || 0;
          newCounts.set(conversationId, 0);
          
          // Auto-save on mobile
          if (Capacitor.isNativePlatform()) {
            get().saveUnreadCounts().catch(err => 
              console.error('Failed to save unread counts:', err)
            );
          }
          
          return {
            unreadCounts: newCounts,
            totalUnreadCount: Math.max(0, state.totalUnreadCount - removed)
          };
        }, false, 'clearUnreadCount'),

      setTotalUnreadCount: (count) =>
        set({ totalUnreadCount: count }, false, 'setTotalUnreadCount'),

      // ========================================================================
      // Optimistic Conversation Actions
      // ========================================================================

      togglePinOptimistic: (conversationId) =>
        set((state) => ({
          conversations: state.conversations.map(c =>
            c.conversation_id === conversationId
              ? { ...c, is_pinned: !c.is_pinned }
              : c
          )
        }), false, 'togglePinOptimistic'),

      toggleArchiveOptimistic: (conversationId) =>
        set((state) => ({
          conversations: state.conversations.map(c =>
            c.conversation_id === conversationId
              ? { ...c, is_archived: !c.is_archived }
              : c
          )
        }), false, 'toggleArchiveOptimistic'),

      toggleMuteOptimistic: (conversationId, isMuted) =>
        set((state) => ({
          conversations: state.conversations.map(c =>
            c.conversation_id === conversationId
              ? { ...c, is_muted: isMuted }
              : c
          )
        }), false, 'toggleMuteOptimistic'),

      // ========================================================================
      // Typing Indicator Actions
      // ========================================================================

      addTypingUser: (conversationId, userId) =>
        set((state) => {
          const newTyping = new Map(state.typingUsers);
          const users = new Set<string>(newTyping.get(conversationId) || []);
          users.add(userId);
          newTyping.set(conversationId, users);
          return { typingUsers: newTyping };
        }, false, 'addTypingUser'),

      removeTypingUser: (conversationId, userId) =>
        set((state) => {
          const newTyping = new Map(state.typingUsers);
          const users = new Set<string>(newTyping.get(conversationId) || []);
          users.delete(userId);
          newTyping.set(conversationId, users);
          return { typingUsers: newTyping };
        }, false, 'removeTypingUser'),

      getTypingUsers: (conversationId) => {
        const users = get().typingUsers.get(conversationId);
        return users ? Array.from(users) : [];
      },

      // ========================================================================
      // Loading State Actions
      // ========================================================================

      setLoadingConversations: (loading) =>
        set({ isLoadingConversations: loading }, false, 'setLoadingConversations'),

      setLoadingMessages: (loading) =>
        set({ isLoadingMessages: loading }, false, 'setLoadingMessages'),

      setSendingMessage: (sending) =>
        set({ isSendingMessage: sending }, false, 'setSendingMessage'),

      // ========================================================================
      // Persistence (Mobile Only)
      // ========================================================================

      saveUnreadCounts: async () => {
        if (!Capacitor.isNativePlatform()) return;
        
        try {
          const counts = Array.from(get().unreadCounts.entries());
          await Preferences.set({
            key: STORAGE_KEYS.UNREAD_COUNTS,
            value: JSON.stringify(counts)
          });
          console.log('💾 Unread counts saved');
        } catch (error) {
          console.error('Failed to save unread counts:', error);
        }
      },

      loadUnreadCounts: async () => {
        if (!Capacitor.isNativePlatform()) return;
        
        try {
          const { value } = await Preferences.get({ key: STORAGE_KEYS.UNREAD_COUNTS });
          if (value) {
            const counts = JSON.parse(value) as [string, number][];
            const unreadCounts = new Map(counts);
            const totalUnreadCount = Array.from(unreadCounts.values())
              .reduce((sum, count) => sum + count, 0);
            
            set({ unreadCounts, totalUnreadCount }, false, 'loadUnreadCounts');
            console.log('📂 Unread counts loaded:', totalUnreadCount);
          }
        } catch (error) {
          console.error('Failed to load unread counts:', error);
        }
      },

      // ========================================================================
      // Reset (Logout/Cleanup)
      // ========================================================================

      reset: () => {
        // Clear persisted data on mobile
        if (Capacitor.isNativePlatform()) {
          Preferences.remove({ key: STORAGE_KEYS.UNREAD_COUNTS })
            .catch(err => console.error('Failed to clear unread counts:', err));
          Preferences.remove({ key: STORAGE_KEYS.ACTIVE_CONVERSATION })
            .catch(err => console.error('Failed to clear active conversation:', err));
        }
        
        set({
          conversations: [],
          activeConversationId: null,
          messages: new Map(),
          unreadCounts: new Map(),
          totalUnreadCount: 0,
          typingUsers: new Map(),
          isLoadingConversations: false,
          isLoadingMessages: false,
          isSendingMessage: false
        }, false, 'reset');
        
        console.log('🔄 Messaging store reset');
      }
    }),
    { name: 'Messaging Store' }
  )
);

// ============================================================================
// Selector Helpers (Performance Optimization)
// ============================================================================

/**
 * Selectors to prevent unnecessary re-renders
 * Use these in components instead of accessing state directly
 */
export const messagingSelectors = {
  // Get messages for a specific conversation
  getMessages: (conversationId: string) => (state: MessagingState) =>
    state.messages.get(conversationId) || [],
  
  // Get unread count for a specific conversation
  getUnreadCount: (conversationId: string) => (state: MessagingState) =>
    state.unreadCounts.get(conversationId) || 0,
  
  // Get typing users for a specific conversation
  getTypingUsers: (conversationId: string) => (state: MessagingState) =>
    Array.from(state.typingUsers.get(conversationId) || new Set()),
  
  // Get active conversation details
  getActiveConversation: (state: MessagingState) =>
    state.conversations.find(c => c.conversation_id === state.activeConversationId),
  
  // Check if any message is being sent
  isSending: (state: MessagingState) =>
    state.isSendingMessage,
  
  // Check if conversations are loading
  isLoadingConversations: (state: MessagingState) =>
    state.isLoadingConversations,
  
  // Check if messages are loading
  isLoadingMessages: (state: MessagingState) =>
    state.isLoadingMessages
};

// ============================================================================
// Export for testing
// ============================================================================

export { MAX_CACHED_MESSAGES, MAX_CACHED_CONVERSATIONS, STORAGE_KEYS };
