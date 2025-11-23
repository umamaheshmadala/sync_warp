/**
 * Online Status Badge Component
 * Shows green pulsing dot for online users and last seen text for offline users
 * Story 9.3.7: Online Status & Badges (Real-time Implementation)
 */

import { formatLastSeen } from '../../utils/formatLastSeen';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

interface OnlineStatusBadgeProps {
    userId: string; // Changed from isOnline/lastActive to userId for real-time lookup
    showText?: boolean;
}

export function OnlineStatusBadge({
    userId,
    showText = true
}: OnlineStatusBadgeProps) {
    const { isUserOnline, getLastSeen } = useOnlineStatus();

    // Real-time status lookup
    const online = isUserOnline(userId);
    const lastSeen = getLastSeen(userId);

    return (
        <div className="flex items-center gap-2">
            {online ? (
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
                            {formatLastSeen(lastSeen)}
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
    const online = isUserOnline(userId);

    if (!online) return null;

    return (
        <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-green-500 ring-2 ring-white" />
    );
}
