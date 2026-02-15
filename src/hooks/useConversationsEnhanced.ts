/**
 * Enhanced Conversations Hooks
 * Story 9.1.9: Messaging Integration
 * 
 * React Query hooks for conversations with friend status
 */

import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import {
  getConversationsWithFriendStatus,
  createOrGetDirectConversation,
  canMessageUser,
  getConversationById,
  type ConversationWithFriendStatus,
} from '../services/conversationService';

/**
 * Get conversations with friend/online status
 * Includes realtime updates
 */
export function useConversationsWithStatus(): UseQueryResult<ConversationWithFriendStatus[]> {
  return useQuery({
    queryKey: ['conversations-with-status'],
    queryFn: ({ signal }) => getConversationsWithFriendStatus(signal),
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
    refetchOnWindowFocus: true,
  });
}

/**
 * Create or get direct conversation with friendship validation
 */
export function useCreateConversation(): UseMutationResult<string, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createOrGetDirectConversation,
    onSuccess: (conversationId) => {
      // Invalidate conversations list to refresh
      queryClient.invalidateQueries({ queryKey: ['conversations-with-status'] });
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      console.log('✅ Conversation created/retrieved:', conversationId);
    },
    onError: (error) => {
      console.error('❌ Failed to create conversation:', error.message);
    },
  });
}

/**
 * Check if current user can message another user
 */
export function useCanMessageUser(userId: string | null): UseQueryResult<boolean> {
  return useQuery({
    queryKey: ['can-message', userId],
    queryFn: () => (userId ? canMessageUser(userId) : Promise.resolve(false)),
    enabled: !!userId,
    staleTime: 30000,
  });
}

/**
 * Get conversation by ID with friend status
 */
export function useConversationById(
  conversationId: string | null
): UseQueryResult<ConversationWithFriendStatus | null> {
  return useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => (conversationId ? getConversationById(conversationId) : Promise.resolve(null)),
    enabled: !!conversationId,
    staleTime: 30000,
  });
}
