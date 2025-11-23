import React from 'react';
import { FriendCardSkeleton } from './FriendCardSkeleton';

interface FriendsListSkeletonProps {
    count?: number;
}

export function FriendsListSkeleton({ count = 5 }: FriendsListSkeletonProps) {
    return (
        <div className="space-y-0">
            {Array.from({ length: count }).map((_, i) => (
                <FriendCardSkeleton key={i} />
            ))}
        </div>
    );
}
