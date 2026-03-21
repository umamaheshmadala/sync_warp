import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useQueryClient } from '@tanstack/react-query';

export function useProductStats(productId: string, initialStats: { share_count?: number, favorite_count?: number, like_count?: number }) {
    const queryClient = useQueryClient();
    const [stats, setStats] = useState({
        shareCount: initialStats.share_count || 0,
        favoriteCount: initialStats.favorite_count || 0,
    });

    useEffect(() => {
        if (!productId) return;

        // Sync initial state
        setStats({
            shareCount: initialStats.share_count || 0,
            favoriteCount: initialStats.favorite_count || 0,
        });

        const channel = supabase
            .channel(`product-stats-${productId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'products',
                    filter: `id=eq.${productId}`,
                },
                (payload: any) => {
                    const newRow = payload.new;
                    setStats(prev => {
                        const hasChanges = 
                             prev.shareCount !== newRow.share_count ||
                             prev.favoriteCount !== newRow.favorite_count;
                        
                        // We also invalidate trending rank if ANY engagement stat changed (including likes)
                        if (hasChanges || newRow.like_count !== initialStats.like_count) {
                            queryClient.invalidateQueries({ queryKey: ['product_trending_rank', productId] });
                        }

                        return {
                            shareCount: newRow.share_count ?? prev.shareCount,
                            favoriteCount: newRow.favorite_count ?? prev.favoriteCount,
                        };
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [productId, queryClient, initialStats.share_count, initialStats.favorite_count, initialStats.like_count]);

    return stats;
}
