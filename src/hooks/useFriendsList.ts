// src/hooks/useFriendsList.ts
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { friendService } from '../services/friendService'
import { supabase } from '../lib/supabase'
import type { Friendship } from '../services/friendService'

interface UseFriendsListOptions {
  userId: string
  enabled?: boolean
}

/**
 * React Query hook for fetching friends list with realtime updates
 * 
 * Features:
 * - Automatic caching with React Query
 * - Realtime subscriptions for instant updates
 * - Optimistic updates for better UX
 * - Automatic refetch on window focus
 */
export function useFriendsList({ userId, enabled = true }: UseFriendsListOptions) {
  const queryClient = useQueryClient()
  
  // Query friends list with caching
  const { 
    data: friends, 
    isLoading, 
    error,
    refetch 
  } = useQuery<Friendship[], Error>({
    queryKey: ['friends', userId],
    queryFn: () => friendService.getFriends(userId),
    staleTime: 30000, // Cache for 30 seconds
    enabled: enabled && !!userId,
  })

  // Subscribe to realtime friendship changes
  useEffect(() => {
    if (!userId || !enabled) return

    console.log('[useFriendsList] Setting up realtime subscription for user:', userId)

    const channel = friendService.subscribeToFriendshipChanges(
      userId,
      (payload) => {
        console.log('[useFriendsList] Friendship change detected:', payload.eventType, payload)

        // Invalidate cache to trigger refetch
        queryClient.invalidateQueries({ queryKey: ['friends', userId] })

        // Also invalidate friend count
        queryClient.invalidateQueries({ queryKey: ['friendCount', userId] })
      }
    )

    // Cleanup subscription on unmount
    return () => {
      console.log('[useFriendsList] Cleaning up realtime subscription')
      supabase.removeChannel(channel)
    }
  }, [userId, queryClient, enabled])

  // Subscribe to profile updates (online status, etc.)
  useEffect(() => {
    if (!userId || !enabled || !friends || friends.length === 0) return

    const friendIds = friends.map(f => f.friend_id)
    
    console.log('[useFriendsList] Subscribing to profile updates for', friendIds.length, 'friends')

    const channel = supabase
      .channel('friend_profiles_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
        },
        (payload) => {
          // Only update if it's one of the user's friends
          if (friendIds.includes(payload.new.id)) {
            console.log('[useFriendsList] Friend profile updated:', payload.new.id)
            
            // Optimistically update the cache
            queryClient.setQueryData<Friendship[]>(
              ['friends', userId],
              (oldData) => {
                if (!oldData) return oldData
                
                return oldData.map(friendship => {
                  if (friendship.friend_id === payload.new.id) {
                    return {
                      ...friendship,
                      friend_profile: {
                        ...friendship.friend_profile,
                        ...payload.new,
                        user_id: friendship.friend_id
                      }
                    }
                  }
                  return friendship
                })
              }
            )
          }
        }
      )
      .subscribe()

    return () => {
      console.log('[useFriendsList] Cleaning up profile subscription')
      supabase.removeChannel(channel)
    }
  }, [userId, friends, queryClient, enabled])

  return {
    friends: friends || [],
    isLoading,
    error,
    refetch,
    friendCount: friends?.length || 0
  }
}

/**
 * Hook for friend count only (lighter weight)
 */
export function useFriendCount(userId: string, enabled = true) {
  const { data: count, isLoading, error } = useQuery<number, Error>({
    queryKey: ['friendCount', userId],
    queryFn: () => friendService.getFriendCount(userId),
    staleTime: 60000, // Cache for 1 minute
    enabled: enabled && !!userId,
  })

  return {
    count: count || 0,
    isLoading,
    error
  }
}

/**
 * Hook for checking friendship status
 */
export function useFriendshipStatus(userId: string, targetUserId: string, enabled = true) {
  const { data: isFriend, isLoading, error } = useQuery<boolean, Error>({
    queryKey: ['friendshipStatus', userId, targetUserId],
    queryFn: () => friendService.areFriends(userId, targetUserId),
    staleTime: 30000, // Cache for 30 seconds
    enabled: enabled && !!userId && !!targetUserId,
  })

  return {
    isFriend: isFriend || false,
    isLoading,
    error
  }
}

/**
 * Hook for mutual friends
 */
export function useMutualFriends(userId: string, otherUserId: string, enabled = true) {
  const { data: mutualFriends, isLoading, error } = useQuery({
    queryKey: ['mutualFriends', userId, otherUserId],
    queryFn: () => friendService.getMutualFriends(userId, otherUserId),
    staleTime: 60000, // Cache for 1 minute
    enabled: enabled && !!userId && !!otherUserId,
  })

  return {
    mutualFriends: mutualFriends || [],
    mutualCount: mutualFriends?.length || 0,
    isLoading,
    error
  }
}
