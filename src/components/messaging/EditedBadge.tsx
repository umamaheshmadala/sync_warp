// src/components/messaging/EditedBadge.tsx
// "Edited" indicator badge with optional history tooltip
// Story: 8.5.2 - Edit Messages Implementation

import React, { useState } from 'react';
import { Pencil, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { EditHistoryEntry } from '../../services/messageEditService';

interface Props {
  editedAt: string;
  history?: EditHistoryEntry[];
  onLoadHistory?: () => Promise<EditHistoryEntry[]>;
  isOwnMessage?: boolean;
  className?: string;
}

/**
 * Edited badge that shows when a message was edited
 * For sender's own messages, can show edit history on click
 */
export function EditedBadge({
  editedAt,
  history: initialHistory,
  onLoadHistory,
  isOwnMessage = false,
  className
}: Props) {
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<EditHistoryEntry[]>(initialHistory || []);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const formatTime = (isoDate: string) => {
    return new Date(isoDate).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFullDate = (isoDate: string) => {
    return new Date(isoDate).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleClick = async () => {
    if (!isOwnMessage) return;

    if (!showHistory && onLoadHistory && history.length === 0) {
      setIsLoadingHistory(true);
      try {
        const loadedHistory = await onLoadHistory();
        setHistory(loadedHistory);
      } catch (error) {
        console.error('Failed to load edit history:', error);
      } finally {
        setIsLoadingHistory(false);
      }
    }
    setShowHistory(!showHistory);
  };

  // Simple badge for non-owner or no history feature
  if (!isOwnMessage || !onLoadHistory) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-0.5 text-[10px] italic',
          'text-gray-400',
          className
        )}
        title={`Edited at ${formatTime(editedAt)}`}
      >
        <Pencil className="w-2 h-2" />
        edited
      </span>
    );
  }

  // Interactive badge for owner with history
  return (
    <div className="relative inline-block">
      <button
        onClick={handleClick}
        className={cn(
          'inline-flex items-center gap-0.5 text-[10px] italic',
          'text-blue-200 hover:text-blue-100 transition-colors',
          'cursor-pointer',
          className
        )}
        title="Click to view edit history"
        aria-expanded={showHistory}
      >
        <Pencil className="w-2 h-2" />
        edited
        {showHistory ? (
          <ChevronUp className="w-2 h-2" />
        ) : (
          <ChevronDown className="w-2 h-2" />
        )}
      </button>

      {/* History tooltip */}
      {showHistory && (
        <div
          className={cn(
            'absolute bottom-full mb-2 right-0 z-50',
            'bg-gray-900 text-white rounded-lg shadow-xl',
            'min-w-[200px] max-w-[300px] p-3'
          )}
          role="tooltip"
        >
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-700">
            <Pencil className="w-4 h-4 text-blue-400" />
            <span className="font-medium text-sm">Edit History</span>
          </div>

          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-2">
              <Clock className="w-4 h-4 animate-spin text-gray-400" />
            </div>
          ) : history.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-1">
              No edit history available
            </p>
          ) : (
            <div className="space-y-3 max-h-[200px] overflow-y-auto">
              {history.map((entry, index) => (
                <div key={entry.id} className="text-xs">
                  <div className="flex items-center gap-1 text-gray-400 mb-1">
                    <Clock className="w-3 h-3" />
                    <span>{formatFullDate(entry.editedAt)}</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-red-400/60 line-through truncate">
                        {entry.oldContent}
                      </div>
                      <div className="text-green-400 truncate">
                        {entry.newContent}
                      </div>
                    </div>
                  </div>
                  
                  {index < history.length - 1 && (
                    <hr className="border-gray-700 mt-2" />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Arrow */}
          <div
            className={cn(
              'absolute -bottom-1 right-3',
              'w-2 h-2 bg-gray-900 rotate-45'
            )}
          />
        </div>
      )}
    </div>
  );
}
