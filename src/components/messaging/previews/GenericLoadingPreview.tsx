import React from 'react'

export function GenericLoadingPreview() {
    return (
        <div className="flex items-start gap-3 p-3 animate-pulse">
            {/* Image skeleton */}
            <div className="w-12 h-12 rounded-lg bg-gray-200 flex-shrink-0" />

            {/* Content skeleton */}
            <div className="flex-1 space-y-2 min-w-0">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
                <div className="h-3 bg-gray-200 rounded w-1/4" />
            </div>
        </div>
    )
}
