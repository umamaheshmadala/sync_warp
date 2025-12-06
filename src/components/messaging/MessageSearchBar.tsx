// src/components/messaging/MessageSearchBar.tsx
// WhatsApp-style search bar for messages
// Story: 8.5.4 - Message Search

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, Loader2, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Props {
  onSearch: (query: string) => void;
  onClose: () => void;
  onNavigate?: (direction: 'up' | 'down') => void;
  isLoading?: boolean;
  resultCount?: number;
  currentIndex?: number;
  placeholder?: string;
}

/**
 * WhatsApp-style message search bar
 * 
 * Features:
 * - Auto-focus on mount
 * - Debounced search (300ms)
 * - Loading indicator
 * - Clear button
 * - ESC to close
 * - Up/Down navigation for results
 * - Result count display
 */
export function MessageSearchBar({
  onSearch,
  onClose,
  onNavigate,
  isLoading = false,
  resultCount = 0,
  currentIndex = 0,
  placeholder = 'Search messages...'
}: Props) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      onSearch(query);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, onSearch]);

  // Keyboard handlers
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      onNavigate?.('down');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      onNavigate?.('up');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      onNavigate?.('down');
    }
  }, [onClose, onNavigate]);

  const handleClear = () => {
    setQuery('');
    inputRef.current?.focus();
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-white border-b shadow-sm">
      {/* Search input */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            'w-full pl-10 pr-10 py-2',
            'bg-gray-100 border-none rounded-full',
            'text-sm placeholder:text-gray-400',
            'focus:outline-none focus:ring-2 focus:ring-blue-500/50'
          )}
        />
        
        {/* Loading or clear button */}
        {isLoading ? (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 animate-spin" />
        ) : query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-gray-200"
          >
            <X className="w-3.5 h-3.5 text-gray-400" />
          </button>
        )}
      </div>

      {/* Result count and navigation */}
      {query && resultCount > 0 && (
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <span>{currentIndex + 1}/{resultCount}</span>
          <button
            onClick={() => onNavigate?.('up')}
            className="p-1 hover:bg-gray-100 rounded"
            title="Previous result"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            onClick={() => onNavigate?.('down')}
            className="p-1 hover:bg-gray-100 rounded"
            title="Next result"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* No results indicator */}
      {query && !isLoading && resultCount === 0 && (
        <span className="text-xs text-gray-400">No results</span>
      )}

      {/* Close button */}
      <button
        onClick={onClose}
        className="px-2 py-1 text-sm text-gray-500 hover:text-gray-700"
      >
        Cancel
      </button>
    </div>
  );
}
