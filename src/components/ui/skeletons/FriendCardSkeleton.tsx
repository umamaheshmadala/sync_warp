export function FriendCardSkeleton() {
    return (
        <div className="flex items-center gap-3 p-4 animate-pulse border-b border-gray-100">
            {/* Avatar skeleton */}
            <div className="w-12 h-12 bg-gray-200 rounded-full shrink-0" />

            {/* Content skeleton */}
            <div className="flex-1 space-y-2 min-w-0">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>

            {/* Actions skeleton */}
            <div className="flex gap-2 shrink-0">
                <div className="w-8 h-8 bg-gray-200 rounded-full" />
                <div className="w-8 h-8 bg-gray-200 rounded-full" />
            </div>
        </div>
    );
}
