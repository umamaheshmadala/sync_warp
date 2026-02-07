import React from 'react';
import { LikedByFriend } from '../../../services/productLikeService';

interface ProductLikedByProps {
    friends: LikedByFriend[];
    totalLikes: number;
    onClick?: () => void;
}

export const ProductLikedBy: React.FC<ProductLikedByProps> = ({ friends, totalLikes, onClick }) => {
    if (totalLikes === 0) return (
        <div className="text-sm font-semibold text-gray-900">
            Be the first to like this
        </div>
    );

    if (friends.length === 0) return (
        <div className="text-sm font-semibold text-gray-900">
            {totalLikes} {totalLikes === 1 ? 'like' : 'likes'}
        </div>
    );

    // "Liked by Friend A, Friend B and 15 others"
    const remaining = Math.max(0, totalLikes - friends.length);

    return (
        <div className="text-sm text-gray-900 cursor-pointer" onClick={onClick}>
            Liked by{' '}
            {friends.map((friend, idx) => (
                <span key={friend.user_id}>
                    <span className="font-semibold">{friend.full_name}</span>
                    {idx < friends.length - 1 ? ', ' : ' '}
                </span>
            ))}
            {remaining > 0 && (
                <>
                    and <span className="font-semibold">{remaining} others</span>
                </>
            )}
        </div>
    );
};
