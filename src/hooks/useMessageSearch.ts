// src/hooks/useMessageSearch.ts
// Hook for message search with state management
// Story: 8.5.4 - Message Search

import { useState, useCallback } from 'react';
import { messageSearchService, SearchResult } from '../services/messageSearchService';

/**
 * Hook for message search functionality
 * 
 * Features:
 * - Search within conversation or globally
 * - Loading state management
 * - Error handling
 * - Result navigation (prev/next)
 * - Clear search
 */
export function useMessageSearch(conversationId?: string) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  /**
   * Perform search
   */
  const search = useCallback(async (searchQuery: string) => {
    setQuery(searchQuery);

    if (!searchQuery.trim()) {
      setResults([]);
      setSelectedIndex(-1);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const searchResults = conversationId
        ? await messageSearchService.searchInConversation(conversationId, searchQuery)
        : await messageSearchService.searchAllConversations(searchQuery);

      setResults(searchResults);
      setSelectedIndex(searchResults.length > 0 ? 0 : -1);
    } catch (err) {
      console.error('Search failed:', err);
      setError('Search failed. Please try again.');
      setResults([]);
      setSelectedIndex(-1);
    } finally {
      setIsSearching(false);
    }
  }, [conversationId]);

  /**
   * Navigate to previous/next result
   */
  const navigate = useCallback((direction: 'up' | 'down') => {
    if (results.length === 0) return;

    setSelectedIndex(prev => {
      if (direction === 'up') {
        return prev <= 0 ? results.length - 1 : prev - 1;
      } else {
        return prev >= results.length - 1 ? 0 : prev + 1;
      }
    });
  }, [results.length]);

  /**
   * Clear search and reset state
   */
  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setError(null);
    setSelectedIndex(-1);
  }, []);

  /**
   * Get currently selected result
   */
  const selectedResult = selectedIndex >= 0 ? results[selectedIndex] : null;

  return {
    query,
    results,
    isSearching,
    error,
    selectedIndex,
    selectedResult,
    search,
    navigate,
    clearSearch,
    setSelectedIndex
  };
}
