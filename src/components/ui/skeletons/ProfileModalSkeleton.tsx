import React from 'react';

export function ProfileModalSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Header */}
            <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-gray-200 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                    <div className="h-6 bg-gray-200 rounded w-1/2" />
                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                </div>
            </div>

            {/* Mutual friends */}
            <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/4" />
                <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="w-10 h-10 bg-gray-200 rounded-full shrink-0" />
                    ))}
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
                <div className="flex-1 h-10 bg-gray-200 rounded-lg" />
                <div className="flex-1 h-10 bg-gray-200 rounded-lg" />
            </div>
        </div>
    );
}
