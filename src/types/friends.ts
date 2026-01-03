/**
 * TypeScript types for Friends module
 * Story 9.3.1: Friends List Component
 * Story 9.4.1: Friends Service Layer
 */

export interface Friend {
  id: string;
  full_name: string;
  email: string;
  username?: string;
  avatar_url?: string | null;
  is_online: boolean;
  last_active?: string | null;
  location?: string | null;
  city?: string | null;
  interests?: string[] | null;
}

export interface PYMKSuggestion {
  id: string;
  full_name: string;
  avatar_url?: string;
  mutual_friends_count: number;
  mutual_friends: {
    id: string;
    full_name: string;
    avatar_url?: string;
  }[];
}

export interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'active' | 'unfriended';
  created_at: string;
  updated_at?: string;
}

export interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  message?: string | null;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  updated_at?: string;
}

/**
 * Generic service response type for consistent API responses
 */
export interface ServiceResponse<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  queued?: boolean; // For offline queue support
}

export type ActivityType =
  | 'friend_added'
  | 'friend_joined'
  | 'deal_liked'
  | 'deal_saved'
  | 'deal_shared';

export interface FriendActivity {
  id: string;
  user_id: string;
  user_full_name: string;
  user_avatar_url: string | null;
  activity_type: ActivityType;
  related_user_id?: string;
  related_user_full_name?: string;
  related_deal_id?: string;
  metadata: Record<string, any>;
  created_at: string;
}
