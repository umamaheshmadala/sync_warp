import React from 'react';
import type { Reaction } from '../../services/reactionService';
import { hapticService } from '../../services/hapticService';
import { cn } from '../../lib/utils';

interface Props {
  reactions: Reaction[];
  currentUserId: string;
  onReactionClick: (emoji: string) => void;
  onViewUsers: (emoji: string, event: React.MouseEvent) => void;
  isOwnMessage: boolean;
}

export function MessageReactions({
  reactions,
  currentUserId,
  onReactionClick,
  onViewUsers,
  isOwnMessage
}: Props) {
  if (reactions.length === 0) return null;

  return (
    <div className={cn(
      "flex flex-wrap gap-1 mt-1 mb-0.5",
      isOwnMessage ? "justify-end" : "justify-start"
    )}>
      {reactions.map(({ emoji, userIds, count }) => {
        const hasReacted = userIds.includes(currentUserId);

        return (
          <button
            key={emoji}
            onClick={(e) => {
              e.stopPropagation();
              // WhatsApp behavior: Click -> View Users
              hapticService.trigger('light');
              onViewUsers(emoji, e);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              onViewUsers(emoji, e);
            }}
            className={cn(
              "inline-flex items-center justify-center min-w-[28px] h-7 px-1.5 rounded-full text-base transition-all duration-200 border shadow-sm",
              hasReacted
                ? "bg-blue-100 border-blue-200 text-blue-700"
                : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
            )}
            title={`${count} ${count === 1 ? 'reaction' : 'reactions'} (Right click to view users)`}
          >
            <span className="leading-none text-lg">{emoji}</span>
            {count > 1 && <span className="text-xs font-medium ml-1 text-gray-700">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
