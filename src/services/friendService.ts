// src/services/friendService.ts
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

export interface FriendProfile {
  id: string
  user_id: string
  full_name: string
  email: string
  avatar_url?: string
  city?: string
  interests?: string[]
  is_online: boolean
  last_active: string
  created_at: string
}

export interface FriendRequest {
  id: string
  requester_id: string
  receiver_id: string
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
  updated_at: string
  requester_profile: FriendProfile
  receiver_profile: FriendProfile
}

export interface Friendship {
  id: string
  user_id: string
  friend_id: string
  status: 'active' | 'unfriended'
  created_at: string
  unfriended_at?: string
  friend_profile: FriendProfile
}

export interface FriendActivity {
  id: string
  user_id: string
  type: 'deal_save' | 'deal_share' | 'deal_purchase' | 'deal_view' | 'friend_add' | 'profile_update'
  deal_id?: string
  deal_title?: string
  message?: string
  activity_data?: any
  created_at: string
  user_profile?: FriendProfile
}

export interface PYMKSuggestion {
  id: string
  full_name: string
  avatar_url?: string
  mutual_friends_count: number
  mutual_friends: {
    id: string
    full_name: string
    avatar_url?: string
  }[]
}

class FriendService {
  /**
   * Get user's friends list (bidirectional)
   * Uses new bidirectional friendships table with user_id/friend_id pattern
   */
  async getFriends(userId: string): Promise<Friendship[]> {
    try {
      // Query bidirectional friendships table (already indexed)
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          id,
          user_id,
          friend_id,
          status,
          created_at,
          unfriended_at,
          friend:profiles!friendships_friend_id_fkey(
            id,
            email,
            full_name,
            avatar_url,
            city,
            interests,
            is_online,
            last_active,
            created_at
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Map the data to match Friendship interface
      const friendships: Friendship[] = (data || []).map(friendship => ({
        id: friendship.id,
        user_id: friendship.user_id,
        friend_id: friendship.friend_id,
        status: friendship.status,
        created_at: friendship.created_at,
        unfriended_at: friendship.unfriended_at,
        friend_profile: {
          ...friendship.friend,
          user_id: friendship.friend_id // Add user_id for compatibility
        } as FriendProfile
      }))

      return friendships
    } catch (error) {
      console.error('Error fetching friends:', error)
      throw error
    }
  }

  /**
   * Search for users to add as friends
   */
  async searchUsers(query: string, currentUserId: string): Promise<FriendProfile[]> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url, city, interests, is_online, last_active, created_at')
        .neq('id', currentUserId)
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10)

      if (error) throw error

      // Map the data to match FriendProfile interface
      const mappedData = (data || []).map(profile => ({
        ...profile,
        user_id: profile.id // Add user_id field for compatibility
      }))

