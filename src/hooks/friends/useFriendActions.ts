import { useMutation, useQueryClient } from '@tanstack/react-query';
import { friendsService } from '../../services/friendsService';
import { toast } from 'react-hot-toast';

export function useFriendActions() {
  const queryClient = useQueryClient();

  const sendRequest = useMutation({
    mutationFn: (receiverId: string) => friendsService.sendFriendRequest(receiverId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
      toast.success('Friend request sent!');
    },
    onError: () => {
      toast.error('Failed to send friend request');
    },
  });

  const acceptRequest = useMutation({
    mutationFn: (requestId: string) => friendsService.acceptFriendRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
      toast.success('Friend request accepted!');
    },
    onError: () => {
      toast.error('Failed to accept friend request');
    },
  });

  const rejectRequest = useMutation({
    mutationFn: (requestId: string) => friendsService.rejectFriendRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
      toast.success('Friend request rejected');
    },
    onError: () => {
      toast.error('Failed to reject friend request');
    },
  });

  const unfriend = useMutation({
    mutationFn: (friendId: string) => friendsService.unfriend(friendId),
    onMutate: async (friendId) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['friends'] });
      const previousFriends = queryClient.getQueryData(['friends']);

      queryClient.setQueryData(['friends'], (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.filter((f: any) => f.friend.id !== friendId),
        };
      });

      return { previousFriends };
    },
    onError: (err, friendId, context) => {
      queryClient.setQueryData(['friends'], context?.previousFriends);
      toast.error('Failed to unfriend user');
    },
    onSuccess: () => {
      toast.success('Friend removed');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
    },
  });

  const blockUser = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason?: string }) =>
      friendsService.blockUser(userId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      toast.success('User blocked');
    },
    onError: () => {
      toast.error('Failed to block user');
    },
  });

  return {
    sendRequest,
    acceptRequest,
    rejectRequest,
    unfriend,
    blockUser,
  };
}
