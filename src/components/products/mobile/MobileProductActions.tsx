import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { Product } from '../../../types/product';
import { useProductLike } from '../../../hooks/useProductLike';
import { useProductFavorite } from '../../../hooks/useProductFavorite';
import { ProductLikeButton } from '../social/ProductLikeButton';
import { ProductFavoriteButton } from '../actions/ProductFavoriteButton';
import { FriendsLikeButton } from '../social/FriendsLikeButton';
import { FriendsLikeSheet } from '../social/FriendsLikeSheet';
import { ProductLikedBy } from '../social/ProductLikedBy';
import { TrendingButton } from '../social/TrendingButton';
import { ShareFriendPickerModal } from '../../Sharing/ShareFriendPickerModal';
import { useProductStats } from '../../../hooks/useProductStats';

interface MobileProductActionsProps {
    product: Product;
    onComment?: () => void;
}

// Utility for formatting counts
const formatCount = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return count.toString();
};

export const MobileProductActions: React.FC<MobileProductActionsProps> = ({
    product,
    onComment
}) => {
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isFriendsSheetOpen, setIsFriendsSheetOpen] = useState(false);

    const handleShare = () => {
        setIsShareModalOpen(true);
    };

    // Like Logic
    const { isLiked, likeCount, likedByFriends, toggleLike, isLoading: isLikeLoading } = useProductLike(product.id, product.like_count || 0);

    // Favorite Logic
    const { isFavorite, toggleFavorite, isLoading: isFavLoading } = useProductFavorite(product.id, false);

    // Realtime Stats
    const { shareCount, favoriteCount } = useProductStats(product.id, {
        share_count: product.share_count,
        favorite_count: product.favorite_count, // Fallback if missing? 
        like_count: product.like_count
    });

    return (
        <div className="flex flex-col px-2 py-2">
            <div className="flex items-center justify-between w-full">
                {/* 1. Like Button */}
                <ProductLikeButton
                    isLiked={isLiked}
                    onToggle={toggleLike}
                    size={26}
                    className="p-0.5 min-w-fit"
                >
                    <span className="text-[13px] font-medium text-gray-900">
                        {likeCount > 0 ? formatCount(likeCount) : 'Like'}
                    </span>
                </ProductLikeButton>

                {/* 2. Friends Like Button */}
                <FriendsLikeButton
                    size={26}
                    className="p-0.5 min-w-fit gap-1.5"
                    onClick={() => setIsFriendsSheetOpen(true)}
                >
                    <span className="text-[13px] font-medium text-gray-900">
                        {likedByFriends.length > 0 ? formatCount(likedByFriends.length) : '0'}
                    </span>
                </FriendsLikeButton>

                {/* 3. Trending Button */}
                <div className="flex items-center justify-center gap-1.5 min-w-fit">
                     <TrendingButton
                         productId={product.id}
                         businessId={product.business_id}
                         variant="action-bar"
                     />
                </div>

                {/* 4. Share Button */}
                <button
                    onClick={handleShare}
                    className="flex items-center justify-center gap-1.5 p-0.5 min-w-fit"
                >
                    <Send size={26} className="text-gray-900" strokeWidth={1.5} />
                    <span className="text-[13px] font-medium text-gray-900">
                        {shareCount > 0 ? formatCount(shareCount) : 'Share'}
                    </span>
                </button>

                {/* 5. Favorite Button */}
                <ProductFavoriteButton
                    isFavorite={isFavorite}
                    onToggle={toggleFavorite}
                    isLoading={isFavLoading}
                    size={26}
                    className="p-0.5 min-w-fit"
                >
                    <span className="text-[13px] font-medium text-gray-900">
                        {favoriteCount > 0 ? formatCount(favoriteCount) : 'Save'}
                    </span>
                </ProductFavoriteButton>
            </div>

            {/* Liked By Section */}
            <div className="px-2 pb-1">
                <ProductLikedBy
                    friends={likedByFriends}
                    totalLikes={likeCount}
                    onClick={() => setIsFriendsSheetOpen(true)}
                />
            </div>

            <FriendsLikeSheet
                isOpen={isFriendsSheetOpen}
                onOpenChange={setIsFriendsSheetOpen}
                friends={likedByFriends}
            />

            <ShareFriendPickerModal
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
                entityType="product"
                entityId={product.id}
                entityData={{
                    title: product.name,
                    description: product.description?.slice(0, 100) || undefined,
                    imageUrl: product.image_urls?.[0] || product.image_url,
                    url: `${window.location.origin}/product/${product.id}`
                }}
            />
        </div>
    );
};
