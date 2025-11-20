import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';

export interface FriendProfile {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string;
  location: string | null;
  bio: string | null;
  is_online: boolean;
  last_active: string | null;
  is_following: boolean;
  is_activity_public: boolean;
}

export interface MutualFriend {
  id: string;
  full_name: string;
  avatar_url: string;
}

export function useFriendProfile(friendId: string) {
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: ['friend-profile', friendId],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      // 1. Fetch Profile Data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, location, bio, is_online, last_active')
        .eq('id', friendId)
        .single();

      if (profileError) throw profileError;

      // 2. Fetch Mutual Friends - handle if RPC doesn't exist
      let mutualFriends: MutualFriend[] = [];
      try {
        const { data: mutualFriendsData, error: mutualError } = await supabase
          .rpc('get_mutual_friends', { p_target_user_id: friendId });

        if (!mutualError && mutualFriendsData) {
          mutualFriends = mutualFriendsData;
        }
      } catch (error) {
        // RPC doesn't exist yet, use empty array
        console.warn('get_mutual_friends RPC not found, using empty array');
      }

      // 3. Check if following - handle if table doesn't exist
      let isFollowing = false;
      try {
        const { count: followingCount } = await supabase
          .from('following')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', user.id)
          .eq('following_id', friendId);

        isFollowing = followingCount ? followingCount > 0 : false;
      } catch (error) {
        // following table doesn't exist yet, default to false
        console.warn('following table not found, defaulting to false');
      }

      return {
        profile: {
          ...profileData,
          is_following: isFollowing,
          is_activity_public: true, // TODO: Get from privacy_settings (Epic 9.5)
        } as FriendProfile,
        mutualFriends: mutualFriends.slice(0, 5), // Top 5
        mutualFriendsCount: mutualFriends.length,
      };
    },
    enabled: !!friendId && !!user,
  });
}
