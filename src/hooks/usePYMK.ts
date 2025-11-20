/**
 * PYMK Hooks - React Query Integration
 * Story 9.3.5: People You May Know Cards
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { friendService, PYMKSuggestion } from '../services/friendService';
import { useAuthStore } from '../store/authStore';
import { toast } from 'react-hot-toast';

/**
 * Hook for PYMK recommendations
 */
export function usePYMK(limit: number = 10) {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['pymk', user?.id],
    queryFn: () => friendService.getPymkSuggestions(user!.id, limit),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook for dismissing a PYMK suggestion
 */
export function useDismissPYMK() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: (suggestedUserId: string) => friendService.dismissPymkSuggestion(suggestedUserId),
    onSuccess: (_, suggestedUserId) => {
      queryClient.setQueryData(['pymk', user?.id], (old: PYMKSuggestion[] | undefined) =>
        old ? old.filter(s => s.id !== suggestedUserId) : []
      );
      toast.success('Suggestion dismissed');
    },
    onError: () => {
      toast.error('Failed to dismiss suggestion');
    }
  });
}

/**
 * Hook to manually refresh PYMK recommendations
 */
export function useRefreshPYMK() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async () => {
      await queryClient.invalidateQueries({ queryKey: ['pymk', user?.id] });
    }
  });
}
