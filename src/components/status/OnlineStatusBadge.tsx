/**
 * Online Status Badge Component
 * Shows green pulsing dot for online users and last seen text for offline users
 * Story 9.3.7: Online Status & Badges (Real-time Implementation)
 */

import { formatLastSeen } from '../../utils/formatLastSeen';
import { useOnlineStatus, useCanSeeOnlineStatus } from '../../hooks/useOnlineStatus';

interface OnlineStatusBadgeProps {
    userId: string;
    lastActive?: string | null; // Added fallback from DB
    showText?: boolean;
    showDot?: boolean;
    hideOnlineText?: boolean;
    className?: string;
}

export function OnlineStatusBadge({
    userId,
    lastActive: dbLastActive,
    showText = true,
    showDot = true,
    hideOnlineText = false,
    className
}: OnlineStatusBadgeProps) {
    const { isUserOnline, getLastSeen } = useOnlineStatus();
    const { canSee, isLoading } = useCanSeeOnlineStatus(userId);

    // Real-time status lookup
    const online = isUserOnline(userId);
    // Use Realtime last seen if available, otherwise fallback to DB
    const realtimeLastSeen = getLastSeen(userId);
    const displayLastSeen = realtimeLastSeen || dbLastActive;

    // If privacy check is loading, show nothing to avoid flicker
    if (isLoading) {
        return null;
    }

    // If user's privacy settings don't allow viewing their status, hide it
    if (!canSee) {
        return null;
    }

    return (
        <div className={`flex items-center gap-2 ${className || ''}`}>
            {online ? (
                <>
                    {showDot && (
                        <span className="relative flex h-3 w-3" aria-label="Online">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                    )}
                    {showText && !hideOnlineText && (
                        <span className="text-sm text-green-600 font-medium truncate block leading-tight">Active now</span>
                    )}
                </>
            ) : (
                <>
                    {showDot && (
                        <span className="relative flex h-3 w-3" aria-label="Offline">
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-gray-300"></span>
                        </span>
                    )}
                    {showText && (
                        <span className="text-sm text-gray-500 truncate block leading-tight">
                            {formatLastSeen(displayLastSeen)}
                        </span>
                    )}
                </>
            )}
        </div>
    );
}

// Keep the OnlineStatusDot component for avatar overlays
interface OnlineStatusDotProps {
    userId: string;
}

export function OnlineStatusDot({ userId }: OnlineStatusDotProps) {
    const { isUserOnline } = useOnlineStatus();
    const { canSee, isLoading } = useCanSeeOnlineStatus(userId);
    const online = isUserOnline(userId);

    // Don't show if privacy check is loading or user can't see
    if (isLoading || !canSee || !online) return null;

    return (
        <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-green-500 ring-2 ring-white" />
    );
}

