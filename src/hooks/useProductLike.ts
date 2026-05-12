import { useState, useEffect, useCallback, useRef } from 'react';
import { productLikeService, LikedByFriend } from '../services/productLikeService';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export const useProductLike = (productId: string, initialLikeCount: number = 0) => {
    const user = useAuthStore((state) => state.user);
    const [isLiked, setIsLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(initialLikeCount);
    const [likedByFriends, setLikedByFriends] = useState<LikedByFriend[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Track when the current user just toggled, to skip the incoming
    // Realtime event and avoid double-counting on top of the optimistic update.
    const justToggledRef = useRef(false);

    // Fetch initial state
    useEffect(() => {
        if (!user || !productId) {
            setIsLoading(false);
            return;
        }

        const fetchLikeStatus = async () => {
            try {
                // Parallel fetch
                const [liked, friends] = await Promise.all([
                    productLikeService.checkIsLiked(productId, user.id),
                    productLikeService.getFriendsWhoLiked(productId, user.id, 100)
                ]);

                setIsLiked(liked);
                setLikedByFriends(friends);
            } catch (error) {
                console.error('Error fetching like status:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchLikeStatus();
    }, [productId, user]);

    // ── Realtime subscription ──────────────────────────────────────
    // Subscribe to UPDATE events on the `products` row.
    // The DB trigger `product_likes_count_trigger` keeps
    // `products.like_count` in sync, so we just read the new value.
    useEffect(() => {
        if (!productId) return;

        const channel = supabase
            .channel(`product-likes-${productId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'products',
                    filter: `id=eq.${productId}`,
                },
                (payload) => {
                    const newCount = (payload.new as any)?.like_count;
                    if (typeof newCount !== 'number') return;

                    // If the current user just toggled, skip this event
                    // because we already applied the optimistic update.
                    if (justToggledRef.current) {
                        justToggledRef.current = false;
                        return;
                    }

                    setLikeCount(newCount);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [productId]);

    const toggleLike = useCallback(async () => {
        if (!user) {
            toast.error('Please login to like products');
            return;
        }

        // Optimistic Update
        const previousIsLiked = isLiked;
        const previousCount = likeCount;

        const newIsLiked = !previousIsLiked;
        const newCount = newIsLiked ? previousCount + 1 : Math.max(0, previousCount - 1);

        // Mark that we just toggled so the Realtime handler skips
        // the next incoming event for this product.
        justToggledRef.current = true;

        setIsLiked(newIsLiked);
        setLikeCount(newCount);

        try {
            if (newIsLiked) {
                const { error } = await productLikeService.likeProduct(productId, user.id);
                if (error) throw error;
                // Fire notification logic (check toggle internally)
                productLikeService.notifyOwner(productId, user.id, 'like').catch(console.error);
            } else {
                const { error } = await productLikeService.unlikeProduct(productId, user.id);
                if (error) throw error;
            }
        } catch (error) {
            // Revert on error
            justToggledRef.current = false;
            setIsLiked(previousIsLiked);
            setLikeCount(previousCount);
            toast.error('Failed to update like');
            console.error(error);
        }
    }, [isLiked, likeCount, productId, user]);

    return {
        isLiked,
        likeCount,
        likedByFriends,
        toggleLike,
        isLoading
    };
};

