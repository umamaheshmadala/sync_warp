import React from 'react';
import { QUICK_REACTIONS } from '../../services/reactionService';
import { Plus } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Props {
  onReact: (emoji: string) => void;
  onOpenPicker?: () => void; // Optional for now
  userReactions: string[];
  className?: string; // Allow custom positioning
}

export function QuickReactionBar({ onReact, onOpenPicker, userReactions, className }: Props) {
  return (
    <div className={cn("flex items-center gap-1 p-1.5 bg-white rounded-full shadow-lg border border-gray-100 animate-in fade-in zoom-in duration-200", className)}>
      {QUICK_REACTIONS.map((emoji) => {
        const isSelected = userReactions.includes(emoji);
        return (
          <button
            key={emoji}
            onClick={(e) => {
              e.stopPropagation(); // Prevent message click
              onReact(emoji);
            }}
            className={cn(
              "text-xl p-1.5 rounded-full transition-all duration-200 hover:scale-125 hover:bg-gray-100 active:scale-95 leading-none",
              isSelected && "bg-blue-100 ring-2 ring-blue-500 ring-offset-1"
            )}
            title={isSelected ? 'Remove reaction' : 'Add reaction'}
          >
            {emoji}
          </button>
        );
      })}

      {/* More emoji button - simplified to log for now until picker is implemented */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onOpenPicker?.();
        }}
        className="text-gray-400 p-1.5 rounded-full hover:bg-gray-100 hover:text-gray-600 transition-colors"
        title="More reactions"
      >
        <Plus className="w-5 h-5" />
      </button>
    </div>
  );
}
