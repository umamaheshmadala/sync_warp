// src/services/friendRequestService.ts
// Service layer for Story 9.1.3: Friend Requests with Auto-Expiry
// Uses the new `friend_requests` table and direct Supabase queries

import { supabase } from '../lib/supabase'

export interface Profile {
  id: string
  full_name: string
  email: string
  avatar_url?: string
  city?: string
  interests?: string[]
  is_online: boolean
  last_active: string
}

export interface FriendRequest {
  id: string
  sender_id: string
  receiver_id: string
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'expired'
  message: string | null
  created_at: string
  updated_at: string
  expires_at: string
  sender?: Profile
  receiver?: Profile
}

export interface SendRequestResult {
  success: boolean
  request_id?: string
  error?: string
}

class FriendRequestService {
  /**
   * Send friend request to another user
   * Uses direct INSERT to friend_requests table (no RPC dependency)
   */
  async sendFriendRequest(
    receiverId: string,
    message?: string
  ): Promise<SendRequestResult> {
    try {
      const { data: currentUser } = await supabase.auth.getUser()
      if (!currentUser.user) {
        return { success: false, error: 'Not authenticated' }
      }

      const senderId = currentUser.user.id

      // Validation: cannot send to self
      if (senderId === receiverId) {
        return { success: false, error: 'Cannot send friend request to yourself' }
      }

      // Check if already friends (using new friendships table)
      const { data: existingFriendship } = await supabase
        .from('friendships')
        .select('id')
        .eq('user_id', senderId)
        .eq('friend_id', receiverId)
        .eq('status', 'active')
        .maybeSingle()

      if (existingFriendship) {
        return { success: false, error: 'Already friends with this user' }
      }

      // Insert friend request
      // Unique pending index will prevent duplicates
      const { data, error } = await supabase
        .from('friend_requests')
        .insert({
          sender_id: senderId,
          receiver_id: receiverId,
          message: message || null,
          status: 'pending'
          // expires_at defaults to now() + 30 days
        })
        .select('id')
        .single()

      if (error) {
        // Handle unique violation gracefully
        if (error.code === '23505') {
          return { success: false, error: 'Friend request already sent' }
        }
        console.error('Send friend request error:', error)
        return { success: false, error: error.message }
      }

      return { success: true, request_id: data.id }
    } catch (error) {
      console.error('Send friend request error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send friend request'
      }
    }
  }

