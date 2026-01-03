import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { 
  followUser, 
  unfollowUser, 
  isFollowing, 
  getFollowers, 
  getFollowing,
  getFollowerCount,
  getFollowingCount,
  getMutualFollowers,
  subscribeToFollowChanges
} from '../services/followService';
import { useAuth } from '../contexts/AuthContext';

// Query keys
export const followQueryKeys = {
  all: ['follows'] as const,
  isFollowing: (userId: string) => [...followQueryKeys.all, 'isFollowing', userId] as const,
  followers: (userId: string) => [...followQueryKeys.all, 'followers', userId] as const,
  following: (userId: string) => [...followQueryKeys.all, 'following', userId] as const,
  followerCount: (userId: string) => [...followQueryKeys.all, 'followerCount', userId] as const,
  followingCount: (userId: string) => [...followQueryKeys.all, 'followingCount', userId] as const,
  mutualFollowers: (userId: string) => [...followQueryKeys.all, 'mutualFollowers', userId] as const,
};

/**
 * Hook to check if current user is following another user
 * Includes realtime updates
 */
export const useIsFollowing = (userId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: followQueryKeys.isFollowing(userId),
    queryFn: async () => {
      if (!user) return false;
      return await isFollowing(userId);
    },
    enabled: !!user && !!userId,
    staleTime: 5000, // Consider data fresh for 5 seconds
  });

  // Subscribe to realtime changes
  useEffect(() => {
    if (!user || !userId) return;

    const unsubscribe = subscribeToFollowChanges((payload) => {
      const followerId = payload.new?.follower_id || payload.old?.follower_id;
      const followingId = payload.new?.following_id || payload.old?.following_id;

      // Only invalidate if this change affects current user's following status
      if (followerId === user.id && followingId === userId) {
        queryClient.invalidateQueries({ queryKey: followQueryKeys.isFollowing(userId) });
        queryClient.invalidateQueries({ queryKey: followQueryKeys.followingCount(user.id) });
      }
    });

    return unsubscribe;
  }, [user, userId, queryClient]);

  return query;
};

/**
 * Hook to follow/unfollow a user
 * Includes optimistic updates and cache invalidation
 */
export const useFollow = (userId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const followMutation = useMutation({
    mutationFn: async () => {
      return await followUser(userId);
    },
    onMutate: async () => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: followQueryKeys.isFollowing(userId) });

      // Optimistically update to following state
      queryClient.setQueryData(followQueryKeys.isFollowing(userId), true);
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: followQueryKeys.isFollowing(userId) });
      queryClient.invalidateQueries({ queryKey: followQueryKeys.followers(userId) });
      queryClient.invalidateQueries({ queryKey: followQueryKeys.followerCount(userId) });
      
      if (user) {
        queryClient.invalidateQueries({ queryKey: followQueryKeys.following(user.id) });
        queryClient.invalidateQueries({ queryKey: followQueryKeys.followingCount(user.id) });
      }

      toast.success('User followed successfully');
    },
    onError: (error: Error) => {
      // Revert optimistic update
      queryClient.invalidateQueries({ queryKey: followQueryKeys.isFollowing(userId) });
      
      toast.error(`Failed to follow user: ${error.message}`);
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: async () => {
      return await unfollowUser(userId);
    },
    onMutate: async () => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: followQueryKeys.isFollowing(userId) });

      // Optimistically update to not following state
      queryClient.setQueryData(followQueryKeys.isFollowing(userId), false);
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: followQueryKeys.isFollowing(userId) });
      queryClient.invalidateQueries({ queryKey: followQueryKeys.followers(userId) });
      queryClient.invalidateQueries({ queryKey: followQueryKeys.followerCount(userId) });
      
      if (user) {
        queryClient.invalidateQueries({ queryKey: followQueryKeys.following(user.id) });
        queryClient.invalidateQueries({ queryKey: followQueryKeys.followingCount(user.id) });
      }

      toast.success('User unfollowed successfully');
    },
    onError: (error: Error) => {
      // Revert optimistic update
      queryClient.invalidateQueries({ queryKey: followQueryKeys.isFollowing(userId) });
      
      toast.error(`Failed to unfollow user: ${error.message}`);
    },
  });

  return {
    follow: followMutation.mutate,
    unfollow: unfollowMutation.mutate,
    isFollowing: followMutation.isPending || unfollowMutation.isPending,
  };
};

