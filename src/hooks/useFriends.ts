// src/hooks/useFriends.ts
import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../store/authStore'
import { friendsService } from '../services/friendsService'
import type { Friendship as BaseFriendship, FriendRequest, FriendActivity, Friend } from '../types/friends'
import { useHapticFeedback } from './useHapticFeedback'
import type { RealtimeChannel } from '@supabase/supabase-js'

// Extend Friendship to include the friend profile as returned by the service
interface Friendship extends BaseFriendship {
  friend: Friend;
}

interface UseFriendsReturn {
  // State
  friends: Friendship[]
  friendRequests: FriendRequest[]
  friendActivity: FriendActivity[]
  loading: boolean
  error: string | null

  // Actions
  searchUsers: (query: string) => Promise<Friend[]>
  sendFriendRequest: (receiverId: string) => Promise<void>
  acceptFriendRequest: (requestId: string) => Promise<void>
  rejectFriendRequest: (requestId: string) => Promise<void>
  removeFriend: (friendId: string) => Promise<void>
  shareDeal: (friendId: string, dealData: any) => Promise<void>
  refreshFriends: () => Promise<void>
  updateOnlineStatus: (isOnline: boolean) => Promise<void>

  // Computed values
  onlineFriends: Friendship[]
  offlineFriends: Friendship[]
  totalFriends: number
  onlineCount: number
}

export const useFriends = (): UseFriendsReturn => {
  const { user } = useAuthStore()
  const { triggerHaptic } = useHapticFeedback()

  // State
  const [friends, setFriends] = useState<Friendship[]>([])
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([])
  const [friendActivity, setFriendActivity] = useState<FriendActivity[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [realtimeChannel, setRealtimeChannel] = useState<RealtimeChannel | null>(null)

  /**
   * Load friends data
   */
  const loadFriends = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      console.log('Loading friends data for user:', user.id)

      const [friendsData, requestsData, activityData] = await Promise.all([
        friendsService.getFriends(user.id),
        friendsService.getFriendRequests(user.id),
        friendsService.getFriendActivity(user.id, 20)
      ])

      console.log('Loaded friend requests:', requestsData)

      // Service returns Friend[], map to Friendship structure
      const friendsList = friendsData.data || [];
      const mappedFriends: Friendship[] = friendsList.map(friend => ({
        id: `temp-${friend.id}`, // Placeholder as service doesn't return friendship ID
        user_id: user.id,
        friend_id: friend.id,
        status: 'active',
        created_at: new Date().toISOString(),
        friend: friend
      }));

      setFriends(mappedFriends)
      setFriendRequests(requestsData.data || [])
      setFriendActivity(activityData.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load friends')
      console.error('Error loading friends:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  /**
   * Search for users to add as friends
   */
  const searchUsers = useCallback(async (query: string): Promise<Friend[]> => {
    if (!user || !query.trim()) return []

    try {
      const response = await friendsService.searchUsers(query.trim())
      return response.data || []
    } catch (err) {
      console.error('Error searching users:', err)
      return []
    }
  }, [user])

  /**
   * Send friend request
   */
  const sendFriendRequest = useCallback(async (receiverId: string): Promise<void> => {
    if (!user) throw new Error('Not authenticated')

    try {
      await friendsService.sendFriendRequest(user.id, receiverId)
      triggerHaptic('success')

      // Refresh requests to show the sent request
      const updatedRequests = await friendsService.getFriendRequests(user.id)
      setFriendRequests(updatedRequests.data || [])
    } catch (err) {
      triggerHaptic('error')
      throw err
    }
  }, [user, triggerHaptic])

  /**
   * Accept friend request
   */
  const acceptFriendRequest = useCallback(async (requestId: string): Promise<void> => {
    try {
      await friendsService.acceptFriendRequest(requestId)
      triggerHaptic('success')

      // Refresh all data
      await loadFriends()
    } catch (err) {
      triggerHaptic('error')
      throw err
    }
  }, [loadFriends, triggerHaptic])

  /**
   * Reject friend request
   */
  const rejectFriendRequest = useCallback(async (requestId: string): Promise<void> => {
    try {
      await friendsService.rejectFriendRequest(requestId)
      triggerHaptic('light')

      // Remove from local state
      setFriendRequests(prev => prev.filter(req => req.id !== requestId))
    } catch (err) {
      triggerHaptic('error')
      throw err
    }
  }, [triggerHaptic])

  /**
   * Remove friend
   */
  const removeFriend = useCallback(async (friendId: string): Promise<void> => {
    if (!user) throw new Error('Not authenticated')

    try {
      await friendsService.unfriend(friendId)
      triggerHaptic('medium')

      // Remove from local state
      setFriends(prev => prev.filter(friendship =>
        friendship.friend.id !== friendId
      ))
    } catch (err) {
      triggerHaptic('error')
      throw err
    }
  }, [user, triggerHaptic])

  /**
   * Share deal with friend
   */
  const shareDeal = useCallback(async (friendId: string, dealData: any): Promise<void> => {
    if (!user) throw new Error('Not authenticated')

    try {
      await friendsService.shareDeal(user.id, friendId, dealData)
      triggerHaptic('success')

      // Refresh activity feed
      const updatedActivity = await friendsService.getFriendActivity(user.id, 20)
      setFriendActivity(updatedActivity.data || [])
    } catch (err) {
      triggerHaptic('error')
      throw err
    }
  }, [user, triggerHaptic])

  /**
   * Update user's online status
   */
  const updateOnlineStatus = useCallback(async (isOnline: boolean): Promise<void> => {
    if (!user) return

    try {
      await friendsService.updateOnlineStatus(user.id, isOnline)
    } catch (err) {
      console.error('Error updating online status:', err)
    }
  }, [user])

  /**
   * Refresh friends data
   */
  const refreshFriends = useCallback(async (): Promise<void> => {
    await loadFriends()
  }, [loadFriends])

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return

    // Subscribe to friend status updates
    const channel = friendsService.subscribeToFriendUpdates(user.id, (updatedFriend) => {
      setFriends(prev => prev.map(friendship => {
        if (friendship.friend.id === updatedFriend.user_id) {
          return {
            ...friendship,
            friend: { ...friendship.friend, ...updatedFriend }
          }
        }
        return friendship
      }))
    })

    setRealtimeChannel(channel)

    return () => {
      if (channel) {
        channel.unsubscribe()
      }
    }
  }, [user])

  // Set user as online when hook mounts, offline when unmounts
  useEffect(() => {
    if (!user) return

    updateOnlineStatus(true)

    // Set offline on page unload
    const handleBeforeUnload = () => {
      updateOnlineStatus(false)
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      updateOnlineStatus(false)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [user, updateOnlineStatus])

  // Load initial data
  useEffect(() => {
    if (user) {
      loadFriends()
    }
  }, [user, loadFriends])

  // Computed values
  const onlineFriends = friends.filter(f => f.friend.is_online)
  const offlineFriends = friends.filter(f => !f.friend.is_online)
  const totalFriends = friends.length
  const onlineCount = onlineFriends.length

  return {
    // State
    friends,
    friendRequests,
    friendActivity,
    loading,
    error,

    // Actions
    searchUsers,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    shareDeal,
    refreshFriends,
    updateOnlineStatus,

    // Computed values
    onlineFriends,
    offlineFriends,
    totalFriends,
    onlineCount
  }
}

export default useFriends