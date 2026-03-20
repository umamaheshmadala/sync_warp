import { useQuery } from '@tanstack/react-query';
import { trendingService } from '../services/trendingService';

export function useProductTrending(productId?: string) {
  return useQuery({
    queryKey: ['product_trending_rank', productId],
    queryFn: async () => {
      if (!productId) {
        return { rank: null, l2_category_id: null, l2_category_name: null };
      }
      return trendingService.getProductTrendingRank(productId);
    },
    enabled: !!productId,
    staleTime: 15 * 60 * 1000, // 15 minutes (stale time as per specs)
    gcTime: 30 * 60 * 1000,
  });
}
