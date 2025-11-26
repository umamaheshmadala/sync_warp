import { useMutation, useQueryClient } from '@tanstack/react-query';
import { friendsService } from '../../services/friendsService';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';

export function useFriendActions() {
  const queryClient = useQueryClient();
  const user = useAuthStore(state => state.user);

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
      queryClient.invalidateQueries({ queryKey: ['friends', user?.id] });
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

  const cancelRequest = useMutation({
    mutationFn: (requestId: string) => friendsService.cancelFriendRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
      toast.success('Friend request cancelled');
    },
    onError: () => {
      toast.error('Failed to cancel friend request');
    },
  });

  const unfriend = useMutation({
    mutationFn: (friendId: string) => friendsService.unfriend(friendId),
    onMutate: async (friendId) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['friends', user?.id] });
      const previousFriends = queryClient.getQueryData(['friends', user?.id]);

      queryClient.setQueryData(['friends', user?.id], (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.filter((f: any) => f.friend.id !== friendId),
        };
      });

      return { previousFriends };
    },
    onError: (err, friendId, context) => {
      queryClient.setQueryData(['friends', user?.id], context?.previousFriends);
      toast.error('Failed to unfriend user');
    },
    onSuccess: () => {
      toast.success('Friend removed');
      queryClient.invalidateQueries({ queryKey: ['friends-list'] });
      queryClient.invalidateQueries({ queryKey: ['pymk'] });
    },
    onSettled: () => {
      // Also invalidate the legacy/service key just in case
      queryClient.invalidateQueries({ queryKey: ['friends', user?.id] });
    },
  });

  const blockUser = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason?: string }) =>
      friendsService.blockUser(userId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends', user?.id] });
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
    cancelRequest,
    unfriend,
    blockUser,
  };
}
