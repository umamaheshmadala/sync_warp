// SearchSuggestions.tsx
// Autocomplete and search suggestions component
// Shows popular terms, recent searches, and search suggestions

import React, { useState, useEffect, useRef } from 'react';
import { Search, Clock, TrendingUp, MapPin, Tag, Users } from 'lucide-react';
import { SearchSuggestion } from '../../services/searchService';
import { usePopularSearchTerms } from '../../hooks/useSearch';

interface SearchSuggestionsProps {
  searchTerm: string;
  suggestions: SearchSuggestion[];
  isLoading: boolean;
  isVisible: boolean;
  onSuggestionSelect: (suggestion: string) => void;
  onClose: () => void;
  popularTerms?: string[];
  recentSearches?: string[];
}

export const SearchSuggestions: React.FC<SearchSuggestionsProps> = ({
  searchTerm,
  suggestions,
  isLoading,
  isVisible,
  onSuggestionSelect,
  onClose,
  recentSearches = []
}) => {
  const { terms: popularTerms, loading: popularLoading } = usePopularSearchTerms();
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isVisible) return;

      const totalItems = suggestions.length + popularTerms.length + recentSearches.length;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % totalItems);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => prev <= 0 ? totalItems - 1 : prev - 1);
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0) {
            const allItems = [...suggestions.map(s => s.text), ...popularTerms, ...recentSearches];
            onSuggestionSelect(allItems[selectedIndex]);
          }
          break;
        case 'Escape':
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, selectedIndex, suggestions, popularTerms, recentSearches, onSuggestionSelect, onClose]);

  // Reset selection when suggestions change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [suggestions]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (!isVisible) return null;

  const hasSuggestions = suggestions.length > 0;
  const hasPopularTerms = popularTerms.length > 0;
  const hasRecentSearches = recentSearches.length > 0;
  const hasContent = hasSuggestions || hasPopularTerms || hasRecentSearches;

  if (isLoading) {
    return (
      <div
        ref={containerRef}
        className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-2"
      >
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
          <span className="ml-2 text-sm text-gray-600">Searching...</span>
        </div>
      </div>
    );
  }

  if (!hasContent && searchTerm.trim()) {
    return (
      <div
        ref={containerRef}
        className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-2"
      >
        <div className="px-4 py-3 text-sm text-gray-500 text-center">
          No suggestions found
        </div>
      </div>
    );
  }

  if (!hasContent && !searchTerm.trim()) {
    return null;
  }

  let currentIndex = 0;

  return (
    <div
      ref={containerRef}
      className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto"
    >
      {/* Search Suggestions */}
      {hasSuggestions && (
        <div className="py-2">
          <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-100">
            Suggestions
          </div>
          {suggestions.map((suggestion, index) => {
            const isSelected = currentIndex === selectedIndex;
            currentIndex++;
            
            return (
              <button
                key={`suggestion-${index}`}
                onClick={() => onSuggestionSelect(suggestion.text)}
                className={`w-full flex items-center px-4 py-2 text-left hover:bg-gray-50 transition-colors ${
                  isSelected ? 'bg-indigo-50 text-indigo-700' : 'text-gray-900'
                }`}
              >
                <div className="flex items-center flex-1 min-w-0">
                  {suggestion.type === 'coupon' && <Tag className="w-4 h-4 mr-3 text-indigo-500 flex-shrink-0" />}
                  {suggestion.type === 'business' && <MapPin className="w-4 h-4 mr-3 text-green-500 flex-shrink-0" />}
                  {suggestion.type === 'category' && <Search className="w-4 h-4 mr-3 text-blue-500 flex-shrink-0" />}
                  {suggestion.type === 'location' && <MapPin className="w-4 h-4 mr-3 text-red-500 flex-shrink-0" />}
                  
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{suggestion.text}</div>
                    <div className="text-xs text-gray-500 capitalize">{suggestion.type}</div>
                  </div>
                  
                  {suggestion.count > 1 && (
                    <div className="text-xs text-gray-400 ml-2">
                      {suggestion.count}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Recent Searches */}
      {hasRecentSearches && (
        <div className="py-2 border-t border-gray-100">
          <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
            Recent Searches
          </div>
          {recentSearches.slice(0, 3).map((term, index) => {
            const isSelected = currentIndex === selectedIndex;
            currentIndex++;
            
            return (
              <button
                key={`recent-${index}`}
                onClick={() => onSuggestionSelect(term)}
                className={`w-full flex items-center px-4 py-2 text-left hover:bg-gray-50 transition-colors ${
                  isSelected ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600'
                }`}
              >
                <Clock className="w-4 h-4 mr-3 text-gray-400 flex-shrink-0" />
                <span className="text-sm truncate">{term}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Popular Terms */}
      {hasPopularTerms && !searchTerm.trim() && (
        <div className="py-2 border-t border-gray-100">
          <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
            Popular Searches
          </div>
          {popularTerms.slice(0, 5).map((term, index) => {
            const isSelected = currentIndex === selectedIndex;
            currentIndex++;
            
            return (
              <button
                key={`popular-${index}`}
                onClick={() => onSuggestionSelect(term)}
                className={`w-full flex items-center px-4 py-2 text-left hover:bg-gray-50 transition-colors ${
                  isSelected ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600'
                }`}
              >
                <TrendingUp className="w-4 h-4 mr-3 text-orange-400 flex-shrink-0" />
                <span className="text-sm truncate">{term}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Quick Actions */}
      {searchTerm.trim() && (
        <div className="py-2 border-t border-gray-100">
          <button
            onClick={() => onSuggestionSelect(searchTerm)}
            className="w-full flex items-center px-4 py-3 text-left hover:bg-gray-50 transition-colors text-indigo-600"
          >
            <Search className="w-4 h-4 mr-3 flex-shrink-0" />
            <div>
              <div className="text-sm font-medium">Search for "{searchTerm}"</div>
              <div className="text-xs text-gray-500">Press Enter to search</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};

export default SearchSuggestions;