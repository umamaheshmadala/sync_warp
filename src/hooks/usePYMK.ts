/**
 * PYMK Hooks - React Query Integration
 * Story 9.2.2: People You May Know Engine
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getPeopleYouMayKnow, 
  dismissPYMKSuggestion,
  trackPYMKEvent,
  type PYMKRecommendation 
} from '../services/recommendationService';
import { useEffect } from 'react';

/**
 * Hook for PYMK recommendations with auto-refresh
 */
export function usePYMK(limit: number = 20) {
  const query = useQuery({
    queryKey: ['pymk', 'recommendations', limit],
    queryFn: () => getPeopleYouMayKnow(limit),
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    refetchInterval: 1000 * 60 * 60 * 24, // Auto-refresh every 24 hours
    retry: 2,
  });

  // Track impressions when data loads
  useEffect(() => {
    if (query.data && query.data.length > 0) {
      query.data.forEach(recommendation => {
        trackPYMKEvent('impression', recommendation.user_id);
      });
    }
  }, [query.data]);

  return query;
}

/**
 * Hook for dismissing a PYMK suggestion
 */
export function useDismissPYMK() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (suggestedUserId: string) => {
      trackPYMKEvent('dismiss', suggestedUserId);
      return dismissPYMKSuggestion(suggestedUserId);
    },
    onMutate: async (suggestedUserId) => {
      // Optimistically remove from list
      await queryClient.cancelQueries({ queryKey: ['pymk', 'recommendations'] });
      
      const previousData = queryClient.getQueryData<PYMKRecommendation[]>(['pymk', 'recommendations']);
      
      queryClient.setQueryData<PYMKRecommendation[]>(
        ['pymk', 'recommendations'],
        (old) => old?.filter(item => item.user_id !== suggestedUserId) || []
      );

      return { previousData };
    },
    onError: (err, suggestedUserId, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(['pymk', 'recommendations'], context.previousData);
      }
    },
    onSuccess: () => {
      // Refetch after successful dismiss
      queryClient.invalidateQueries({ queryKey: ['pymk', 'recommendations'] });
    },
  });
}

/**
 * Hook to manually refresh PYMK recommendations
 */
export function useRefreshPYMK() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await queryClient.invalidateQueries({ queryKey: ['pymk', 'recommendations'] });
      return queryClient.fetchQuery({
        queryKey: ['pymk', 'recommendations'],
        queryFn: () => getPeopleYouMayKnow(),
      });
    },
  });
}
