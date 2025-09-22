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
  user1_id: string
  user2_id: string
  created_at: string
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

class FriendService {
  /**
   * Get user's friends list
   */
  async getFriends(userId: string): Promise<Friendship[]> {
    try {
      // Get friendships first
      const { data: friendshipData, error: friendshipError } = await supabase
        .from('friendships')
        .select('id, user1_id, user2_id, created_at')
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .order('created_at', { ascending: false })

      if (friendshipError) throw friendshipError

      if (!friendshipData || friendshipData.length === 0) return []

      // Get friend profiles separately
      const friendIds = friendshipData.map(friendship => 
        friendship.user1_id === userId ? friendship.user2_id : friendship.user1_id
      )

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url, city, interests, is_online, last_active, created_at')
        .in('id', friendIds)

      if (profileError) throw profileError

      // Map the data to include the correct friend profile
      const friendships: Friendship[] = friendshipData.map(friendship => {
        const friendId = friendship.user1_id === userId ? friendship.user2_id : friendship.user1_id
        const friendProfile = profileData?.find(profile => profile.id === friendId)
        
        return {
          ...friendship,
          friend_profile: {
            ...friendProfile,
            user_id: friendId // Add user_id for compatibility
          } as FriendProfile
        }
      }).filter(friendship => friendship.friend_profile.id) // Filter out any with missing profiles

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

      // Check if already friends
      const { data: existingFriendship } = await supabase
        .from('friendships')
        .select('*')
        .or(`
          and(user1_id.eq.${requesterId},user2_id.eq.${receiverId}),
          and(user1_id.eq.${receiverId},user2_id.eq.${requesterId})
        `)
        .single()

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
   * Remove friend
   */
  async removeFriend(userId: string, friendId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .or(`
          and(user1_id.eq.${userId},user2_id.eq.${friendId}),
          and(user1_id.eq.${friendId},user2_id.eq.${userId})
        `)

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
}

export const friendService = new FriendService()
export default friendService