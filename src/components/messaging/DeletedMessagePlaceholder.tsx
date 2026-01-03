// src/components/messaging/DeletedMessagePlaceholder.tsx
// Placeholder for deleted messages with contextual text
// Story: 8.5.3 - Delete Messages Implementation

import React from 'react';
import { Ban } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Props {
  isOwnMessage: boolean;
  deletedAt?: string;
  className?: string;
}

/**
 * Placeholder displayed in place of deleted messages
 * 
 * Shows contextual text based on who deleted:
 * - Own message: "You deleted this message"
 * - Others: "This message was deleted"
 */
export function DeletedMessagePlaceholder({
  isOwnMessage,
  deletedAt,
  className
}: Props) {
  const message = isOwnMessage 
    ? 'You deleted this message' 
    : 'This message was deleted';

  const formatTime = (isoDate: string) => {
    return new Date(isoDate).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg',
        'bg-gray-100 text-gray-500',
        'italic text-sm',
        className
      )}
      role="status"
      aria-label={message}
    >
      <Ban className="w-4 h-4 text-gray-400 flex-shrink-0" />
      <span>{message}</span>
      {deletedAt && (
        <span className="text-xs text-gray-400 ml-auto">
          {formatTime(deletedAt)}
        </span>
      )}
    </div>
  );
}
