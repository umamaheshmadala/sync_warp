/**
 * Friend Picker Modal - Deal Sharing Integration
 * Story 9.2.6: Deal Sharing Integration
 * Story 9.7.1: Enhanced with share method and custom message
 * 
 * Allows users to select friends to share deals with
 * Features:
 * - Search for friends (integrates with Story 9.2.1)
 * - Recently shared with section (derived from local storage + friends list)
 * - Multi-select with checkboxes
 * - Share method selection (message vs notification)
 * - Optional custom message
 */

import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, Check, Clock, MessageSquare, Bell, Plus } from 'lucide-react';
import { useOptimizedSearch } from '../../hooks/useOptimizedSearch';
import { useFriends } from '../../hooks/friends/useFriends';

interface FriendPickerModalProps {
  dealId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (friendIds: string[]) => void;
  variant?: 'modal' | 'embedded';
  onCopyLink?: () => void;
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
  variant = 'modal',
  onCopyLink,
}: FriendPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [isSharing, setIsSharing] = useState(false);
  const [recentlySharedWithIds, setRecentlySharedWithIds] = useState<string[]>([]);
  const [shareMethod, setShareMethod] = useState<'message' | 'notification'>('notification');
  const [customMessage, setCustomMessage] = useState('');
  const [showMessageInput, setShowMessageInput] = useState(false);

  // Use optimized search hook (from Story 9.2.5)
  const { data: searchData, isLoading: isSearching } = useOptimizedSearch(searchQuery);

  // Use friends hook to get all friends
  const { data: friendsResponse, isLoading: loadingAllFriends } = useFriends();

  // Load recently shared IDs from localStorage
  useEffect(() => {
    try {
      const recent = localStorage.getItem('recently_shared_with');
      if (recent) {
        const parsed = JSON.parse(recent);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRecentlySharedWithIds(parsed.slice(0, 5));
        }
      }
    } catch (error) {
      console.error('Failed to load recently shared with:', error);
    }
  }, []);

  // Transform search results to Friend format
  const searchResults: Friend[] = useMemo(() => searchData?.results.map(result => ({
    userId: result.user_id,
    fullName: result.full_name,
    username: result.username,
    avatarUrl: result.avatar_url || undefined,
    subtitle: result.location || undefined,
  })) || [], [searchData]);

  // Transform all friends data to Friend format
  const allFriends: Friend[] = useMemo(() => friendsResponse?.success && Array.isArray(friendsResponse.data)
    ? friendsResponse.data.map((profile: any) => ({
      userId: profile.id,
      fullName: profile.full_name,
      username: profile.username,
      avatarUrl: profile.avatar_url || undefined,
      subtitle: undefined,
    }))
    : [], [friendsResponse]);

  // Derive recently shared users from allFriends list
  // This avoids a separate network call and ensures we only show current friends
  const recentlySharedUsers: Friend[] = useMemo(() => {
    if (recentlySharedWithIds.length === 0 || allFriends.length === 0) return [];

    const users: Friend[] = [];
    // Maintain order of recentlySharedWithIds
    for (const id of recentlySharedWithIds) {
      const friend = allFriends.find(f => f.userId === id);
      if (friend) {
        users.push(friend);
      }
    }
    return users;
  }, [recentlySharedWithIds, allFriends]);

  // Display friends based on search query
  const displayFriends = searchQuery ? searchResults : allFriends;
  const isLoadingFriends = searchQuery ? isSearching : loadingAllFriends;

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
      await shareDealWithFriends(dealId, selectedFriends, {
        shareMethod,
        message: customMessage || undefined,
      });

      // Update recently shared with - Add new friends to the beginning
      const updated = [
        ...selectedFriends,
        ...recentlySharedWithIds.filter((id: string) => !selectedFriends.includes(id)),
      ].slice(0, 5);

      localStorage.setItem('recently_shared_with', JSON.stringify(updated));
      setRecentlySharedWithIds(updated);

      onSuccess?.(selectedFriends);

      // Show success message
      const friendCount = selectedFriends.length;
      alert(`✅ Successfully shared deal with ${friendCount} friend${friendCount > 1 ? 's' : ''}!`);

      onClose();

      // Reset state
      setSelectedFriends([]);
      setSearchQuery('');
      setCustomMessage('');
      setShowMessageInput(false);
      setShareMethod('notification');
    } catch (error) {
      console.error('Failed to share deal:', error);
      alert('❌ Failed to share deal. Please try again.');
    } finally {
      setIsSharing(false);
    }
  };

  if (!isOpen) return null;

  const content = (
    <div className={`w-full flex flex-col ${variant === 'modal' ? 'bg-white md:max-w-lg md:rounded-lg rounded-t-2xl max-h-[90vh] overflow-hidden' : 'h-full bg-transparent'}`}>
      {/* Header - Only show in modal variant */}
      {variant === 'modal' && (
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
      )}

      {/* Search Bar */}
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search friends..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-[200px]">
        {/* Selected Friends Count */}
        {selectedFriends.length > 0 && (
          <div className="p-4 bg-blue-50 border-b">
            <p className="text-sm font-medium text-gray-700">
              {selectedFriends.length} friend{selectedFriends.length > 1 ? 's' : ''} selected
            </p>
          </div>
        )}

        {/* Recently Shared With */}
        {/* Show if: No search query AND (loading friends OR we have recent users) */}
        {!searchQuery && (loadingAllFriends || recentlySharedUsers.length > 0) && (
          <div className="p-4 border-b">
            <h3 className="flex items-center text-sm font-semibold text-gray-900 mb-3">
              <Clock className="w-4 h-4 mr-2" />
              Recently Shared With
            </h3>
            {loadingAllFriends ? (
              <div className="flex gap-4 overflow-hidden">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex flex-col items-center gap-2 w-20">
                    <div className="w-14 h-14 rounded-full bg-gray-200 animate-pulse" />
                    <div className="h-3 bg-gray-200 rounded w-12 animate-pulse" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex overflow-x-auto gap-4 pb-2 scrollbar-hide">
                {recentlySharedUsers.map((user) => (
                  <CompactFriendItem
                    key={user.userId}
                    userId={user.userId}
                    name={user.fullName}
                    avatarUrl={user.avatarUrl}
                    isSelected={selectedFriends.includes(user.userId)}
                    onToggle={() => handleToggleFriend(user.userId)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Search Results (Vertical List) or All Friends (Horizontal Grid) */}
        <div className="p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            {searchQuery ? 'Search Results' : 'All Friends'}
          </h3>

          {isLoadingFriends ? (
            <div className="text-center py-8 text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2">Loading...</p>
            </div>
          ) : displayFriends.length > 0 ? (
            searchQuery ? (
              // Vertical list for search results
              <div className="space-y-2">
                {displayFriends.map((friend) => (
                  <FriendRow
                    key={friend.userId}
                    userId={friend.userId}
                    name={friend.fullName}
                    username={friend.username}
                    avatarUrl={friend.avatarUrl}
                    subtitle={friend.subtitle}
                    isSelected={selectedFriends.includes(friend.userId)}
                    onToggle={() => handleToggleFriend(friend.userId)}
                  />
                ))}
              </div>
            ) : (
              // Horizontal scroll for All Friends
              <div className="grid grid-cols-4 gap-4 sm:grid-cols-5">
                {displayFriends.map((friend) => (
                  <CompactFriendItem
                    key={friend.userId}
                    userId={friend.userId}
                    name={friend.fullName}
                    avatarUrl={friend.avatarUrl}
                    isSelected={selectedFriends.includes(friend.userId)}
                    onToggle={() => handleToggleFriend(friend.userId)}
                  />
                ))}
              </div>
            )
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


      {/* Custom Message and Share Method */}
      <div className="p-4 border-t space-y-3">
        {/* Collapsible Custom Message */}
        {!showMessageInput ? (
          <button
            onClick={() => setShowMessageInput(true)}
            className="flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add a message (optional)
          </button>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Add a message
              </label>
              <button
                onClick={() => {
                  setShowMessageInput(false);
                  setCustomMessage('');
                }}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Say something about this deal..."
              rows={3}
              maxLength={500}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              {customMessage.length}/500 characters
            </p>
          </div>
        )}

        {/* Icon-based Share Method */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Share as:</label>
          <div className="flex gap-2">
            <button
              onClick={() => setShareMethod('notification')}
              className={`p-3 rounded-lg transition ${shareMethod === 'notification'
                ? 'bg-blue-100 text-blue-600'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              title="Notification (recommended)"
            >
              <Bell className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShareMethod('message')}
              className="p-3 rounded-lg bg-gray-100 text-gray-400 opacity-50 cursor-not-allowed"
              disabled
              title="Message (coming soon)"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
            {/* Copy Link Button */}
            {onCopyLink && (
              <button
                onClick={onCopyLink}
                className="p-3 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition"
                title="Copy Link"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-link"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t bg-white">
        <button
          onClick={handleShare}
          disabled={selectedFriends.length === 0 || isSharing}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
        >
          {isSharing
            ? 'Sharing...'
            : selectedFriends.length === 0
              ? 'Select friends to share'
              : `Share with ${selectedFriends.length} friend${selectedFriends.length !== 1 ? 's' : ''}`}
        </button>
      </div>
    </div>
  );

  if (variant === 'modal') {
    return (
      <div
        className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {content}
      </div>
    );
  }

  return content;
}

/**
 * Helper to get initials from name
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/**
 * Compact Friend Item Component
 * Displays avatar and name with selection tick
 */
interface CompactFriendItemProps {
  userId: string;
  name: string;
  avatarUrl?: string;
  isSelected: boolean;
  onToggle: () => void;
}

function CompactFriendItem({
  name,
  avatarUrl,
  isSelected,
  onToggle,
}: CompactFriendItemProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <button
      onClick={onToggle}
      className="flex flex-col items-center gap-2 w-20 group"
      title={name}
    >
      <div className="relative">
        {avatarUrl && !imageError ? (
          <img
            src={avatarUrl}
            alt={name}
            className={`w-14 h-14 rounded-full object-cover transition ${isSelected ? 'ring-2 ring-blue-600 ring-offset-2' : 'group-hover:ring-2 group-hover:ring-gray-200 group-hover:ring-offset-2'
              }`}
            onError={() => setImageError(true)}
          />
        ) : (
          <div className={`w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg transition ${isSelected ? 'ring-2 ring-blue-600 ring-offset-2' : 'group-hover:ring-2 group-hover:ring-gray-200 group-hover:ring-offset-2'
            }`}>
            {getInitials(name)}
          </div>
        )}

        {isSelected && (
          <div className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-1 border-2 border-white">
            <Check className="w-3 h-3 text-white stroke-[3]" />
          </div>
        )}
      </div>
      <span className="text-xs text-center font-medium text-gray-700 truncate w-full px-1">
        {name.split(' ')[0]}
      </span>
    </button>
  );
}

/**
 * Friend Row Component (Legacy / Search Results)
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
  const [imageError, setImageError] = useState(false);

  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition"
    >
      {/* Avatar */}
      {avatarUrl && !imageError ? (
        <img
          src={avatarUrl}
          alt={name}
          className="w-10 h-10 rounded-full object-cover bg-gray-200"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
          {getInitials(name)}
        </div>
      )}

      {/* Info */}
      <div className="flex-1 text-left">
        <p className="font-medium text-sm text-gray-900">{name}</p>
        <p className="text-xs text-gray-500">
          @{username}
          {subtitle && ` · ${subtitle}`}
        </p>
      </div>

      {/* Checkbox */}
      <div
        className={`w-5 h-5 rounded border flex items-center justify-center transition ${isSelected
          ? 'bg-blue-600 border-blue-600'
          : 'border-gray-400 bg-white'
          }`}
      >
        {isSelected && <Check className="w-3 h-3 text-white stroke-[3]" />}
      </div>
    </button>
  );
}
