/**
 * useRequestActions Hook
 * Story 9.3.2: Friend Requests UI
 * 
 * Provides accept/reject actions with optimistic updates
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { friendsService } from '../../services/friendsService';

export function useRequestActions() {
  const queryClient = useQueryClient();
  const user = useAuthStore(state => state.user);

  const acceptMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await friendsService.acceptFriendRequest(requestId);
      if (error) throw new Error(error);
      return requestId;
    },
    onMutate: async (requestId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['friendRequests'] });

      // Snapshot previous values
      const previousReceived = queryClient.getQueryData(['friendRequests', 'received', user?.id]);
      const previousSent = queryClient.getQueryData(['friendRequests', 'sent', user?.id]);

      // Optimistically remove from UI
      queryClient.setQueryData(['friendRequests', 'received', user?.id], (old: any) => {
        if (!old) return old;
        if (Array.isArray(old)) {
          return old.filter((req: any) => req.id !== requestId);
        }
        return {
          ...old,
          pages: old.pages.map((page: any[]) =>
            page.filter((req) => req.id !== requestId)
          ),
        };
      });

      return { previousReceived, previousSent };
    },
    onError: (_err, _requestId, context) => {
      // Rollback on error
      if (context?.previousReceived) {
        queryClient.setQueryData(['friendRequests', 'received', user?.id], context.previousReceived);
      }
      if (context?.previousSent) {
        queryClient.setQueryData(['friendRequests', 'sent', user?.id], context.previousSent);
      }
      toast.error('Failed to accept friend request');
    },
    onSuccess: () => {
      // Aggressively clear cache to prevent stale data
      queryClient.removeQueries({ queryKey: ['friendRequests'] });
      // Invalidate the specific friends list query used by useFriendsList
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['pymk'] }); // Also refresh PYMK
      toast.success('Friend request accepted!');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await friendsService.rejectFriendRequest(requestId);
      if (error) throw new Error(error);
      return requestId;
    },
    onMutate: async (requestId) => {
      await queryClient.cancelQueries({ queryKey: ['friendRequests'] });

      const previousReceived = queryClient.getQueryData(['friendRequests', 'received', user?.id]);
      const previousSent = queryClient.getQueryData(['friendRequests', 'sent', user?.id]);

      // Optimistically remove from UI
      ['received', 'sent'].forEach(type => {
        queryClient.setQueryData(['friendRequests', type, user?.id], (old: any) => {
          if (!old) return old;
          if (Array.isArray(old)) {
            return old.filter((req: any) => req.id !== requestId);
          }
          return {
            ...old,
            pages: old.pages.map((page: any[]) =>
              page.filter((req) => req.id !== requestId)
            ),
          };
        });
      });

      return { previousReceived, previousSent };
    },
    onError: (_err, _requestId, context) => {
      if (context?.previousReceived) {
        queryClient.setQueryData(['friendRequests', 'received', user?.id], context.previousReceived);
      }
      if (context?.previousSent) {
        queryClient.setQueryData(['friendRequests', 'sent', user?.id], context.previousSent);
      }
      toast.error('Failed to reject friend request');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
      toast.success('Friend request rejected');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await friendsService.cancelFriendRequest(requestId);
      if (error) throw new Error(error);
      return requestId;
    },
    onMutate: async (requestId) => {
      await queryClient.cancelQueries({ queryKey: ['friendRequests'] });

      const previousSent = queryClient.getQueryData(['friendRequests', 'sent', user?.id]);

      // Optimistically remove from UI
      queryClient.setQueryData(['friendRequests', 'sent', user?.id], (old: any) => {
        if (!old) return old;
        if (Array.isArray(old)) {
          return old.filter((req: any) => req.id !== requestId);
        }
        return {
          ...old,
          pages: old.pages.map((page: any[]) =>
            page.filter((req) => req.id !== requestId)
          ),
        };
      });

      return { previousSent };
    },
    onError: (_err, _requestId, context) => {
      if (context?.previousSent) {
        queryClient.setQueryData(['friendRequests', 'sent', user?.id], context.previousSent);
      }
      toast.error('Failed to cancel friend request');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
      toast.success('Friend request cancelled');
    },
  });

  return {
    acceptRequest: acceptMutation.mutate,
    rejectRequest: rejectMutation.mutate,
    cancelRequest: cancelMutation.mutate,
    isLoading: acceptMutation.isPending || rejectMutation.isPending || cancelMutation.isPending,
  };
}
