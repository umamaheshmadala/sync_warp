/**
 * Social Stats Hooks - Friend/Follower/Following Counts
 * Story 9.1.6: Profiles Extension
 */

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface SocialStats {
  friend_count: number;
  follower_count: number;
  following_count: number;
}

export interface UserWithSocialStats {
  user_id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  is_online: boolean;
  last_active: string;
  friend_count: number;
  follower_count: number;
  following_count: number;
}

/**
 * Get social stats for current user
 */
export function useSocialStats(): UseQueryResult<SocialStats> {
  return useQuery({
    queryKey: ['social-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_user_social_stats');
      
      if (error) throw error;
      
      return data as SocialStats;
    },
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
  });
}

/**
 * Get social stats for a specific user
 */
export function useUserSocialStats(userId: string | null): UseQueryResult<SocialStats | null> {
  return useQuery({
    queryKey: ['user-social-stats', userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('friend_count, follower_count, following_count')
        .eq('user_id', userId)
        .single();
      
      if (error) throw error;
      
      return data as SocialStats;
    },
    enabled: !!userId,
    staleTime: 30000,
  });
}

/**
 * Get popular users (by follower count)
 */
export function usePopularUsers(limit: number = 10): UseQueryResult<UserWithSocialStats[]> {
  return useQuery({
    queryKey: ['popular-users', limit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_popular_users', {
        p_limit: limit,
      });
      
      if (error) throw error;
      
      return data as UserWithSocialStats[];
    },
    staleTime: 60000, // 1 minute
  });
}

/**
 * Get online friends
 */
export function useOnlineFriends(): UseQueryResult<UserWithSocialStats[]> {
  return useQuery({
    queryKey: ['online-friends'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_online_friends');
      
      if (error) throw error;
      
      return data as UserWithSocialStats[];
    },
    staleTime: 15000, // 15 seconds
    refetchInterval: 30000, // Refetch every 30 seconds
    refetchOnWindowFocus: true,
  });
}

/**
 * Get online friends count
 */
export function useOnlineFriendsCount(): UseQueryResult<number> {
  return useQuery({
    queryKey: ['online-friends-count'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_online_friends_count');
      
      if (error) throw error;
      
      return (data as number) || 0;
    },
    staleTime: 15000,
    refetchInterval: 30000,
  });
}
