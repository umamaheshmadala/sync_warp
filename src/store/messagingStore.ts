// src/store/messagingStore.ts
// Global messaging state management with platform-specific memory optimizations
// Story: 8.2.3 - Zustand State Management

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import type { ConversationWithDetails } from '../types/messaging';

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
  activeConversationId: string | null;

  // Typing indicators (Map<conversationId, Set<userId>>)
  typingUsers: Record<string, string[]>;

  // UI Loading States
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  isSendingMessage: boolean;

  // Video Playback State
  playingVideoId: string | null;
  setPlayingVideo: (videoId: string | null) => void;

  setActiveConversation: (conversationId: string | null) => void;


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

  reset: () => void;
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useMessagingStore = create<MessagingState>()(
  devtools(
    (set, get) => ({
      // Initial State
      activeConversationId: null,
      typingUsers: {},
      isLoadingConversations: false,
      isLoadingMessages: false,
      isSendingMessage: false,
      playingVideoId: null,

      setPlayingVideo: (videoId) => set({ playingVideoId: videoId }, false, 'setPlayingVideo'),



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
      // Typing Indicator Actions
      // ========================================================================

      addTypingUser: (conversationId, userId) =>
        set((state) => {
          const newTyping = { ...state.typingUsers };
          const users = newTyping[conversationId] ? [...newTyping[conversationId]] : [];
          if (!users.includes(userId)) users.push(userId);
          newTyping[conversationId] = users;
          return { typingUsers: newTyping };
        }, false, 'addTypingUser'),

      removeTypingUser: (conversationId, userId) =>
        set((state) => {
          const newTyping = { ...state.typingUsers };
          const current = newTyping[conversationId] || [];
          newTyping[conversationId] = current.filter(u => u !== userId);
          return { typingUsers: newTyping };
        }, false, 'removeTypingUser'),

      getTypingUsers: (conversationId) => {
        const users = get().typingUsers[conversationId];
        return users ? [...users] : [];
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
          activeConversationId: null,
          typingUsers: {},
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

  // Get active conversation details (Note: You may need to fetch this from React Query instead depending on usage)
  getActiveConversation: (state: MessagingState) =>
    null, // Removed conversations from state

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
