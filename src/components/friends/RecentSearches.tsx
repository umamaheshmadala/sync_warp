/**
 * Recent Searches Component
 * Story 9.2.1: Global Friend Search
 */

import React from 'react';
import { Clock, X } from 'lucide-react';
import { useFriendSearchHistory, useClearFriendSearchHistory } from '@/hooks/useFriendSearch';

interface RecentSearchesProps {
  onSearchClick: (query: string) => void;
}

export function RecentSearches({ onSearchClick }: RecentSearchesProps) {
  const { data: history, isLoading } = useFriendSearchHistory();
  const clearHistory = useClearFriendSearchHistory();

  if (isLoading || !history || history.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center">
          <Clock className="w-4 h-4 mr-2" />
          Recent Searches
        </h3>
        <button
          onClick={() => clearHistory.mutate()}
          disabled={clearHistory.isPending}
          className="text-xs text-gray-600 hover:text-gray-900 disabled:opacity-50"
        >
          Clear All
        </button>
      </div>
      <div className="space-y-1">
        {history.map((item, index) => (
          <button
            key={index}
            onClick={() => onSearchClick(item.query)}
            className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 transition-colors text-sm text-gray-700 flex items-center justify-between group"
          >
            <span className="truncate">{item.query}</span>
            <X className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ))}
      </div>
    </div>
  );
}
