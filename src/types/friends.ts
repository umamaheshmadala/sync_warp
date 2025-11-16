/**
 * TypeScript types for Friends module
 * Story 9.3.1: Friends List Component
 */

export interface Friend {
  id: string;
  full_name: string;
  username: string;
  avatar_url?: string | null;
  is_online: boolean;
  last_active?: string | null;
  location?: string | null;
}

export interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'blocked';
  created_at: string;
  updated_at?: string;
}
