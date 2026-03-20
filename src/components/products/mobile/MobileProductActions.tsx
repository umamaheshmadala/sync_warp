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
    const { isFavorite, toggleFavorite, isLoading: isFavLoading } = useProductFavorite(product.id);

    return (
        <div className="flex flex-col px-4 py-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                    {/* 1. Like Button */}
                    <div className="flex flex-col items-center gap-1 group">
                        <ProductLikeButton
                            isLiked={isLiked}
                            onToggle={toggleLike}
                            size={28}
                            className="p-1"
                        />
                        <span className="text-xs font-medium text-gray-900">
                            {likeCount > 0 ? formatCount(likeCount) : 'Like'}
                        </span>
                    </div>

                    {/* 2. Friends Like Button */}
                    <div className="flex flex-col items-center gap-1">
                        <FriendsLikeButton
                            size={28}
                            className="p-1"
                            onClick={() => setIsFriendsSheetOpen(true)}
                        />
                        <span className="text-xs font-medium text-gray-900">
                            {likedByFriends.length} {likedByFriends.length === 1 ? 'Friend' : 'Friends'}
                        </span>
                    </div>

                    {/* 3. Trending Button */}
                    <TrendingButton
                        productId={product.id}
                        businessId={product.business_id}
                        variant="action-bar"
                    />

                    {/* 4. Share Button */}
                    <button
                        onClick={handleShare}
                        className="flex flex-col items-center gap-1 p-1"
                    >
                        <Send size={28} className="text-gray-900" strokeWidth={1.5} />
                        <span className="text-xs font-medium text-gray-900">Share</span>
                    </button>
                </div>

                {/* 5. Favorite Button (Right Aligned) */}
                <div className="flex flex-col items-center gap-1">
                    <ProductFavoriteButton
                        isFavorite={isFavorite}
                        onToggle={toggleFavorite}
                        isLoading={isFavLoading}
                        size={28}
                        className="p-1"
                    />
                    <span className="text-xs font-medium text-gray-900">Save</span>
                </div>
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