  /**
   * Get pending requests received by current user
   */
  async getReceivedRequests(): Promise<FriendRequest[]> {
    try {
      const { data: currentUser } = await supabase.auth.getUser()
      if (!currentUser.user) return []

      const { data, error } = await supabase
        .from('friend_requests')
        .select(`
          id,
          sender_id,
          receiver_id,
          status,
          message,
          created_at,
          updated_at,
          expires_at
        `)
        .eq('receiver_id', currentUser.user.id)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Get received requests error:', error)
        throw error
      }

      // Fetch sender profiles separately
      const requestsWithSenders = await Promise.all(
        (data || []).map(async (req) => {
          const { data: sender } = await supabase
            .from('profiles')
            .select('id, full_name, email, avatar_url, city, interests, is_online, last_active')
            .eq('id', req.sender_id)
            .single()
          
          return { ...req, sender }
        })
      )

      return requestsWithSenders as FriendRequest[]
    } catch (error) {
      console.error('Get received requests error:', error)
      throw error
    }
  }

  /**
   * Get pending requests sent by current user
   */
  async getSentRequests(): Promise<FriendRequest[]> {
    try {
      const { data: currentUser } = await supabase.auth.getUser()
      if (!currentUser.user) return []

      const { data, error } = await supabase
        .from('friend_requests')
        .select(`
          id,
          sender_id,
          receiver_id,
          status,
          message,
          created_at,
          updated_at,
          expires_at
        `)
        .eq('sender_id', currentUser.user.id)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Get sent requests error:', error)
        throw error
      }

      // Fetch receiver profiles separately
      const requestsWithReceivers = await Promise.all(
        (data || []).map(async (req) => {
          const { data: receiver } = await supabase
            .from('profiles')
            .select('id, full_name, email, avatar_url, city, interests, is_online, last_active')
            .eq('id', req.receiver_id)
            .single()
          
          return { ...req, receiver }
        })
      )

      return requestsWithReceivers as FriendRequest[]
    } catch (error) {
      console.error('Get sent requests error:', error)
      throw error
    }
  }

  /**
   * Accept friend request
   * Creates bidirectional friendship (2 rows) and updates request status
   */
  async acceptFriendRequest(requestId: string): Promise<SendRequestResult> {
    try {
      const { data: currentUser } = await supabase.auth.getUser()
      if (!currentUser.user) {
        return { success: false, error: 'Not authenticated' }
      }

      const receiverId = currentUser.user.id

      // Get request details
      const { data: request, error: fetchError } = await supabase
        .from('friend_requests')
        .select('id, sender_id, receiver_id, status, expires_at')
        .eq('id', requestId)
        .eq('receiver_id', receiverId)
        .eq('status', 'pending')
        .single()

      if (fetchError || !request) {
        return { success: false, error: 'Friend request not found or already processed' }
      }

      // Check if expired
      if (new Date(request.expires_at) < new Date()) {
        // Mark as expired
        await supabase
          .from('friend_requests')
          .update({ status: 'expired' })
          .eq('id', requestId)

        return { success: false, error: 'Friend request has expired' }
      }

      // Create bidirectional friendship (Story 9.1.2 trigger will create reverse)
      // Insert (sender, receiver) and friendships trigger creates (receiver, sender)
      const { error: friendshipError } = await supabase
        .from('friendships')
        .insert({
          user_id: request.sender_id,
          friend_id: request.receiver_id,
          status: 'active'
        })

      if (friendshipError) {
        console.error('Create friendship error:', friendshipError)
        return { success: false, error: 'Failed to create friendship' }
      }

      // Update request status to accepted
      const { error: updateError } = await supabase
        .from('friend_requests')
        .update({ status: 'accepted' })
        .eq('id', requestId)

      if (updateError) {
        console.error('Update request status error:', updateError)
        return { success: false, error: 'Failed to update request status' }
      }

      return { success: true }
    } catch (error) {
      console.error('Accept friend request error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to accept friend request'
      }
    }
  }

  /**
   * Reject friend request
   */
  async rejectFriendRequest(requestId: string): Promise<SendRequestResult> {
    try {
      const { data: currentUser } = await supabase.auth.getUser()
      if (!currentUser.user) {
        return { success: false, error: 'Not authenticated' }
      }

      const receiverId = currentUser.user.id

      const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId)
        .eq('receiver_id', receiverId)
        .eq('status', 'pending')

      if (error) {
        console.error('Reject friend request error:', error)
        return { success: false, error: 'Failed to reject friend request' }
      }

      return { success: true }
    } catch (error) {
      console.error('Reject friend request error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reject friend request'
      }
    }
  }

  /**
   * Cancel friend request (sender only)
   */
  async cancelFriendRequest(requestId: string): Promise<SendRequestResult> {
    try {
      const { data: currentUser } = await supabase.auth.getUser()
      if (!currentUser.user) {
        return { success: false, error: 'Not authenticated' }
      }

      const senderId = currentUser.user.id

      const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'cancelled' })
        .eq('id', requestId)
        .eq('sender_id', senderId)
        .eq('status', 'pending')

      if (error) {
        console.error('Cancel friend request error:', error)
        return { success: false, error: 'Failed to cancel friend request' }
      }

      return { success: true }
    } catch (error) {
      console.error('Cancel friend request error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel friend request'
      }
    }
  }

  /**
   * Subscribe to friend_requests changes (realtime)
   */
  subscribeToFriendRequestChanges(
    userId: string,
    callback: (payload: any) => void
  ) {
    return supabase
      .channel('friend_requests_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_requests',
          filter: `sender_id=eq.${userId},receiver_id=eq.${userId}`
        },
        callback
      )
      .subscribe()
  }
}

export const friendRequestService = new FriendRequestService()
export default friendRequestService
