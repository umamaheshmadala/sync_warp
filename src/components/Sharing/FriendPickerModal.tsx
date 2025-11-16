/**
 * Friend Picker Modal - Deal Sharing Integration
 * Story 9.2.6: Deal Sharing Integration
 * 
 * Allows users to select friends to share deals with
 * Features:
 * - Search for friends (integrates with Story 9.2.1)
 * - PYMK suggestions (integrates with Story 9.2.2)
 * - Recently shared with section
 * - Multi-select with checkboxes
 */

import React, { useState, useEffect } from 'react';
import { X, Search, Check, Users, Clock } from 'lucide-react';
import { useOptimizedSearch } from '../../hooks/useOptimizedSearch';

interface FriendPickerModalProps {
  dealId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (friendIds: string[]) => void;
}

interface Friend {
  userId: string;
  fullName: string;
  username: string;
  avatarUrl?: string;
  subtitle?: string;
}

export function FriendPickerModal({
  dealId,
  isOpen,
  onClose,
  onSuccess,
}: FriendPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [isSharing, setIsSharing] = useState(false);
  const [recentlySharedWith, setRecentlySharedWith] = useState<string[]>([]);

  // Use optimized search hook (from Story 9.2.5)
  const { data: searchData, isLoading: isSearching } = useOptimizedSearch(searchQuery);

  // Load recently shared with from localStorage
  useEffect(() => {
    try {
      const recent = localStorage.getItem('recently_shared_with');
      if (recent) {
        setRecentlySharedWith(JSON.parse(recent).slice(0, 5));
      }
    } catch (error) {
      console.error('Failed to load recently shared with:', error);
    }
  }, []);

  // Transform search results to Friend format
  const searchResults: Friend[] = searchData?.results.map(result => ({
    userId: result.user_id,
    fullName: result.full_name,
    username: result.username,
    avatarUrl: result.avatar_url || undefined,
    subtitle: result.location || undefined,
  })) || [];

  const handleToggleFriend = (userId: string) => {
    setSelectedFriends((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleShare = async () => {
    if (selectedFriends.length === 0) return;

    setIsSharing(true);
    try {
      // Import dynamically to avoid circular dependencies
      const { shareDealWithFriends } = await import('../../services/dealService');
      await shareDealWithFriends(dealId, selectedFriends);

      // Update recently shared with
      const updated = [
        ...selectedFriends,
        ...recentlySharedWith.filter((id: string) => !selectedFriends.includes(id)),
      ].slice(0, 5);
      localStorage.setItem('recently_shared_with', JSON.stringify(updated));
      setRecentlySharedWith(updated);

      onSuccess?.(selectedFriends);
      onClose();
      
      // Reset state
      setSelectedFriends([]);
      setSearchQuery('');
    } catch (error) {
      console.error('Failed to share deal:', error);
      alert('Failed to share deal. Please try again.');
    } finally {
      setIsSharing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white w-full md:max-w-lg md:rounded-lg rounded-t-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Share Deal</h2>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-100 rounded-full transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search friends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Selected Friends Count */}
          {selectedFriends.length > 0 && (
            <div className="p-4 bg-blue-50 border-b">
              <p className="text-sm font-medium text-gray-700">
                {selectedFriends.length} friend{selectedFriends.length > 1 ? 's' : ''} selected
              </p>
            </div>
          )}

          {/* PYMK Suggestions - TODO: Integrate with Story 9.2.2 */}
          {!searchQuery && (
            <div className="p-4 border-b">
              <h3 className="flex items-center text-sm font-semibold text-gray-900 mb-3">
                <Users className="w-4 h-4 mr-2" />
                Suggested Friends
              </h3>
              <div className="text-center py-4 text-gray-500 text-sm">
                PYMK suggestions will appear here (Story 9.2.2 integration pending)
              </div>
            </div>
          )}

          {/* Recently Shared With */}
          {!searchQuery && recentlySharedWith.length > 0 && (
            <div className="p-4 border-b">
              <h3 className="flex items-center text-sm font-semibold text-gray-900 mb-3">
                <Clock className="w-4 h-4 mr-2" />
                Recently Shared With
              </h3>
              <div className="space-y-2">
                {recentlySharedWith.map((userId) => (
                  <FriendRowSkeleton 
                    key={userId} 
                    userId={userId}
                    isSelected={selectedFriends.includes(userId)}
                    onToggle={() => handleToggleFriend(userId)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Search Results or All Friends */}
          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              {searchQuery ? 'Search Results' : 'All Friends'}
            </h3>
            {isSearching ? (
              <div className="text-center py-8 text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                <p className="mt-2">Searching...</p>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-2">
                {searchResults.map((result) => (
                  <FriendRow
                    key={result.userId}
                    userId={result.userId}
                    name={result.fullName}
                    username={result.username}
                    avatarUrl={result.avatarUrl}
                    subtitle={result.subtitle}
                    isSelected={selectedFriends.includes(result.userId)}
                    onToggle={() => handleToggleFriend(result.userId)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                {searchQuery ? (
                  <>
                    <p>No friends found matching "{searchQuery}"</p>
                    <p className="text-sm mt-1">Try a different search term</p>
                  </>
                ) : (
                  <p>No friends yet. Add friends to share deals!</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-white">
          <button
            onClick={handleShare}
            disabled={selectedFriends.length === 0 || isSharing}
            className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
          >
            {isSharing
              ? 'Sharing...'
              : selectedFriends.length === 0
              ? 'Select friends to share'
              : `Share with ${selectedFriends.length} friend${selectedFriends.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Friend Row Component
 * Displays a single friend with checkbox for selection
 */
interface FriendRowProps {
  userId: string;
  name: string;
  username: string;
  avatarUrl?: string;
  subtitle?: string;
  isSelected: boolean;
  onToggle: () => void;
}

function FriendRow({
  name,
  username,
  avatarUrl,
  subtitle,
  isSelected,
  onToggle,
}: FriendRowProps) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition"
    >
      {/* Avatar */}
      <img
        src={avatarUrl || '/default-avatar.png'}
        alt={name}
        className="w-12 h-12 rounded-full object-cover bg-gray-200"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.src = '/default-avatar.png';
        }}
      />

      {/* Info */}
      <div className="flex-1 text-left">
        <p className="font-medium text-gray-900">{name}</p>
        <p className="text-sm text-gray-500">
          @{username}
          {subtitle && ` · ${subtitle}`}
        </p>
      </div>

      {/* Checkbox */}
      <div
        className={`w-6 h-6 rounded border-2 flex items-center justify-center transition ${
          isSelected
            ? 'bg-primary-600 border-primary-600'
            : 'border-gray-300'
        }`}
      >
        {isSelected && <Check className="w-4 h-4 text-white" />}
      </div>
    </button>
  );
}

/**
 * Skeleton for recently shared with
 * Shows placeholder while user data loads
 */
interface FriendRowSkeletonProps {
  userId: string;
  isSelected: boolean;
  onToggle: () => void;
}

function FriendRowSkeleton({ userId, isSelected, onToggle }: FriendRowSkeletonProps) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition"
    >
      <div className="w-12 h-12 rounded-full bg-gray-200 animate-pulse" />
      <div className="flex-1 text-left">
        <div className="h-4 bg-gray-200 rounded w-32 mb-2 animate-pulse" />
        <div className="h-3 bg-gray-200 rounded w-24 animate-pulse" />
      </div>
      <div
        className={`w-6 h-6 rounded border-2 flex items-center justify-center transition ${
          isSelected
            ? 'bg-primary-600 border-primary-600'
            : 'border-gray-300'
        }`}
      >
        {isSelected && <Check className="w-4 h-4 text-white" />}
      </div>
    </button>
  );
}
