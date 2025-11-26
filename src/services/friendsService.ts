/**
 * Friends Service Layer
 * Story 9.4.1: Friends Service Layer - Core Service
 * Story 9.4.5: Error Handling & Retry Logic
 * Story 9.4.6: Offline Support for Friend Requests
 * 
 * Centralized business logic for all friend operations
 * with retry logic, circuit breaker, and offline support
 */

import { supabase } from '../lib/supabase';
import type { Friend, FriendRequest, ServiceResponse } from '../types/friends';
import { withRetry, friendsCircuitBreaker, getUserFriendlyErrorMessage, logError } from '../utils/errorHandler';
import { offlineQueue } from './offlineQueue';

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
            const result = await withRetry(
                () => friendsCircuitBreaker.execute(async () => {
                    // Step 1: Get active friendships
                    const { data: friendships, error: friendshipError } = await supabase
                        .from('friendships')
                        .select('friend_id')
                        .eq('user_id', userId)
                        .eq('status', 'active')
                        .order('created_at', { ascending: false });

                    if (friendshipError) throw friendshipError;

                    if (!friendships || friendships.length === 0) return [];

                    const friendIds = friendships.map(f => f.friend_id);

                    // Step 2: Get friend profiles manually
                    const { data: profiles, error: profileError } = await supabase
                        .from('profiles')
                        .select('id, full_name, username, email, avatar_url, is_online, last_active')
                        .in('id', friendIds);

                    if (profileError) throw profileError;

                    return profiles;
                }),
                { maxRetries: 2, baseDelay: 500 }
            );

            return {
                success: true,
                data: result || [],
            };
        } catch (error) {
            logError('getFriends', error, { userId });
            return {
                success: false,
                error: getUserFriendlyErrorMessage(error),
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
            // Check if online
            const isOnline = await offlineQueue.isOnline();
            console.error('DEBUG: isOnline:', isOnline);

            if (!isOnline) {
                // Queue for later processing
                await offlineQueue.add('friend_request', { receiverId, message });
                console.log('[friendsService] Request queued for offline processing');

                return {
                    success: true,
                    data: null as any, // Will be populated when processed
                    queued: true,
                };
            }

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Check privacy settings first
            const { data: canSend, error: privacyError } = await supabase.rpc('can_send_friend_request', {
                sender_id: user.id,
                receiver_id: receiverId,
            });

            if (privacyError) throw privacyError;

            if (!canSend) {
                return {
                    success: false,
                    error: 'This user is not accepting friend requests due to their privacy settings.',
                };
            }

            const data = await withRetry(
                () => friendsCircuitBreaker.execute(async () => {
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
                    return data;
                }),
                { maxRetries: 3, baseDelay: 1000 }
            );

            return {
                success: true,
                data,
            };
        } catch (error: any) {
            logError('sendFriendRequest', error, { receiverId });
            return {
                success: false,
                error: getUserFriendlyErrorMessage(error),
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
            await withRetry(
                () => friendsCircuitBreaker.execute(async () => {
                    const { error } = await supabase.rpc('accept_friend_request', {
                        request_id: requestId,
                    });

                    if (error) throw error;
                }),
                { maxRetries: 3, baseDelay: 1000 }
            );

            return { success: true };
        } catch (error: any) {
            logError('acceptFriendRequest', error, { requestId });
            return {
                success: false,
                error: getUserFriendlyErrorMessage(error),
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
     * Cancel friend request (delete pending request)
     * @param requestId - The friend request ID to cancel
     * @returns ServiceResponse indicating success/failure
     */
    async cancelFriendRequest(requestId: string): Promise<ServiceResponse<void>> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Delete the friend request (only if sender is current user)
            const { error } = await supabase
                .from('friend_requests')
                .delete()
                .eq('id', requestId)
                .eq('sender_id', user.id)  // Ensure only sender can cancel
                .eq('status', 'pending');   // Only cancel pending requests

            if (error) throw error;

            return { success: true };
        } catch (error: any) {
            console.error('[friendsService] cancelFriendRequest error:', error);
            return {
                success: false,
                error: error.message || 'Failed to cancel friend request',
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
                p_friend_id: friendId,
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
                p_blocked_user_id: userId,
                p_reason: reason,
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
     * Search friends by name or username (Search My Friends)
     * @param query - Search query string
     * @returns ServiceResponse with array of matching friends
     */
    async searchMyFriends(query: string): Promise<ServiceResponse<Friend[]>> {
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
            console.error('[friendsService] searchMyFriends error:', error);
            return {
                success: false,
                error: error.message || 'Failed to search friends',
            };
        }
    },

    /**
     * Search for users globally (Friend Discovery)
     */
    async searchUsers(query: string, limit: number = 20): Promise<ServiceResponse<any[]>> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data, error } = await supabase.rpc('search_users', {
                search_query: query.trim(),
                current_user_id: user.id,
                limit_count: limit,
                offset_count: 0,
            });

            if (error) throw error;

            return {
                success: true,
                data: data || [],
            };
        } catch (error: any) {
            logError('searchUsers', error, { query });
            return {
                success: false,
                error: getUserFriendlyErrorMessage(error),
            };
        }
    },

    /**
     * Get pending requests sent by current user
     */
    async getSentRequests(): Promise<ServiceResponse<FriendRequest[]>> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data: requests, error } = await supabase
                .from('friend_requests')
                .select(`
                    *,
                    receiver:profiles!friend_requests_receiver_id_fkey(*)
                `)
                .eq('sender_id', user.id)
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Map profiles
            const enrichedRequests = (requests || []).map((req: any) => ({
                ...req,
                receiver_profile: req.receiver
            }));

            return {
                success: true,
                data: enrichedRequests,
            };
        } catch (error: any) {
            logError('getSentRequests', error, { userId: 'current' });
            return {
                success: false,
                error: getUserFriendlyErrorMessage(error),
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
    /**
     * Get pending friend requests for user
     */
    async getFriendRequests(userId: string): Promise<ServiceResponse<FriendRequest[]>> {
        try {
            const { data: requests, error } = await supabase
                .from('friend_requests')
                .select(`
                    *,
                    requester:profiles!friend_requests_requester_id_fkey(*),
                    receiver:profiles!friend_requests_receiver_id_fkey(*)
                `)
                .eq('receiver_id', userId)
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Map profiles to match expected interface
            const enrichedRequests = (requests || []).map((req: any) => ({
                ...req,
                requester_profile: req.requester,
                receiver_profile: req.receiver
            }));

            return {
                success: true,
                data: enrichedRequests,
            };
        } catch (error: any) {
            logError('getFriendRequests', error, { userId });
            return {
                success: false,
                error: getUserFriendlyErrorMessage(error),
            };
        }
    },

    /**
     * Update user online status
     */
    async updateOnlineStatus(userId: string, isOnline: boolean): Promise<ServiceResponse<void>> {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    is_online: isOnline,
                    last_active: new Date().toISOString()
                })
                .eq('id', userId);

            if (error) throw error;
            return { success: true };
        } catch (error: any) {
            logError('updateOnlineStatus', error, { userId, isOnline });
            return {
                success: false,
                error: getUserFriendlyErrorMessage(error),
            };
        }
    },

    /**
     * Get friend activity feed
     */
    async getFriendActivity(userId: string, limit: number = 20): Promise<ServiceResponse<any[]>> {
        try {
            // Get user's friends first
            const friendsResponse = await this.getFriends(userId);
            if (!friendsResponse.success || !friendsResponse.data) {
                return { success: true, data: [] };
            }

            const friendIds = friendsResponse.data.map(f => f.id);
            if (friendIds.length === 0) return { success: true, data: [] };

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
                .limit(limit);

            if (error) throw error;
            return { success: true, data: data || [] };
        } catch (error: any) {
            logError('getFriendActivity', error, { userId });
            return {
                success: false,
                error: getUserFriendlyErrorMessage(error),
            };
        }
    },

    /**
     * Create activity for user
     */
    async createActivity(userId: string, activityType: string, activityData: any): Promise<ServiceResponse<void>> {
        try {
            const { error } = await supabase
                .from('friend_activities')
                .insert({
                    user_id: userId,
                    type: activityType,
                    deal_id: activityData.deal_id,
                    deal_title: activityData.deal_title,
                    message: activityData.message
                });

            if (error) throw error;
            return { success: true };
        } catch (error: any) {
            logError('createActivity', error, { userId, activityType });
            return {
                success: false,
                error: getUserFriendlyErrorMessage(error),
            };
        }
    },

    /**
     * Share deal with friend
     */
    async shareDeal(senderId: string, receiverId: string, dealData: any): Promise<ServiceResponse<void>> {
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
                });

            if (error) throw error;

            // Create activity
            await this.createActivity(senderId, 'deal_shared', {
                receiver_id: receiverId,
                deal: dealData
            });

            return { success: true };
        } catch (error: any) {
            logError('shareDeal', error, { senderId, receiverId });
            return {
                success: false,
                error: getUserFriendlyErrorMessage(error),
            };
        }
    },

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
                .maybeSingle();

            return !!data;
        } catch (error) {
            console.error('Error checking friendship:', error);
            return false;
        }
    },

    /**
     * Get friend count for a user
     */
    async getFriendCount(userId: string): Promise<number> {
        try {
            const { count, error } = await supabase
                .from('friendships')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('status', 'active');

            if (error) throw error;
            return count || 0;
        } catch (error) {
            console.error('Error getting friend count:', error);
            return 0;
        }
    },

    /**
     * Get People You May Know suggestions
     */
    async getPymkSuggestions(userId: string, limit: number = 10): Promise<ServiceResponse<any[]>> {
        try {
            const { data, error } = await supabase
                .rpc('get_pymk_suggestions', {
                    current_user_id: userId,
                    limit_count: limit
                });

            if (error) throw error;
            return { success: true, data: data || [] };
        } catch (error: any) {
            logError('getPymkSuggestions', error, { userId });
            return {
                success: false,
                error: getUserFriendlyErrorMessage(error),
            };
        }
    },

    /**
     * Dismiss a PYMK suggestion
     */
    async dismissPymkSuggestion(suggestedUserId: string): Promise<ServiceResponse<void>> {
        try {
            const { error } = await supabase
                .rpc('dismiss_pymk_suggestion', {
                    target_user_id: suggestedUserId
                });

            if (error) throw error;
            return { success: true };
        } catch (error: any) {
            logError('dismissPymkSuggestion', error, { suggestedUserId });
            return {
                success: false,
                error: getUserFriendlyErrorMessage(error),
            };
        }
    },

    /**
     * Subscribe to real-time friend status updates
     */
    subscribeToFriendUpdates(userId: string, callback: (friend: any) => void) {
        return supabase
            .channel('friend_updates')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'profiles',
                filter: `id=neq.${userId}`
            }, (payload) => {
                callback(payload.new);
            })
            .subscribe();
    },

    /**
     * Subscribe to friendship changes (realtime)
     */
    subscribeToFriendshipChanges(userId: string, callback: (payload: any) => void) {
        return supabase
            .channel('friendships_changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'friendships',
                filter: `user_id=eq.${userId}`
            }, callback)
            .subscribe();
    },
    /**
     * Save search query to history
     */
    async saveFriendSearchQuery(query: string): Promise<void> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase.rpc('save_search_query', {
                p_user_id: user.id,
                p_query: query,
            });

            if (error) console.error('Failed to save search query:', error);
        } catch (error) {
            console.error('Failed to save search query:', error);
        }
    },

    /**
     * Get user's search history
     */
    async getFriendSearchHistory(): Promise<ServiceResponse<any[]>> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data, error } = await supabase.rpc('get_search_history', {
                p_user_id: user.id,
            });

            if (error) throw error;

            return {
                success: true,
                data: data || [],
            };
        } catch (error: any) {
            logError('getFriendSearchHistory', error, { userId: 'current' });
            return {
                success: false,
                error: getUserFriendlyErrorMessage(error),
            };
        }
    },

    /**
     * Clear all search history
     */
    async clearFriendSearchHistory(): Promise<ServiceResponse<void>> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { error } = await supabase
                .from('search_history')
                .delete()
                .eq('user_id', user.id);

            if (error) throw error;

            return { success: true };
        } catch (error: any) {
            logError('clearFriendSearchHistory', error, { userId: 'current' });
            return {
                success: false,
                error: getUserFriendlyErrorMessage(error),
            };
        }
    }
};
