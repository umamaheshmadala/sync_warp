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
