// src/components/messaging/MessageSearchResults.tsx
// Search results list with highlighted content
// Story: 8.5.4 - Message Search

import React from 'react';
import { MessageSquare, ArrowRight } from 'lucide-react';
import type { SearchResult } from '../../services/messageSearchService';
import { cn } from '../../lib/utils';

interface Props {
  results: SearchResult[];
  onResultClick: (result: SearchResult) => void;
  showConversationName?: boolean;
  selectedIndex?: number;
}

/**
 * Search results list component
 * 
 * Features:
 * - Avatar and sender name
 * - Highlighted matching text
 * - Relative timestamp
 * - Conversation name (for global search)
 * - Keyboard-navigable selection
 */
export function MessageSearchResults({
  results,
  onResultClick,
  showConversationName = false,
  selectedIndex = -1
}: Props) {
  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <MessageSquare className="w-12 h-12 mb-3 opacity-50" />
        <p className="font-medium">No messages found</p>
        <p className="text-sm mt-1">Try different keywords</p>
      </div>
    );
  }

  const formatTime = (isoDate: string) => {
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto bg-white">
      {results.map((result, index) => (
        <button
          key={result.id}
          onClick={() => onResultClick(result)}
          className={cn(
            'w-full px-4 py-3 text-left flex items-start gap-3 transition-colors',
            index === selectedIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
          )}
        >
          {/* Avatar */}
          <img
            src={result.senderAvatar || '/default-avatar.png'}
            alt={result.senderName || 'User'}
            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/default-avatar.png';
            }}
          />

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header: name + time */}
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <span className="font-medium text-gray-900 truncate text-sm">
                {result.senderName || 'Unknown'}
              </span>
              <span className="text-xs text-gray-400 flex-shrink-0">
                {formatTime(result.createdAt)}
              </span>
            </div>

            {/* Highlighted content */}
            <p
              className="text-sm text-gray-600 line-clamp-2"
              dangerouslySetInnerHTML={{ __html: result.highlightedContent }}
            />

            {/* Conversation name for global search */}
            {showConversationName && (
              <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                <MessageSquare className="w-3 h-3" />
                <span className="truncate">In conversation</span>
              </div>
            )}
          </div>

          {/* Arrow */}
          <ArrowRight className="w-4 h-4 text-gray-300 mt-3 flex-shrink-0" />
        </button>
      ))}
    </div>
  );
}
