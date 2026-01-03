// src/services/newFriendService.ts
// BRAND NEW Friend Service - Clean & Simple

import { supabase } from '../lib/supabase'

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
  requester_name: string
  requester_avatar?: string
  created_at: string
}

export interface Friend {
  id: string
  friend_id: string
  friend_profile: FriendProfile
  created_at: string
}

class NewFriendService {
  /**
   * Search for users to add as friends
   */
  async searchUsers(query: string, currentUserId: string): Promise<FriendProfile[]> {
    console.log('🔍 Searching for users:', { query, currentUserId })

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url, city, interests, is_online, last_active, created_at')
        .neq('id', currentUserId)
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
        // Filter out private profiles (privacy_settings->profile_visibility = 'friends')
        // We use the arrow operator to access the JSON field
        .not('privacy_settings->>profile_visibility', 'eq', 'friends')
        .limit(10)

      if (error) {
        console.error('❌ Search users error:', error)
        throw new Error(`Search failed: ${error.message}`)
      }

      const mappedData = (data || []).map(profile => ({
        ...profile,
        user_id: profile.id
      }))

      console.log('✅ Found users:', mappedData.length)
      return mappedData
    } catch (error) {
      console.error('❌ Search users error:', error)
      throw error
    }
  }

  /**
   * Send friend request using the database function
   */
  async sendFriendRequest(targetUserId: string): Promise<string> {
    console.log('📤 Sending friend request to:', targetUserId)

    try {
      const { data, error } = await supabase
        .rpc('send_friend_request', { target_user_id: targetUserId })

      if (error) {
        console.error('❌ Send friend request error:', error)
        throw new Error(`Failed to send friend request: ${error.message}`)
      }

      console.log('✅ Friend request sent successfully:', data)
      return data
    } catch (error) {
      console.error('❌ Send friend request error:', error)
      throw error
    }
  }

  /**
   * Get pending friend requests
   */
  async getFriendRequests(): Promise<FriendRequest[]> {
    console.log('📋 Getting friend requests')

    try {
      const { data, error } = await supabase
        .from('pending_friend_requests')
        .select('*')

      if (error) {
        console.error('❌ Get friend requests error:', error)
        throw new Error(`Failed to get friend requests: ${error.message}`)
      }

      console.log('✅ Got friend requests:', data?.length || 0)
      return data || []
    } catch (error) {
      console.error('❌ Get friend requests error:', error)
      throw error
    }
  }

  /**
   * Accept friend request
   */
  async acceptFriendRequest(requestId: string): Promise<boolean> {
    console.log('✅ Accepting friend request:', requestId)

    try {
      const { data, error } = await supabase
        .rpc('accept_friend_request', { connection_id: requestId })

      if (error) {
        console.error('❌ Accept friend request error:', error)
        throw new Error(`Failed to accept friend request: ${error.message}`)
      }

      console.log('✅ Friend request accepted:', data)
      return data === true
    } catch (error) {
      console.error('❌ Accept friend request error:', error)
      throw error
    }
  }

  /**
   * Reject friend request
   */
  async rejectFriendRequest(requestId: string): Promise<boolean> {
    console.log('❌ Rejecting friend request:', requestId)

    try {
      const { data, error } = await supabase
        .rpc('reject_friend_request', { connection_id: requestId })

      if (error) {
        console.error('❌ Reject friend request error:', error)
        throw new Error(`Failed to reject friend request: ${error.message}`)
      }

      console.log('✅ Friend request rejected:', data)
      return data === true
    } catch (error) {
      console.error('❌ Reject friend request error:', error)
      throw error
    }
  }

  /**
   * Get friends list
   */
  async getFriends(): Promise<Friend[]> {
    console.log('👥 Getting friends list')

    try {
      // Get friend IDs from the view
      const { data: friendIds, error: friendsError } = await supabase
        .from('user_friends')
        .select('friend_id, created_at')

      if (friendsError) {
        console.error('❌ Get friends error:', friendsError)
        throw new Error(`Failed to get friends: ${friendsError.message}`)
      }

      if (!friendIds || friendIds.length === 0) {
        console.log('✅ No friends found')
        return []
      }

      // Get profiles for these friends
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url, city, interests, is_online, last_active, created_at')
        .in('id', friendIds.map(f => f.friend_id))

      if (profilesError) {
        console.error('❌ Get friend profiles error:', profilesError)
        throw new Error(`Failed to get friend profiles: ${profilesError.message}`)
      }

      // Map friends with their profiles
      const friends = friendIds.map(friend => {
        const profile = profiles?.find(p => p.id === friend.friend_id)
        return {
          id: friend.friend_id,
          friend_id: friend.friend_id,
          friend_profile: profile ? {
            ...profile,
            user_id: profile.id
          } as FriendProfile : null,
          created_at: friend.created_at
        }
      }).filter(f => f.friend_profile !== null) as Friend[]

      console.log('✅ Got friends:', friends.length)
      return friends
    } catch (error) {
      console.error('❌ Get friends error:', error)
      throw error
    }
  }

  /**
   * Remove friend - Works bidirectionally using database function
   */
  async removeFriend(friendId: string): Promise<boolean> {
    console.log('🗑️ Removing friend:', friendId)

    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) throw new Error('Not authenticated')

      const currentUserId = user.user.id
      console.log('🔍 Removing friendship between:', currentUserId, 'and', friendId)

      // Use the database function for reliable bidirectional removal
      const { data, error } = await supabase
        .rpc('remove_friend', { friend_user_id: friendId })

      if (error) {
        console.error('❌ Remove friend error:', error)
        throw new Error(`Failed to remove friend: ${error.message}`)
      }

      console.log('✅ Friend removal result:', data)

      if (!data) {
        console.warn('⚠️ No friendship found to delete - might already be removed')
        // Still return true since the end result is what we want (no friendship)
      }

      return true
    } catch (error) {
      console.error('❌ Remove friend error:', error)
      throw error
    }
  }
}

export const newFriendService = new NewFriendService()
export default newFriendService