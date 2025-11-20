/**
 * useFriendActions Hook
 * Story 9.3.1: Friends List Component
 * 
 * Provides actions for friends: unfriend, message
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';


export function useFriendActions() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const unfriendMutation = useMutation({
    mutationFn: async (friendId: string) => {
      // Use DB function to ensure atomic bidirectional delete
      const { error } = await supabase.rpc('unfriend_user', {
        p_friend_id: friendId
      });

      if (error) throw error;

      return friendId;
    },
    onMutate: async (friendId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['friends-list'] });

      // Snapshot previous value
      const previousFriends = queryClient.getQueryData(['friends-list']);

      // Optimistically update UI
      queryClient.setQueryData(['friends-list'], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any[]) =>
            page.filter((friend) => friend.id !== friendId)
          ),
        };
      });

      return { previousFriends };
    },
    onError: (error, _friendId, context) => {
      // Rollback on error
      if (context?.previousFriends) {
        queryClient.setQueryData(['friends-list'], context.previousFriends);
      }
      toast.error('Failed to remove friend');
      console.error(error);
    },
    onSuccess: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['friends-list'] });
      toast.success('Friend removed successfully');
    },

  });

  const blockMutation = useMutation({
    mutationFn: async (friendId: string) => {
      const { error } = await supabase.from('blocked_users').insert({
        blocker_id: (await supabase.auth.getUser()).data.user?.id,
        blocked_id: friendId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends-list'] });
      // Also invalidate profile to update UI if needed
      toast.success('User blocked');
    },
    onError: (error) => {
      toast.error('Failed to block user');
      console.error(error);
    }

  });

  const toggleFollowMutation = useMutation({
    mutationFn: async ({ friendId, isFollowing }: { friendId: string; isFollowing: boolean }) => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Not authenticated');

      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('followers')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', friendId);
        if (error) throw error;
      } else {
        // Follow
        const { error } = await supabase
          .from('followers')
          .insert({ follower_id: user.id, following_id: friendId });
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['friend-profile', variables.friendId] });
      toast.success(variables.isFollowing ? 'Unfollowed user' : 'Following user');
    },
    onError: (error) => {
      toast.error('Failed to update follow status');
      console.error(error);
    }

  });


  const sendMessage = (friendId: string) => {
    // Navigate to chat with friend
    navigate(`/chat/${friendId}`);
  };

  return {
    unfriend: unfriendMutation.mutate,
    isUnfriending: unfriendMutation.isPending,
    sendMessage,
    blockUser: blockMutation.mutate,
    toggleFollow: toggleFollowMutation.mutate,

  };
}
