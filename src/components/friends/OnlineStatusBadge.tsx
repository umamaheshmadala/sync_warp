/**
 * OnlineStatusBadge Component
 * Story 9.3.1: Friends List Component
 * 
 * Displays green dot for online users and last active timestamp
 */

import React from 'react';
import { formatLastSeen } from '../../utils/formatLastSeen';

interface OnlineStatusBadgeProps {
  isOnline: boolean;
  lastActive?: string | null;
  className?: string;
}

export function OnlineStatusBadge({ isOnline, lastActive, className = '' }: OnlineStatusBadgeProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {isOnline ? (
        <>
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          <span className="text-sm text-green-600 font-medium">Active now</span>
        </>
      ) : (
        <span className="text-sm text-gray-500">
          {formatLastSeen(lastActive)}
        </span>
      )}
    </div>
  );
}

// Small badge version for avatar overlay
export function OnlineStatusDot({ isOnline }: { isOnline: boolean }) {
  if (!isOnline) return null;

  return (
    <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-green-500 ring-2 ring-white" />
  );
}
