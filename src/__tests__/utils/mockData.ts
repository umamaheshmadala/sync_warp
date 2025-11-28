import type { Friend, FriendRequest } from '../../types/friends';

/**
 * Mock Data Generators
 * Provides consistent mock data for testing
 */

/**
 * Generate mock friend
 */
export function createMockFriend(overrides: Partial<Friend> = {}): Friend {
    return {
        id: 'friend-123',
        full_name: 'John Doe',
        username: 'johndoe',
        email: 'john@example.com',
        avatar_url: 'https://example.com/avatar.jpg',
        is_online: true,
        last_active: new Date().toISOString(),
        ...overrides,
    };
}

/**
 * Generate array of mock friends
 */
export function createMockFriends(count: number): Friend[] {
    return Array.from({ length: count }, (_, i) => createMockFriend({
        id: `friend-${i + 1}`,
        full_name: `Friend ${i + 1}`,
        username: `friend${i + 1}`,
        email: `friend${i + 1}@example.com`,
    }));
}

/**
 * Generate mock friend request
 */
export function createMockFriendRequest(overrides: Partial<FriendRequest> = {}): FriendRequest {
    return {
        id: 'request-123',
        sender_id: 'user-456',
        receiver_id: 'user-789',
        status: 'pending',
        message: 'Hey, let\'s be friends!',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        ...overrides,
    };
}

/**
 * Generate array of mock friend requests
 */
export function createMockFriendRequests(count: number): FriendRequest[] {
    return Array.from({ length: count }, (_, i) => createMockFriendRequest({
        id: `request-${i + 1}`,
        sender_id: `user-${i + 100}`,
    }));
}

/**
 * Generate mock profile
 */
export function createMockProfile(overrides: any = {}) {
    return {
        id: 'profile-123',
        full_name: 'Test User',
        username: 'testuser',
        email: 'test@example.com',
        avatar_url: null,
        is_online: false,
        last_active: new Date().toISOString(),
        friend_count: 0,
        follower_count: 0,
        following_count: 0,
        privacy_settings: {
            friend_requests: 'everyone',
            friends_list_visibility: 'friends',
            searchable: true,
            show_online_status: true,
        },
        ...overrides,
    };
}

/**
 * Generate mock friendship
 */
export function createMockFriendship(overrides: any = {}) {
    return {
        id: 'friendship-123',
        user_id: 'user-123',
        friend_id: 'user-456',
        status: 'active',
        created_at: new Date().toISOString(),
        unfriended_at: null,
        ...overrides,
    };
}

/**
 * Generate mock blocked user
 */
export function createMockBlockedUser(overrides: any = {}) {
    return {
        id: 'block-123',
        blocker_id: 'user-123',
        blocked_id: 'user-456',
        reason: 'Test block',
        created_at: new Date().toISOString(),
        ...overrides,
    };
}

/**
 * Generate mock PYMK suggestion
 */
export function createMockPymkSuggestion(overrides: any = {}) {
    return {
        id: 'user-789',
        full_name: 'Suggested Friend',
        username: 'suggestedfriend',
        avatar_url: null,
        mutual_friends_count: 3,
        mutual_friends: ['user-100', 'user-101', 'user-102'],
        ...overrides,
    };
}

/**
 * Generate mock activity
 */
export function createMockActivity(overrides: any = {}) {
    return {
        id: 'activity-123',
        user_id: 'user-123',
        type: 'deal_shared',
        deal_id: 'deal-456',
        deal_title: 'Amazing Deal',
        message: 'Check this out!',
        created_at: new Date().toISOString(),
        ...overrides,
    };
}
