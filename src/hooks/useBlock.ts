import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  blockUser,
  unblockUser,
  getBlockedUsers,
  isUserBlocked,
  isBlockedByUser,
  getBlockedUsersCount,
  getBlockingStatus,
  subscribeToBlockChanges,
  BlockUserResult,
  UnblockUserResult,
  BlockedUser,
} from '../services/blockService';
import { useAuthStore } from '../store/authStore';

// Query keys
export const blockQueryKeys = {
  all: ['blocks'] as const,
  list: () => [...blockQueryKeys.all, 'list'] as const,
  count: () => [...blockQueryKeys.all, 'count'] as const,
  isBlocked: (userId: string) => [...blockQueryKeys.all, 'isBlocked', userId] as const,
  isBlockedBy: (userId: string) => [...blockQueryKeys.all, 'isBlockedBy', userId] as const,
  status: (userId: string) => [...blockQueryKeys.all, 'status', userId] as const,
};

/**
 * Hook to get list of blocked users
 * Includes realtime updates
 */
export const useBlockedUsers = () => {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: blockQueryKeys.list(),
    queryFn: getBlockedUsers,
    enabled: !!user,
    staleTime: 30000, // Consider data fresh for 30 seconds
  });

  // Subscribe to realtime changes
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToBlockChanges(() => {
      // Invalidate blocked users list when any block/unblock occurs
      queryClient.invalidateQueries({ queryKey: blockQueryKeys.list() });
      queryClient.invalidateQueries({ queryKey: blockQueryKeys.count() });
    });

    return unsubscribe;
  }, [user, queryClient]);

  return query;
};

/**
 * Hook to get count of blocked users
 */
export const useBlockedUsersCount = () => {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: blockQueryKeys.count(),
    queryFn: getBlockedUsersCount,
    enabled: !!user,
    staleTime: 30000,
  });

  // Subscribe to realtime changes
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToBlockChanges(() => {
      queryClient.invalidateQueries({ queryKey: blockQueryKeys.count() });
    });

    return unsubscribe;
  }, [user, queryClient]);

  return query;
};

/**
 * Hook to check if a specific user is blocked by current user
 */
export const useIsBlocked = (userId: string) => {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: blockQueryKeys.isBlocked(userId),
    queryFn: () => isUserBlocked(userId),
    enabled: !!user && !!userId,
    staleTime: 10000,
  });

  // Subscribe to realtime changes
  useEffect(() => {
    if (!user || !userId) return;

    const unsubscribe = subscribeToBlockChanges((payload) => {
      const blockedId = payload.new?.blocked_id || payload.old?.blocked_id;

      // Invalidate if this block affects the queried user
      if (blockedId === userId) {
        queryClient.invalidateQueries({ queryKey: blockQueryKeys.isBlocked(userId) });
        queryClient.invalidateQueries({ queryKey: blockQueryKeys.status(userId) });
      }
    });

    return unsubscribe;
  }, [user, userId, queryClient]);

  return query;
};

/**
 * Hook to check if current user is blocked by another user
 */
export const useIsBlockedBy = (userId: string) => {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: blockQueryKeys.isBlockedBy(userId),
    queryFn: () => isBlockedByUser(userId),
    enabled: !!user && !!userId,
    staleTime: 10000,
  });

  // Subscribe to realtime changes
  useEffect(() => {
    if (!user || !userId) return;

    const unsubscribe = subscribeToBlockChanges((payload) => {
      const blockerId = payload.new?.blocker_id || payload.old?.blocker_id;

      // Invalidate if this block was initiated by the queried user
      if (blockerId === userId) {
        queryClient.invalidateQueries({ queryKey: blockQueryKeys.isBlockedBy(userId) });
        queryClient.invalidateQueries({ queryKey: blockQueryKeys.status(userId) });
      }
    });

    return unsubscribe;
  }, [user, userId, queryClient]);

  return query;
};

/**
 * Hook to get blocking status (both directions) for a user
 */
export const useBlockingStatus = (userId: string) => {
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: blockQueryKeys.status(userId),
    queryFn: () => getBlockingStatus(userId),
    enabled: !!user && !!userId,
    staleTime: 10000,
  });
};

/**
 * Hook to block a user
 * Includes optimistic updates and comprehensive cache invalidation
 */
export const useBlockUser = () => {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason?: string }) =>
      blockUser(userId, reason),

    onMutate: async ({ userId }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: blockQueryKeys.isBlocked(userId) });

      // Optimistically update to blocked state
      queryClient.setQueryData(blockQueryKeys.isBlocked(userId), true);

      toast.loading('Blocking user...', { id: `block-${userId}` });
    },

    onSuccess: (result: BlockUserResult, { userId }) => {
      // Dismiss loading toast
      toast.dismiss(`block-${userId}`);

      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: blockQueryKeys.all });

      // Also invalidate friend/follow queries since blocking removes these
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
      queryClient.invalidateQueries({ queryKey: ['follows'] });

      // Build success message with details
      const details = [];
      if (result.friendships_removed > 0) {
        details.push(`${result.friendships_removed} friendship(s) removed`);
      }
      if (result.follows_removed > 0) {
        details.push(`${result.follows_removed} follow(s) removed`);
      }
      if (result.requests_cancelled > 0) {
        details.push(`${result.requests_cancelled} request(s) cancelled`);
      }

      const message = result.already_blocked
        ? 'User was already blocked'
        : details.length > 0
          ? `User blocked successfully (${details.join(', ')})`
          : 'User blocked successfully';

      toast.success(message);
    },

    onError: (error: Error, { userId }) => {
      // Dismiss loading toast
      toast.dismiss(`block-${userId}`);

      // Revert optimistic update
      queryClient.invalidateQueries({ queryKey: blockQueryKeys.isBlocked(userId) });

      toast.error(`Failed to block user: ${error.message}`);
    },
  });
};

/**
 * Hook to unblock a user
 */
export const useUnblockUser = () => {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: unblockUser,

    onMutate: async (userId: string) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: blockQueryKeys.isBlocked(userId) });

      // Optimistically update to unblocked state
      queryClient.setQueryData(blockQueryKeys.isBlocked(userId), false);

      toast.loading('Unblocking user...', { id: `unblock-${userId}` });
    },

    onSuccess: (result: UnblockUserResult, userId: string) => {
      // Dismiss loading toast
      toast.dismiss(`unblock-${userId}`);

      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: blockQueryKeys.all });

      toast.success('User unblocked successfully. They can now see your profile again.');
    },

    onError: (error: Error, userId: string) => {
      // Dismiss loading toast
      toast.dismiss(`unblock-${userId}`);

      // Revert optimistic update
      queryClient.invalidateQueries({ queryKey: blockQueryKeys.isBlocked(userId) });

      toast.error(`Failed to unblock user: ${error.message}`);
    },
  });
};
