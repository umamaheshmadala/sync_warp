/**
 * useFriendActions Hook
 * Story 9.3.1: Friends List Component
 * 
 * Provides actions for friends: unfriend, message
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

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
    onError: (_err, _friendId, context) => {
      // Rollback on error
      if (context?.previousFriends) {
        queryClient.setQueryData(['friends-list'], context.previousFriends);
      }
    },
    onSuccess: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['friends-list'] });
    },
  });

  const sendMessage = (friendId: string) => {
    // Navigate to chat with friend
    navigate(`/chat/${friendId}`);
  };

  return {
    unfriend: unfriendMutation.mutate,
    isUnfriending: unfriendMutation.isPending,
    sendMessage,
  };
}
