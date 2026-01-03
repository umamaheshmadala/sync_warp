// src/hooks/useFriendRequests.ts
// React Query hooks for Story 9.1.3: Friend Requests with Auto-Expiry
// Uses friendsService and includes realtime subscriptions

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'
import { friendsService } from '../services/friendsService'
import type { FriendRequest } from '../types/friends'

/**
 * Hook for managing received friend requests (pending requests to current user)
 */
export function useReceivedFriendRequests() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  const {
    data: receivedRequests = [],
    isLoading,
    error,
    refetch
  } = useQuery<FriendRequest[], Error>({
    queryKey: ['friend-requests', 'received', user?.id],
    queryFn: async () => {
      const response = await friendsService.getFriendRequests(user!.id);
      if (!response.success) throw new Error(response.error);
      return response.data || [];
    },
    staleTime: 30000, // Cache for 30 seconds
    enabled: !!user
  })

  // Subscribe to realtime changes for requests where current user is receiver
  useEffect(() => {
    if (!user) return

    console.log('[useFriendRequests] Setting up realtime subscription for received requests')

    const channel = supabase
      .channel('received_friend_requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_requests',
          filter: `receiver_id=eq.${user.id}`
        },
        (payload) => {
          console.log('[useFriendRequests] Received request change:', payload.eventType, payload)
          // Invalidate both received and sent queries
          queryClient.invalidateQueries({ queryKey: ['friend-requests', 'received'] })
          queryClient.invalidateQueries({ queryKey: ['friends'] })
        }
      )
      .subscribe()

    return () => {
      console.log('[useFriendRequests] Cleaning up received requests subscription')
      supabase.removeChannel(channel)
    }
  }, [user, queryClient])

  return {
    receivedRequests,
    isLoading,
    error,
    refetch,
    count: receivedRequests.length
  }
}

/**
 * Hook for managing sent friend requests (pending requests from current user)
 */
export function useSentFriendRequests() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  const {
    data: sentRequests = [],
    isLoading,
    error,
    refetch
  } = useQuery<FriendRequest[], Error>({
    queryKey: ['friend-requests', 'sent', user?.id],
    queryFn: async () => {
      const response = await friendsService.getSentRequests();
      if (!response.success) throw new Error(response.error);
      return response.data || [];
    },
    staleTime: 30000,
    enabled: !!user
  })

  // Subscribe to realtime changes for requests where current user is sender
  useEffect(() => {
    if (!user) return

    console.log('[useFriendRequests] Setting up realtime subscription for sent requests')

    const channel = supabase
      .channel('sent_friend_requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_requests',
          filter: `sender_id=eq.${user.id}`
        },
        (payload) => {
          console.log('[useFriendRequests] Sent request change:', payload.eventType, payload)
          queryClient.invalidateQueries({ queryKey: ['friend-requests', 'sent'] })
        }
      )
      .subscribe()

    return () => {
      console.log('[useFriendRequests] Cleaning up sent requests subscription')
      supabase.removeChannel(channel)
    }
  }, [user, queryClient])

  return {
    sentRequests,
    isLoading,
    error,
    refetch,
    count: sentRequests.length
  }
}

/**
 * Hook for sending friend requests
 */
export function useSendFriendRequest() {
  const queryClient = useQueryClient()

  return useMutation<any, Error, { receiverId: string; message?: string }>({
    mutationFn: ({ receiverId, message }) =>
      friendsService.sendFriendRequest(receiverId, message),
    onSuccess: (data) => {
      if (data.success) {
        console.log('[useFriendRequests] Friend request sent successfully')
        // Invalidate sent requests to show new request
        queryClient.invalidateQueries({ queryKey: ['friend-requests', 'sent'] })
      } else {
        console.error('[useFriendRequests] Failed to send friend request:', data.error)
      }
    },
    onError: (error) => {
      console.error('[useFriendRequests] Send friend request error:', error)
    }
  })
}

