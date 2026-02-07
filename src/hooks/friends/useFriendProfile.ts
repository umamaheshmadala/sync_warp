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
  read_receipts_enabled?: boolean;
  friendship_status: 'active' | 'pending_sent' | 'pending_received' | 'none';
}

export interface MutualFriend {
  id: string;
  full_name: string;
  avatar_url: string;
}

export function useFriendProfile(friendId: string) {
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: ['friend-profile', friendId, 'v5'], // Bump version
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      // 1. Fetch Profile Data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url, location, bio, is_online, last_active')
        .eq('id', friendId)
        .single();

      if (profileError) throw profileError;

      // 2. Fetch Mutual Friends
      let mutualFriends: MutualFriend[] = [];
      try {
        const { data: mutualFriendsData, error: mutualError } = await supabase
          .rpc('get_mutual_friends', { p_target_user_id: friendId });

        if (!mutualError && mutualFriendsData) {
          mutualFriends = mutualFriendsData;
        }
      } catch (error) {
        console.warn('get_mutual_friends RPC not found, using empty array');
      }

      // 3. Check if following
      let isFollowing = false;
      try {
        const { count: followingCount } = await supabase
          .from('following')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', user.id)
          .eq('following_id', friendId);

        isFollowing = followingCount ? followingCount > 0 : false;
      } catch (error) {
        console.warn('following table not found, defaulting to false');
      }

      // 4. Determine Friendship Status
      let friendshipStatus: FriendProfile['friendship_status'] = 'none';

      // Check active friendship
      const { data: friendship } = await supabase
        .from('friendships')
        .select('status')
        .eq('user_id', user.id)
        .eq('friend_id', friendId)
        .maybeSingle();

      if (friendship?.status === 'active') {
        friendshipStatus = 'active';
      } else {
        // Check pending requests
        const { data: request } = await supabase
          .from('friend_requests')
          .select('sender_id, status')
          .or(`and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`)
          .eq('status', 'pending')
          .maybeSingle();

        if (request) {
          friendshipStatus = request.sender_id === user.id ? 'pending_sent' : 'pending_received';
        }
      }

      // 5. Fetch Privacy Settings
      let readReceiptsEnabled = true;
      try {
        const { data: profilePrivacy, error: privacyError } = await supabase
          .from('profiles')
          .select('privacy_settings')
          .eq('id', friendId)
          .maybeSingle();

        if (!privacyError && profilePrivacy?.privacy_settings) {
          const settings = profilePrivacy.privacy_settings as any;
          if (settings.read_receipts_enabled !== undefined) {
            readReceiptsEnabled = settings.read_receipts_enabled;
          }
        }
      } catch (error) {
        console.warn('Failed to fetch friend privacy settings:', error);
      }

      return {
        profile: {
          ...profileData,
          is_following: isFollowing,
          is_activity_public: true,
          read_receipts_enabled: readReceiptsEnabled,
          friendship_status: friendshipStatus,
        } as FriendProfile,
        mutualFriends: mutualFriends.slice(0, 5),
        mutualFriendsCount: mutualFriends.length,
      };
    },
    enabled: !!friendId && !!user,
  });
}
