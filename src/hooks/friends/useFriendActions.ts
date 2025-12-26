import { useMutation, useQueryClient } from '@tanstack/react-query';
import { friendsService } from '../../services/friendsService';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';

/**
 * React Query hook providing mutation functions for all friend-related actions.
 * 
 * This hook returns mutation objects for sending, accepting, rejecting, and cancelling
 * friend requests, as well as unfriending and blocking users. Each mutation includes
 * automatic query invalidation and toast notifications for user feedback.
 * 
 * @returns Object containing mutation functions for friend actions:
 * - `sendRequest` - Send a friend request to a user
 * - `acceptRequest` - Accept a pending friend request
 * - `rejectRequest` - Reject a pending friend request
 * - `cancelRequest` - Cancel a sent friend request
 * - `unfriend` - Remove an existing friendship
 * - `blockUser` - Block a user
 * - `unblockUser` - Unblock a user
 * 
 * @example
 * ```typescript
 * import { useFriendActions } from '@/hooks/friends/useFriendActions';
 * 
 * function FriendRequestCard({ request }) {
 *   const { acceptRequest, rejectRequest } = useFriendActions();
 * 
 *   const handleAccept = () => {
 *     acceptRequest.mutate(request.id);
 *   };
 * 
 *   const handleReject = () => {
 *     rejectRequest.mutate(request.id);
 *   };
 * 
 *   return (
 *     <div>
 *       <p>{request.sender.full_name} wants to be friends</p>
 *       <button 
 *         onClick={handleAccept}
 *         disabled={acceptRequest.isPending}
 *       >
 *         {acceptRequest.isPending ? 'Accepting...' : 'Accept'}
 *       </button>
 *       <button 
 *         onClick={handleReject}
 *         disabled={rejectRequest.isPending}
 *       >
 *         Reject
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 * 
 * @see {@link friendsService} for the underlying service functions
 * @see {@link useFriends} to fetch the friends list
 * @see {@link useFriendRequests} to fetch friend requests
 */
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
          data: old.data.filter((f: any) => f.id !== friendId),
        };
      });

      return { previousFriends };
    },
    onError: (err, friendId, context) => {
      queryClient.setQueryData(['friends', user?.id], context?.previousFriends);
      toast.error(err.message || 'Failed to unfriend user');
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