/**
 * Hook for accepting friend requests
 */
export function useAcceptFriendRequest() {
  const queryClient = useQueryClient()

  return useMutation<any, Error, string>({
    mutationFn: (requestId) => friendsService.acceptFriendRequest(requestId),
    onSuccess: (data, requestId) => {
      if (data.success) {
        console.log('[useFriendRequests] Friend request accepted:', requestId)
        // Invalidate all friend-related queries
        queryClient.invalidateQueries({ queryKey: ['friend-requests', 'received'] })
        queryClient.invalidateQueries({ queryKey: ['friends'] })
        queryClient.invalidateQueries({ queryKey: ['friendCount'] })
      } else {
        console.error('[useFriendRequests] Failed to accept friend request:', data.error)
      }
    },
    onError: (error) => {
      console.error('[useFriendRequests] Accept friend request error:', error)
    }
  })
}

/**
 * Hook for rejecting friend requests
 */
export function useRejectFriendRequest() {
  const queryClient = useQueryClient()

  return useMutation<any, Error, string>({
    mutationFn: (requestId) => friendsService.rejectFriendRequest(requestId),
    onSuccess: (data, requestId) => {
      if (data.success) {
        console.log('[useFriendRequests] Friend request rejected:', requestId)
        queryClient.invalidateQueries({ queryKey: ['friend-requests', 'received'] })
      } else {
        console.error('[useFriendRequests] Failed to reject friend request:', data.error)
      }
    },
    onError: (error) => {
      console.error('[useFriendRequests] Reject friend request error:', error)
    }
  })
}

/**
 * Hook for canceling sent friend requests
 */
export function useCancelFriendRequest() {
  const queryClient = useQueryClient()

  return useMutation<any, Error, string>({
    mutationFn: (requestId) => friendsService.cancelFriendRequest(requestId),
    onSuccess: (data, requestId) => {
      if (data.success) {
        console.log('[useFriendRequests] Friend request cancelled:', requestId)
        // Invalidate all friend-related queries to ensure UI updates everywhere
        queryClient.invalidateQueries({ queryKey: ['friend-requests'] })
        queryClient.invalidateQueries({ queryKey: ['friendRequests'] })
        queryClient.invalidateQueries({ queryKey: ['friends-list'] })
        queryClient.invalidateQueries({ queryKey: ['pymk'] })
      } else {
        console.error('[useFriendRequests] Failed to cancel friend request:', data.error)
      }
    },
    onError: (error) => {
      console.error('[useFriendRequests] Cancel friend request error:', error)
    }
  })
}

/**
 * Combined hook for all friend request operations
 * Includes both received and sent requests, plus all mutations
 */
export function useFriendRequests() {
  const { receivedRequests, isLoading: isLoadingReceived } = useReceivedFriendRequests()
  const { sentRequests, isLoading: isLoadingSent } = useSentFriendRequests()
  const sendRequest = useSendFriendRequest()
  const acceptRequest = useAcceptFriendRequest()
  const rejectRequest = useRejectFriendRequest()
  const cancelRequest = useCancelFriendRequest()

  return {
    // Received requests
    receivedRequests,
    receivedCount: receivedRequests.length,

    // Sent requests
    sentRequests,
    sentCount: sentRequests.length,

    // Loading states
    isLoading: isLoadingReceived || isLoadingSent,
    isLoadingReceived,
    isLoadingSent,

    // Mutations
    sendRequest: sendRequest.mutate,
    acceptRequest: acceptRequest.mutate,
    rejectRequest: rejectRequest.mutate,
    cancelRequest: cancelRequest.mutate,

    // Mutation states
    isSending: sendRequest.isPending,
    isAccepting: acceptRequest.isPending,
    isRejecting: rejectRequest.isPending,
    isCancelling: cancelRequest.isPending
  }
}

export default useFriendRequests
