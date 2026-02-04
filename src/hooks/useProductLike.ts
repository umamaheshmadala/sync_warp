import { useState, useEffect, useCallback } from 'react';
import { productLikeService, LikedByFriend } from '../services/productLikeService';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

export const useProductLike = (productId: string, initialLikeCount: number = 0) => {
    const { user } = useAuthStore();
    const [isLiked, setIsLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(initialLikeCount);
    const [likedByFriends, setLikedByFriends] = useState<LikedByFriend[]>([]);
    const [isLoading, setIsLoading] = useState(true);

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
                    productLikeService.getFriendsWhoLiked(productId, user.id)
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
