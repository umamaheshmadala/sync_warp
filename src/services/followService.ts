// src/services/followService.ts
// Service layer for Instagram-style follow system (Story 9.1.4)

import { supabase } from '../lib/supabase'

export interface FollowProfile {
  id: string
  username: string
  full_name: string
  avatar_url?: string
  followed_at: string
}

export interface FollowResult {
  success: boolean
  error?: string
}

class FollowService {
  /**
   * Follow a user
   */
  async followUser(userId: string): Promise<FollowResult> {
    try {
      const { data: currentUser } = await supabase.auth.getUser()
      if (!currentUser.user) {
        return { success: false, error: 'Not authenticated' }
      }

      const followerId = currentUser.user.id

      // Validation: cannot follow self
      if (followerId === userId) {
        return { success: false, error: 'Cannot follow yourself' }
      }

      const { error } = await supabase
        .from('following')
        .insert({
          follower_id: followerId,
          following_id: userId,
        })

      if (error) {
        // Handle unique constraint violation
        if (error.code === '23505') {
          return { success: false, error: 'Already following this user' }
        }
        console.error('Follow user error:', error)
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      console.error('Follow user error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to follow user'
      }
    }
  }

  /**
   * Unfollow a user
   */
  async unfollowUser(userId: string): Promise<FollowResult> {
    try {
      const { data: currentUser } = await supabase.auth.getUser()
      if (!currentUser.user) {
        return { success: false, error: 'Not authenticated' }
      }

      const { error } = await supabase
        .from('following')
        .delete()
        .eq('follower_id', currentUser.user.id)
        .eq('following_id', userId)

      if (error) {
        console.error('Unfollow user error:', error)
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      console.error('Unfollow user error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to unfollow user'
      }
    }
  }

  /**
   * Check if current user follows another user
   */
  async isFollowing(userId: string): Promise<boolean> {
    try {
      const { data: currentUser } = await supabase.auth.getUser()
      if (!currentUser.user) return false

      const { data, error } = await supabase.rpc('is_following', {
        p_follower_id: currentUser.user.id,
        p_following_id: userId,
      })

      if (error) {
        console.error('Is following check error:', error)
        return false
      }

      return data || false
    } catch (error) {
      console.error('Is following check error:', error)
      return false
    }
  }

  /**
   * Get followers list for a user
   */
  async getFollowers(userId: string): Promise<FollowProfile[]> {
    try {
      const { data, error } = await supabase
        .from('following')
        .select(`
          follower_id,
          created_at,
          follower:profiles!following_follower_id_fkey(
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('following_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Get followers error:', error)
        throw error
      }

      // Map and handle join type (Supabase returns array for joins)
      return (data || []).map((f: any) => {
        const follower = Array.isArray(f.follower) ? f.follower[0] : f.follower
        return {
          id: follower.id,
          username: follower.username,
          full_name: follower.full_name,
          avatar_url: follower.avatar_url,
          followed_at: f.created_at
        }
      })
    } catch (error) {
      console.error('Get followers error:', error)
      throw error
    }
  }

  /**
   * Get following list for a user
   */
  async getFollowing(userId: string): Promise<FollowProfile[]> {
    try {
      const { data, error } = await supabase
        .from('following')
        .select(`
          following_id,
          created_at,
          following:profiles!following_following_id_fkey(
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('follower_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Get following error:', error)
        throw error
      }

      // Map and handle join type (Supabase returns array for joins)
      return (data || []).map((f: any) => {
        const following = Array.isArray(f.following) ? f.following[0] : f.following
        return {
          id: following.id,
          username: following.username,
          full_name: following.full_name,
          avatar_url: following.avatar_url,
          followed_at: f.created_at
        }
      })
    } catch (error) {
      console.error('Get following error:', error)
      throw error
    }
  }

  /**
   * Get follower count for a user
   */
  async getFollowerCount(userId: string): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('get_follower_count', {
        p_user_id: userId
      })

      if (error) {
        console.error('Get follower count error:', error)
        return 0
      }

      return data || 0
    } catch (error) {
      console.error('Get follower count error:', error)
      return 0
    }
  }

  /**
   * Get following count for a user
   */
  async getFollowingCount(userId: string): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('get_following_count', {
        p_user_id: userId
      })

      if (error) {
        console.error('Get following count error:', error)
        return 0
      }

      return data || 0
    } catch (error) {
      console.error('Get following count error:', error)
      return 0
    }
  }

  /**
   * Get mutual followers (users who follow each other)
   */
  async getMutualFollowers(userId: string): Promise<FollowProfile[]> {
    try {
      const { data, error } = await supabase.rpc('get_mutual_followers', {
        p_user_id: userId
      })

      if (error) {
        console.error('Get mutual followers error:', error)
        return []
      }

      return (data || []).map((user: any) => ({
        id: user.user_id,
        username: user.username,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        followed_at: '' // Mutual followers don't have a specific follow date in this context
      }))
    } catch (error) {
      console.error('Get mutual followers error:', error)
      return []
    }
  }

  /**
   * Subscribe to follow changes for realtime updates
   */
  subscribeToFollowChanges(userId: string, callback: (payload: any) => void) {
    return supabase
      .channel('following_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'following',
          filter: `follower_id=eq.${userId},following_id=eq.${userId}`
        },
        callback
      )
      .subscribe()
  }
}

export const followService = new FollowService()
export default followService