/**
 * Hook to get list of followers for a user
 * Includes realtime updates
 */
export const useFollowers = (userId: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const query = useQuery({
    queryKey: followQueryKeys.followers(userId),
    queryFn: async () => {
      return await getFollowers(userId);
    },
    enabled: !!userId,
    staleTime: 10000, // Consider data fresh for 10 seconds
  });

  // Subscribe to realtime changes
  useEffect(() => {
    if (!userId) return;

    const unsubscribe = subscribeToFollowChanges((payload) => {
      const followingId = payload.new?.following_id || payload.old?.following_id;

      // Invalidate followers list if this user gained/lost a follower
      if (followingId === userId) {
        queryClient.invalidateQueries({ queryKey: followQueryKeys.followers(userId) });
        queryClient.invalidateQueries({ queryKey: followQueryKeys.followerCount(userId) });
      }
    });

    return unsubscribe;
  }, [userId, queryClient]);

  return query;
};

/**
 * Hook to get list of users a user is following
 * Includes realtime updates
 */
export const useFollowing = (userId: string) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: followQueryKeys.following(userId),
    queryFn: async () => {
      return await getFollowing(userId);
    },
    enabled: !!userId,
    staleTime: 10000, // Consider data fresh for 10 seconds
  });

  // Subscribe to realtime changes
  useEffect(() => {
    if (!userId) return;

    const unsubscribe = subscribeToFollowChanges((payload) => {
      const followerId = payload.new?.follower_id || payload.old?.follower_id;

      // Invalidate following list if this user followed/unfollowed someone
      if (followerId === userId) {
        queryClient.invalidateQueries({ queryKey: followQueryKeys.following(userId) });
        queryClient.invalidateQueries({ queryKey: followQueryKeys.followingCount(userId) });
      }
    });

    return unsubscribe;
  }, [userId, queryClient]);

  return query;
};

/**
 * Hook to get follower count for a user
 * Includes realtime updates
 */
export const useFollowerCount = (userId: string) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: followQueryKeys.followerCount(userId),
    queryFn: async () => {
      return await getFollowerCount(userId);
    },
    enabled: !!userId,
    staleTime: 5000,
  });

  // Subscribe to realtime changes
  useEffect(() => {
    if (!userId) return;

    const unsubscribe = subscribeToFollowChanges((payload) => {
      const followingId = payload.new?.following_id || payload.old?.following_id;

      if (followingId === userId) {
        queryClient.invalidateQueries({ queryKey: followQueryKeys.followerCount(userId) });
      }
    });

    return unsubscribe;
  }, [userId, queryClient]);

  return query;
};

/**
 * Hook to get following count for a user
 * Includes realtime updates
 */
export const useFollowingCount = (userId: string) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: followQueryKeys.followingCount(userId),
    queryFn: async () => {
      return await getFollowingCount(userId);
    },
    enabled: !!userId,
    staleTime: 5000,
  });

  // Subscribe to realtime changes
  useEffect(() => {
    if (!userId) return;

    const unsubscribe = subscribeToFollowChanges((payload) => {
      const followerId = payload.new?.follower_id || payload.old?.follower_id;

      if (followerId === userId) {
        queryClient.invalidateQueries({ queryKey: followQueryKeys.followingCount(userId) });
      }
    });

    return unsubscribe;
  }, [userId, queryClient]);

  return query;
};

/**
 * Hook to get mutual followers between current user and another user
 */
export const useMutualFollowers = (userId: string) => {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: followQueryKeys.mutualFollowers(userId),
    queryFn: async () => {
      if (!user) return [];
      return await getMutualFollowers(userId);
    },
    enabled: !!user && !!userId,
    staleTime: 15000, // Consider data fresh for 15 seconds (less volatile)
  });

  return query;
};
