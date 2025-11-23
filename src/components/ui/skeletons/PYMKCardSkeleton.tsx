import React from 'react';

export function PYMKCardSkeleton() {
    return (
        <div className="bg-white rounded-lg border border-gray-200 p-4 w-64 shrink-0 animate-pulse">
            {/* Avatar */}
            <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto" />

            {/* Name */}
            <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mt-3" />

            {/* Reason */}
            <div className="h-3 bg-gray-200 rounded w-1/2 mx-auto mt-2" />

            {/* Mutual friends avatars */}
            <div className="flex justify-center -space-x-2 mt-2">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="w-6 h-6 bg-gray-200 rounded-full border-2 border-white" />
                ))}
            </div>

            {/* Button */}
            <div className="h-10 bg-gray-200 rounded-lg mt-3" />
        </div>
    );
}
