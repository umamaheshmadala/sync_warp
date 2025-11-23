/**
 * Friends Service Layer
 * Story 9.4.1: Friends Service Layer - Core Service
 * 
 * Centralized business logic for all friend operations
 */

import { supabase } from '../lib/supabase';
import type { Friend, FriendRequest, ServiceResponse } from '../types/friends';

/**
 * Friends Service - Centralized business logic for friend operations
 */
export const friendsService = {
    /**
     * Get user's friends with online status
     * @param userId - The user ID to fetch friends for
     * @returns ServiceResponse with array of friends
     */
    async getFriends(userId: string): Promise<ServiceResponse<Friend[]>> {
        try {
            const { data, error } = await supabase
                .from('friendships')
                .select(`
          id,
          friend:profiles!friendships_friend_id_fkey (
            id,
            full_name,
            username,
            email,
            avatar_url,
            is_online,
            last_active
          )
        `)
                .eq('user_id', userId)
                .eq('status', 'active')
                .order('created_at', { ascending: false });

            if (error) throw error;

            const friends = data?.map((f: any) => f.friend).filter(Boolean) || [];

            return {
                success: true,
                data: friends,
            };
        } catch (error) {
            console.error('[friendsService] getFriends error:', error);
            return {
                success: false,
                error: 'Failed to load friends',
            };
        }
    },

    /**
     * Send friend request
     * @param receiverId - The user ID to send request to
     * @param message - Optional message to include
     * @returns ServiceResponse with created friend request
     */
    async sendFriendRequest(
        receiverId: string,
        message?: string
    ): Promise<ServiceResponse<FriendRequest>> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('friend_requests')
                .insert({
                    sender_id: user.id,
                    receiver_id: receiverId,
                    message,
                    status: 'pending',
                })
                .select()
                .single();

            if (error) throw error;

            return {
                success: true,
                data,
            };
        } catch (error: any) {
            console.error('[friendsService] sendFriendRequest error:', error);
            return {
                success: false,
                error: error.message || 'Failed to send friend request',
            };
        }
    },

    /**
     * Accept friend request (uses RPC for atomic operation)
     * @param requestId - The friend request ID to accept
     * @returns ServiceResponse indicating success/failure
     */
    async acceptFriendRequest(requestId: string): Promise<ServiceResponse<void>> {
        try {
            const { error } = await supabase.rpc('accept_friend_request', {
                request_id: requestId,
            });

            if (error) throw error;

            return { success: true };
        } catch (error: any) {
            console.error('[friendsService] acceptFriendRequest error:', error);
            return {
                success: false,
                error: error.message || 'Failed to accept friend request',
            };
        }
    },

    /**
     * Reject friend request
     * @param requestId - The friend request ID to reject
     * @returns ServiceResponse indicating success/failure
     */
    async rejectFriendRequest(requestId: string): Promise<ServiceResponse<void>> {
        try {
            const { error } = await supabase
                .from('friend_requests')
                .update({ status: 'rejected' })
                .eq('id', requestId);

            if (error) throw error;

            return { success: true };
        } catch (error: any) {
            console.error('[friendsService] rejectFriendRequest error:', error);
            return {
                success: false,
                error: error.message || 'Failed to reject friend request',
            };
        }
    },

    /**
     * Unfriend user (uses RPC for atomic operation)
     * @param friendId - The friend's user ID to unfriend
     * @returns ServiceResponse indicating success/failure
     */
    async unfriend(friendId: string): Promise<ServiceResponse<void>> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { error } = await supabase.rpc('unfriend_user', {
                user_id: user.id,
                friend_id: friendId,
            });

            if (error) throw error;

            return { success: true };
        } catch (error: any) {
            console.error('[friendsService] unfriend error:', error);
            return {
                success: false,
                error: error.message || 'Failed to unfriend user',
            };
        }
    },

    /**
     * Block user (uses RPC)
     * @param userId - The user ID to block
     * @param reason - Optional reason for blocking
     * @returns ServiceResponse indicating success/failure
     */
    async blockUser(userId: string, reason?: string): Promise<ServiceResponse<void>> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { error } = await supabase.rpc('block_user', {
                blocker_id: user.id,
                blocked_id: userId,
                block_reason: reason,
            });

            if (error) throw error;

            return { success: true };
        } catch (error: any) {
            console.error('[friendsService] blockUser error:', error);
            return {
                success: false,
                error: error.message || 'Failed to block user',
            };
        }
    },

    /**
     * Unblock user
     * @param userId - The user ID to unblock
     * @returns ServiceResponse indicating success/failure
     */
    async unblockUser(userId: string): Promise<ServiceResponse<void>> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { error } = await supabase
                .from('blocked_users')
                .delete()
                .eq('blocker_id', user.id)
                .eq('blocked_id', userId);

            if (error) throw error;

            return { success: true };
        } catch (error: any) {
            console.error('[friendsService] unblockUser error:', error);
            return {
                success: false,
                error: error.message || 'Failed to unblock user',
            };
        }
    },

    /**
     * Search friends by name or username
     * @param query - Search query string
     * @returns ServiceResponse with array of matching friends
     */
    async searchFriends(query: string): Promise<ServiceResponse<Friend[]>> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('friendships')
                .select(`
          friend:profiles!friendships_friend_id_fkey (
            id,
            full_name,
            username,
            email,
            avatar_url,
            is_online,
            last_active
          )
        `)
                .eq('user_id', user.id)
                .eq('status', 'active')
                .or(`full_name.ilike.%${query}%,username.ilike.%${query}%,email.ilike.%${query}%`, { foreignTable: 'profiles' });

            if (error) throw error;

            const friends = data?.map((f: any) => f.friend).filter(Boolean) || [];

            return {
                success: true,
                data: friends,
            };
        } catch (error: any) {
            console.error('[friendsService] searchFriends error:', error);
            return {
                success: false,
                error: error.message || 'Failed to search friends',
            };
        }
    },

    /**
     * Get mutual friends with another user
     * @param userId - The user ID to find mutual friends with
     * @returns ServiceResponse with array of mutual friends
     */
    async getMutualFriends(userId: string): Promise<ServiceResponse<Friend[]>> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data, error } = await supabase.rpc('get_mutual_friends', {
                user_id_1: user.id,
                user_id_2: userId,
            });

            if (error) throw error;

            return {
                success: true,
                data: data || [],
            };
        } catch (error: any) {
            console.error('[friendsService] getMutualFriends error:', error);
            return {
                success: false,
                error: error.message || 'Failed to get mutual friends',
            };
        }
    },

    /**
     * Get count of online friends
     * @param userId - The user ID to count online friends for
     * @returns ServiceResponse with count of online friends
     */
    async getOnlineFriendsCount(userId: string): Promise<ServiceResponse<number>> {
        try {
            const { data, error } = await supabase
                .from('friendships')
                .select('friend:profiles!friendships_friend_id_fkey(is_online)', { count: 'exact', head: false })
                .eq('user_id', userId)
                .eq('status', 'active')
                .eq('profiles.is_online', true);

            if (error) throw error;

            const count = data?.filter((f: any) => f.friend?.is_online).length || 0;

            return {
                success: true,
                data: count,
            };
        } catch (error: any) {
            console.error('[friendsService] getOnlineFriendsCount error:', error);
            return {
                success: false,
                error: error.message || 'Failed to get online friends count',
            };
        }
    },
};
