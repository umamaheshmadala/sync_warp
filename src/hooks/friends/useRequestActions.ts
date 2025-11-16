/**
 * useRequestActions Hook
 * Story 9.3.2: Friend Requests UI
 * 
 * Provides accept/reject actions with optimistic updates
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

export function useRequestActions() {
  const queryClient = useQueryClient();

  const acceptMutation = useMutation({
    mutationFn: async (requestId: string) => {
      // Use DB function for atomic operation
      const { error } = await supabase.rpc('accept_friend_request', {
        request_id: requestId
      });

      if (error) throw error;
      return requestId;
    },
    onMutate: async (requestId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['friend-requests'] });

      // Snapshot previous values
      const previousReceived = queryClient.getQueryData(['friend-requests', 'received']);
      const previousSent = queryClient.getQueryData(['friend-requests', 'sent']);

      // Optimistically remove from UI
      queryClient.setQueryData(['friend-requests', 'received'], (old: any) => {
        if (!old) return old;
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
        queryClient.setQueryData(['friend-requests', 'received'], context.previousReceived);
      }
      if (context?.previousSent) {
        queryClient.setQueryData(['friend-requests', 'sent'], context.previousSent);
      }
      toast.error('Failed to accept friend request');
    },
    onSuccess: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
      queryClient.invalidateQueries({ queryKey: ['friends-list'] });
      toast.success('Friend request accepted!');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);

      if (error) throw error;
      return requestId;
    },
    onMutate: async (requestId) => {
      await queryClient.cancelQueries({ queryKey: ['friend-requests'] });

      const previousReceived = queryClient.getQueryData(['friend-requests', 'received']);
      const previousSent = queryClient.getQueryData(['friend-requests', 'sent']);

      // Optimistically remove from UI
      ['received', 'sent'].forEach(type => {
        queryClient.setQueryData(['friend-requests', type], (old: any) => {
          if (!old) return old;
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
        queryClient.setQueryData(['friend-requests', 'received'], context.previousReceived);
      }
      if (context?.previousSent) {
        queryClient.setQueryData(['friend-requests', 'sent'], context.previousSent);
      }
      toast.error('Failed to reject friend request');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
      toast.success('Friend request rejected');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'cancelled' })
        .eq('id', requestId);

      if (error) throw error;
      return requestId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
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
