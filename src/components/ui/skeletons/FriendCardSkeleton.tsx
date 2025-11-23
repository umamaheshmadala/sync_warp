import React from 'react';

export function FriendCardSkeleton() {
    return (
        <div className="flex items-center gap-3 p-4 border-b border-gray-100 animate-pulse">
            {/* Avatar skeleton */}
            <div className="w-12 h-12 bg-gray-200 rounded-full shrink-0" />

            {/* Content skeleton */}
            <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>

            {/* Actions skeleton */}
            <div className="flex gap-2">
                <div className="w-8 h-8 bg-gray-200 rounded-full" />
                <div className="w-8 h-8 bg-gray-200 rounded-full" />
            </div>
        </div>
    );
}
