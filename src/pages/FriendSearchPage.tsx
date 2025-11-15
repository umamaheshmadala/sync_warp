/**
 * Friend Search Page
 * Story 9.2.1: Global Friend Search with Fuzzy Matching
 */

import React, { useState } from 'react';
import { FriendSearchBar } from '@/components/friends/FriendSearchBar';
import { FriendSearchResults } from '@/components/friends/FriendSearchResults';
import { RecentSearches } from '@/components/friends/RecentSearches';
import { useSearchFriends } from '@/hooks/useFriendSearch';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function FriendSearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  
  const { data: searchResults = [], isLoading, error } = useSearchFriends(searchQuery);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Find Friends</h1>
          </div>
          
          <FriendSearchBar
            onSearch={setSearchQuery}
            isLoading={isLoading}
            autoFocus
          />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Search Results - Main Column */}
          <div className="lg:col-span-2">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                <p className="font-semibold">Search Error</p>
                <p className="text-sm">{error.message}</p>
              </div>
            )}
            
            {searchQuery.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Start searching for friends
                </h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  Enter a name or username to find friends on SynC.
                  Our smart search will help you find people even with typos!
                </p>
              </div>
            ) : searchQuery.length < 2 ? (
              <div className="text-center py-12 bg-white rounded-lg">
                <p className="text-gray-600">
                  Keep typing... (minimum 2 characters)
                </p>
              </div>
            ) : (
              <FriendSearchResults
                results={searchResults}
                isLoading={isLoading}
              />
            )}
          </div>

          {/* Sidebar - Recent Searches */}
          <div className="lg:col-span-1">
            <RecentSearches onSearchClick={setSearchQuery} />
            
            {/* Search Tips */}
            {!searchQuery && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <h4 className="font-semibold text-blue-900 mb-2">Search Tips</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Search by full name or username</li>
                  <li>• Works with partial names</li>
                  <li>• Typo-tolerant (fuzzy matching)</li>
                  <li>• Results ranked by relevance</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
