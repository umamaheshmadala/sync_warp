/**
 * Online Status Badge Component
 * Shows green pulsing dot for online users and last seen text for offline users
 * Story 9.3.7: Online Status & Badges
 */

import { formatLastSeen } from '../../utils/formatLastSeen';

interface OnlineStatusBadgeProps {
    isOnline: boolean;
    lastActive?: string | null;
    showText?: boolean;
}

export function OnlineStatusBadge({
    isOnline,
    lastActive,
    showText = true
}: OnlineStatusBadgeProps) {
    // Client-side verification: Check if last_active is stale (> 2 minutes)
    // This prevents showing users as online when they haven't been active recently
    const isActuallyOnline = isOnline && lastActive &&
        (new Date().getTime() - new Date(lastActive).getTime()) < 120000; // 2 minutes

    return (
        <div className="flex items-center gap-2">
            {isActuallyOnline ? (
                <>
                    <span className="relative flex h-3 w-3" aria-label="Online">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                    {showText && (
                        <span className="text-sm text-green-600 font-medium">Active now</span>
                    )}
                </>
            ) : (
                <>
                    <span className="relative flex h-3 w-3" aria-label="Offline">
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-gray-300"></span>
                    </span>
                    {showText && (
                        <span className="text-sm text-gray-500">
                            {formatLastSeen(lastActive)}
                        </span>
                    )}
                </>
            )}
        </div>
    );
}
