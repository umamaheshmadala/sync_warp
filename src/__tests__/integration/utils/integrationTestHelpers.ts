/**
 * Integration Test Helpers
 * Story 9.8.4: Integration Tests - Friend Request Flow
 * 
 * Utilities for integration testing with real database
 */

import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Use test environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

export const testSupabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Create a test user with profile
 */
export async function createTestUser(userData: {
    email?: string;
    full_name?: string;
    username?: string;
}) {
    const testId = uuidv4();
    const email = userData.email || `test-${testId}@example.com`;
    const username = userData.username || `testuser_${testId.slice(0, 8)}`;
    
    // Note: In a real integration test, you would use Supabase Admin API
    // For now, we'll create mock user data
    const mockUser = {
        id: testId,
        email,
        full_name: userData.full_name || 'Test User',
        username,
        is_test_data: true, // Flag for cleanup
    };
    
    return mockUser;
}

/**
 * Create multiple test users
 */
export async function createTestUsers(count: number) {
    const users = [];
    for (let i = 0; i < count; i++) {
        const user = await createTestUser({
            full_name: `Test User ${i + 1}`,
        });
        users.push(user);
    }
    return users;
}

/**
 * Send friend request (integration test)
 */
export async function sendFriendRequestIntegration(senderId: string, receiverId: string) {
    const { data, error } = await testSupabase
        .from('friend_requests')
        .insert({
            sender_id: senderId,
            receiver_id: receiverId,
            status: 'pending',
            is_test_data: true,
        })
        .select()
        .single();
    
    if (error) throw error;
    return data;
}

/**
 * Accept friend request (integration test)
 */
export async function acceptFriendRequestIntegration(requestId: string, userId: string) {
    // Update request status
    const { error: updateError } = await testSupabase
        .from('friend_requests')
        .update({ status: 'accepted' })
        .eq('id', requestId);
    
    if (updateError) throw updateError;
    
    // Get request details
    const { data: request } = await testSupabase
        .from('friend_requests')
        .select('sender_id, receiver_id')
        .eq('id', requestId)
        .single();
    
    if (!request) throw new Error('Request not found');
    
    // Create bidirectional friendship
    const friendships = [
        {
            user_id: request.sender_id,
            friend_id: request.receiver_id,
            is_test_data: true,
        },
        {
            user_id: request.receiver_id,
            friend_id: request.sender_id,
            is_test_data: true,
        },
    ];
    
    const { error: friendshipError } = await testSupabase
        .from('friendships')
        .insert(friendships);
    
    if (friendshipError) throw friendshipError;
    
    return { success: true };
}

/**
 * Block user (integration test)
 */
export async function blockUserIntegration(userId: string, blockedUserId: string) {
    // Create block record
    const { error: blockError } = await testSupabase
        .from('blocks')
        .insert({
            blocker_id: userId,
            blocked_id: blockedUserId,
            is_test_data: true,
        });
    
    if (blockError) throw blockError;
    
    // Remove friendship if exists
    await testSupabase
        .from('friendships')
        .delete()
        .or(`user_id.eq.${userId},user_id.eq.${blockedUserId}`)
        .or(`friend_id.eq.${userId},friend_id.eq.${blockedUserId}`);
    
    return { success: true };
}

/**
 * Cleanup test data
 */
export async function cleanupTestData() {
    // Delete all test data in reverse order of dependencies
    await testSupabase.from('friendships').delete().eq('is_test_data', true);
    await testSupabase.from('friend_requests').delete().eq('is_test_data', true);
    await testSupabase.from('blocks').delete().eq('is_test_data', true);
    
    console.log('✅ Test data cleaned up');
}

/**
 * Wait for database operation to complete
 */
export async function waitForDbOperation(ms: number = 1000) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Verify bidirectional friendship exists
 */
export async function verifyBidirectionalFriendship(user1Id: string, user2Id: string) {
    const { data } = await testSupabase
        .from('friendships')
        .select('*')
        .or(`and(user_id.eq.${user1Id},friend_id.eq.${user2Id}),and(user_id.eq.${user2Id},friend_id.eq.${user1Id})`);
    
    return data && data.length === 2;
}