      return mappedData
    } catch (error) {
      console.error('Error searching users:', error)
      throw error
    }
  }

  /**
   * Send friend request
   */
  async sendFriendRequest(requesterId: string, receiverId: string): Promise<FriendRequest> {
    try {
      // Check if request already exists
      const { data: existingRequest } = await supabase
        .from('friend_requests')
        .select('*')
        .or(`
          and(requester_id.eq.${requesterId},receiver_id.eq.${receiverId}),
          and(requester_id.eq.${receiverId},receiver_id.eq.${requesterId})
        `)
        .single()

      if (existingRequest) {
        throw new Error('Friend request already exists')
      }

      // Check if already friends (bidirectional check)
      const { data: existingFriendship } = await supabase
        .from('friendships')
        .select('id')
        .eq('user_id', requesterId)
        .eq('friend_id', receiverId)
        .eq('status', 'active')
        .maybeSingle()

      if (existingFriendship) {
        throw new Error('Already friends')
      }

      const { data, error } = await supabase
        .from('friend_requests')
        .insert({
          requester_id: requesterId,
          receiver_id: receiverId,
          status: 'pending'
        })
        .select('*')
        .single()

      if (error) throw error

      // Get the profiles separately to avoid foreign key issues
      const { data: requesterProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', requesterId)
        .single()

      const { data: receiverProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', receiverId)
        .single()

      // Add user_id field for compatibility
      const enrichedData = {
        ...data,
        requester_profile: requesterProfile ? { ...requesterProfile, user_id: requesterProfile.id } : null,
        receiver_profile: receiverProfile ? { ...receiverProfile, user_id: receiverProfile.id } : null
      }

      return enrichedData as FriendRequest
    } catch (error) {
      console.error('Error sending friend request:', error)
      throw error
    }
  }

  /**
   * Get pending friend requests for user
   */
  async getFriendRequests(userId: string): Promise<FriendRequest[]> {
    try {
      const { data: requests, error } = await supabase
        .from('friend_requests')
        .select('*')
        .eq('receiver_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) throw error
      if (!requests || requests.length === 0) return []

      // Get all requester profiles
      const requesterIds = requests.map(req => req.requester_id)
      const { data: requesterProfiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', requesterIds)

      // Get all receiver profiles
      const receiverIds = requests.map(req => req.receiver_id)
      const { data: receiverProfiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', receiverIds)

      // Map the data to include profiles
      const enrichedRequests = requests.map(request => {
        const requesterProfile = requesterProfiles?.find(profile => profile.id === request.requester_id)
        const receiverProfile = receiverProfiles?.find(profile => profile.id === request.receiver_id)

        return {
          ...request,
          requester_profile: requesterProfile ? { ...requesterProfile, user_id: requesterProfile.id } : null,
          receiver_profile: receiverProfile ? { ...receiverProfile, user_id: receiverProfile.id } : null
        } as FriendRequest
      })

      return enrichedRequests
    } catch (error) {
      console.error('Error fetching friend requests:', error)
      throw error
    }
  }

  /**
   * Accept friend request
   */
  async acceptFriendRequest(requestId: string): Promise<void> {
    try {
      // Use the safe database function that handles all the logic
      const { data, error } = await supabase
        .rpc('accept_friend_request_safe', { request_id: requestId })

      if (error) throw error

      if (!data) {
        throw new Error('Friend request not found or already processed')
      }
    } catch (error) {
      console.error('Error accepting friend request:', error)
      throw error
    }
  }

  /**
   * Reject friend request
   */
  async rejectFriendRequest(requestId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', requestId)

      if (error) throw error
    } catch (error) {
      console.error('Error rejecting friend request:', error)
      throw error
    }
  }

  /**
   * Remove friend (soft delete using unfriend status)
   * Updates both directions automatically via trigger
   */
  async removeFriend(userId: string, friendId: string): Promise<void> {
    try {
      // Soft delete: update status to unfriended
      // Trigger will auto-update the reverse relationship
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'unfriended' })
        .eq('user_id', userId)
        .eq('friend_id', friendId)

      if (error) throw error
    } catch (error) {
      console.error('Error removing friend:', error)
      throw error
    }
  }

  /**
   * Update user online status
   */
  async updateOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_online: isOnline,
          last_active: new Date().toISOString()
        })
        .eq('id', userId)

      if (error) throw error
    } catch (error) {
      console.error('Error updating online status:', error)
      throw error
    }
  }

  /**
   * Get friend activity feed
   */
  async getFriendActivity(userId: string, limit: number = 20): Promise<FriendActivity[]> {
    try {
      // Get user's friends first
      const friends = await this.getFriends(userId)
      const friendIds = friends.map(f => f.friend_profile.user_id)

      if (friendIds.length === 0) return []

      const { data, error } = await supabase
        .from('friend_activities')
        .select(`
          id,
          user_id,
          type,
          deal_id,
          deal_title,
          message,
          created_at,
          user_profile:profiles!friend_activities_user_id_fkey (*)
        `)
        .in('user_id', friendIds)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching friend activity:', error)
      throw error
    }
  }

  /**
   * Create activity for user
   */
  async createActivity(userId: string, activityType: string, activityData: any): Promise<void> {
    try {
      const { error } = await supabase
        .from('friend_activities')
        .insert({
          user_id: userId,
          type: activityType,
          deal_id: activityData.deal_id,
          deal_title: activityData.deal_title,
          message: activityData.message
        })

      if (error) throw error
    } catch (error) {
      console.error('Error creating activity:', error)
      throw error
    }
  }

  /**
   * Share deal with friend
   */
  async shareDeal(senderId: string, receiverId: string, dealData: any): Promise<void> {
    try {
      // Create notification for the receiver
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: receiverId,
          type: 'deal_shared',
          title: 'Friend shared a deal with you',
          message: `${dealData.title} - Check it out!`,
          data: {
            sender_id: senderId,
            deal: dealData
          }
        })

      if (error) throw error

      // Create activity
      await this.createActivity(senderId, 'deal_shared', {
        receiver_id: receiverId,
        deal: dealData
      })
    } catch (error) {
      console.error('Error sharing deal:', error)
      throw error
    }
  }

  /**
   * Subscribe to real-time friend status updates
   */
  subscribeToFriendUpdates(userId: string, callback: (friend: FriendProfile) => void) {
    return supabase
      .channel('friend_updates')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=neq.${userId}`
      }, (payload) => {
        callback(payload.new as FriendProfile)
      })
      .subscribe()
  }

  /**
   * Check if two users are friends (O(1) lookup)
   */
  async areFriends(userId: string, friendId: string): Promise<boolean> {
    try {
      const { data } = await supabase
        .from('friendships')
        .select('id')
        .eq('user_id', userId)
        .eq('friend_id', friendId)
        .eq('status', 'active')
        .maybeSingle()

      return !!data
    } catch (error) {
      console.error('Error checking friendship:', error)
      return false
    }
  }

  /**
   * Get friend count for a user (O(1) with index)
   */
  async getFriendCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('friendships')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'active')

      if (error) throw error
      return count || 0
    } catch (error) {
      console.error('Error getting friend count:', error)
      return 0
    }
  }

  /**
   * Get mutual friends between two users
   */
  async getMutualFriends(userId: string, otherUserId: string): Promise<FriendProfile[]> {
    try {
      // Use the database function for optimal performance
      const { data, error } = await supabase
        .rpc('get_mutual_friends', {
          user1_uuid: userId,
          user2_uuid: otherUserId
        })

      if (error) throw error

      // Map to FriendProfile format
      return (data || []).map((friend: any) => ({
        id: friend.friend_id,
        user_id: friend.friend_id,
        full_name: friend.friend_name,
        email: '',
        is_online: false,
        last_active: new Date().toISOString(),
        created_at: new Date().toISOString()
      }))
    } catch (error) {
      console.error('Error getting mutual friends:', error)
      return []
    }
  }

  /**
   * Subscribe to friendship changes (realtime)
   */
  subscribeToFriendshipChanges(
    userId: string,
    callback: (payload: any) => void
  ) {
    return supabase
      .channel('friendships_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'friendships',
        filter: `user_id=eq.${userId}`
      }, callback)
      .subscribe()
  }
  /**
   * Get People You May Know suggestions
   */
  async getPymkSuggestions(userId: string, limit: number = 10): Promise<PYMKSuggestion[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_pymk_suggestions', {
          current_user_id: userId,
          limit_count: limit
        })

      if (error) throw error
      return data as PYMKSuggestion[]
    } catch (error) {
      console.error('Error fetching PYMK suggestions:', error)
      throw error
    }
  }

  /**
   * Dismiss a PYMK suggestion
   */
  async dismissPymkSuggestion(suggestedUserId: string): Promise<void> {
    try {
      const { error } = await supabase
        .rpc('dismiss_pymk_suggestion', {
          target_user_id: suggestedUserId
        })

      if (error) throw error
    } catch (error) {
      console.error('Error dismissing PYMK suggestion:', error)
      throw error
    }
  }
}

export const friendService = new FriendService()
export default friendService
