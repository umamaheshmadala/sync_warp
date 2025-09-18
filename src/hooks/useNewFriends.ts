// src/hooks/useNewFriends.ts
// BRAND NEW Friends Hook - Clean & Simple

import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'
import newFriendService, { type Friend, type FriendRequest, type FriendProfile } from '../services/newFriendService'

interface UseNewFriendsReturn {
  // State
  friends: Friend[]
  friendRequests: FriendRequest[]
  loading: boolean
  error: string | null
  
  // Actions
  searchUsers: (query: string) => Promise<FriendProfile[]>
  sendFriendRequest: (targetUserId: string) => Promise<void>
  acceptFriendRequest: (requestId: string) => Promise<void>
  rejectFriendRequest: (requestId: string) => Promise<void>
  removeFriend: (friendId: string) => Promise<void>
  refreshFriends: () => Promise<void>
  
  // Computed values
  totalFriends: number
  onlineCount: number
}

export const useNewFriends = (): UseNewFriendsReturn => {
  const { user } = useAuthStore()
  
  // State
  const [friends, setFriends] = useState<Friend[]>([])
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Load all friend data
   */
  const loadFriendData = useCallback(async () => {
    if (!user) return

    try {
      console.log('🔄 Loading friend data for user:', user.id)
      setLoading(true)
      setError(null)
      
      const [friendsData, requestsData] = await Promise.all([
        newFriendService.getFriends(),
        newFriendService.getFriendRequests()
      ])
      
      console.log('✅ Loaded data:', { friends: friendsData.length, requests: requestsData.length })
      setFriends(friendsData)
      setFriendRequests(requestsData)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load friend data'
      console.error('❌ Load friend data error:', errorMsg)
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }, [user])

  /**
   * Search for users
   */
  const searchUsers = useCallback(async (query: string): Promise<FriendProfile[]> => {
    if (!user || !query.trim()) return []

    try {
      console.log('🔍 Searching users:', query)
      return await newFriendService.searchUsers(query.trim(), user.id)
    } catch (err) {
      console.error('❌ Search users error:', err)
      return []
    }
  }, [user])

  /**
   * Send friend request
   */
  const sendFriendRequest = useCallback(async (targetUserId: string): Promise<void> => {
    if (!user) throw new Error('Not authenticated')

    try {
      console.log('📤 Sending friend request to:', targetUserId)
      await newFriendService.sendFriendRequest(targetUserId)
      console.log('✅ Friend request sent successfully')
      
      // Optionally refresh requests to show sent request
      // Note: sent requests won't show in pending_friend_requests view since they're for the receiver
    } catch (err) {
      console.error('❌ Send friend request failed:', err)
      throw err
    }
  }, [user])

  /**
   * Accept friend request
   */
  const acceptFriendRequest = useCallback(async (requestId: string): Promise<void> => {
    try {
      console.log('✅ Accepting friend request:', requestId)
      const success = await newFriendService.acceptFriendRequest(requestId)
      
      if (success) {
        console.log('✅ Friend request accepted, refreshing data')
        // Refresh all data to show new friend and remove request
        await loadFriendData()
      } else {
        throw new Error('Failed to accept friend request')
      }
    } catch (err) {
      console.error('❌ Accept friend request failed:', err)
      throw err
    }
  }, [loadFriendData])

  /**
   * Reject friend request
   */
  const rejectFriendRequest = useCallback(async (requestId: string): Promise<void> => {
    try {
      console.log('❌ Rejecting friend request:', requestId)
      const success = await newFriendService.rejectFriendRequest(requestId)
      
      if (success) {
        console.log('✅ Friend request rejected, removing from list')
        // Remove from local state immediately
        setFriendRequests(prev => prev.filter(req => req.id !== requestId))
      } else {
        throw new Error('Failed to reject friend request')
      }
    } catch (err) {
      console.error('❌ Reject friend request failed:', err)
      throw err
    }
  }, [])

  /**
   * Remove friend
   */
  const removeFriend = useCallback(async (friendId: string): Promise<void> => {
    if (!user) throw new Error('Not authenticated')

    try {
      console.log('🗑️ Removing friend:', friendId)
      await newFriendService.removeFriend(friendId)
      
      // Remove from local state immediately
      setFriends(prev => prev.filter(friend => friend.friend_id !== friendId))
      console.log('✅ Friend removed successfully')
    } catch (err) {
      console.error('❌ Remove friend failed:', err)
      throw err
    }
  }, [user])

  /**
   * Refresh all friend data
   */
  const refreshFriends = useCallback(async (): Promise<void> => {
    console.log('🔄 Manually refreshing friend data')
    await loadFriendData()
  }, [loadFriendData])

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return

    console.log('🔄 Setting up real-time subscriptions')
    
    // Subscribe to friend_connections changes
    const friendConnectionsSubscription = supabase
      .channel('friend_connections_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_connections',
          filter: `user_a_id=eq.${user.id},user_b_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔄 Friend connection changed:', payload)
          // Refresh friend data when connections change
          loadFriendData()
        }
      )
      .subscribe()

    // Subscribe to profiles changes for online status
    const profilesSubscription = supabase
      .channel('profiles_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles'
        },
        (payload) => {
          console.log('🔄 Profile updated:', payload)
          // Update friends list with new online status
          setFriends(prev => prev.map(friend => {
            if (friend.friend_profile.id === payload.new.id) {
              return {
                ...friend,
                friend_profile: {
                  ...friend.friend_profile,
                  is_online: payload.new.is_online,
                  last_active: payload.new.last_active
                }
              }
            }
            return friend
          }))
        }
      )
      .subscribe()

    return () => {
      console.log('🔄 Cleaning up real-time subscriptions')
      friendConnectionsSubscription.unsubscribe()
      profilesSubscription.unsubscribe()
    }
  }, [user, loadFriendData])

  // Load initial data when user changes
  useEffect(() => {
    if (user) {
      console.log('👤 User logged in, loading friend data')
      loadFriendData()
    } else {
      console.log('👤 User logged out, clearing friend data')
      setFriends([])
      setFriendRequests([])
      setError(null)
    }
  }, [user, loadFriendData])

  // Computed values
  const totalFriends = friends.length
  const onlineCount = friends.filter(f => f.friend_profile.is_online).length

  return {
    // State
    friends,
    friendRequests,
    loading,
    error,
    
    // Actions
    searchUsers,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    refreshFriends,
    
    // Computed values
    totalFriends,
    onlineCount
  }
}

export default useNewFriends