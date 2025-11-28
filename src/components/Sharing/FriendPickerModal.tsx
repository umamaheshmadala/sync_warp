/**
 * Friend Picker Modal - Deal Sharing Integration
 * Story 9.2.6: Deal Sharing Integration
 * Story 9.7.1: Enhanced with share method and custom message
 * 
 * Allows users to select friends to share deals with
 * Features:
 * - Search for friends (integrates with Story 9.2.1)
 * - PYMK suggestions (integrates with Story 9.2.2)
 * - Recently shared with section
 * - Multi-select with checkboxes
 * - Share method selection (message vs notification)
 * - Optional custom message
 */

import React, { useState, useEffect } from 'react';
import { X, Search, Check, Users, Clock, MessageSquare, Bell, Plus } from 'lucide-react';
import { useOptimizedSearch } from '../../hooks/useOptimizedSearch';
import { useFriends } from '../../hooks/friends/useFriends';

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
  const [recentlySharedUsers, setRecentlySharedUsers] = useState<Friend[]>([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(false);
  const [shareMethod, setShareMethod] = useState<'message' | 'notification'>('notification');
  const [customMessage, setCustomMessage] = useState('');
  const [showMessageInput, setShowMessageInput] = useState(false);

  // Use optimized search hook (from Story 9.2.5)
  const { data: searchData, isLoading: isSearching } = useOptimizedSearch(searchQuery);

  // Use friends hook to get all friends
  const { data: friendsResponse, isLoading: loadingAllFriends } = useFriends();

  // Load recently shared with from localStorage
  useEffect(() => {
    console.log('[FriendPickerModal] Loading from localStorage');
    try {
      const recent = localStorage.getItem('recently_shared_with');
      console.log('[FriendPickerModal] localStorage value:', recent);
      if (recent) {
        const parsed = JSON.parse(recent).slice(0, 5);
        console.log('[FriendPickerModal] Setting recentlySharedWith:', parsed);
        setRecentlySharedWith(parsed);
      }
    } catch (error) {
      console.error('Failed to load recently shared with:', error);
    }
  }, []);

  // Fetch user data for recently shared IDs
  useEffect(() => {
    console.log('[FriendPickerModal] recentlySharedWith changed:', recentlySharedWith);
    const fetchRecentUsers = async () => {
      if (recentlySharedWith.length === 0) {
        console.log('[FriendPickerModal] No IDs to fetch, returning');
        return;
      }

      console.log('[FriendPickerModal] Fetching users for IDs:', recentlySharedWith);
      setIsLoadingRecent(true);
      try {
        const { supabase } = await import('../../lib/supabase');
        const { data, error } = await supabase
          .from('profiles')
          .select('user_id, full_name, username, avatar_url, city')
          .in('user_id', recentlySharedWith);

        if (error) throw error;

        console.log('[FriendPickerModal] Fetched data:', data);

        // Map to Friend format and maintain order from recentlySharedWith
        const usersMap = new Map<string, Friend>();
        data?.forEach(u => {
          usersMap.set(u.user_id, {
            userId: u.user_id,
            fullName: u.full_name,
            username: u.username,
            avatarUrl: u.avatar_url || undefined,
            subtitle: u.city || undefined,
          });
        });

        const orderedUsers: Friend[] = [];
        for (const id of recentlySharedWith) {
          const user = usersMap.get(id);
          if (user) {
            orderedUsers.push(user);
          }
        }

        console.log('[FriendPickerModal] Setting recentlySharedUsers:', orderedUsers);
        setRecentlySharedUsers(orderedUsers);
      } catch (error) {
        console.error('Failed to fetch recent users:', error);
      } finally {
        setIsLoadingRecent(false);
      }
    };

    fetchRecentUsers();
  }, [recentlySharedWith]);

  // Transform search results to Friend format
  const searchResults: Friend[] = searchData?.results.map(result => ({
    userId: result.user_id,
    fullName: result.full_name,
    username: result.username,
    avatarUrl: result.avatar_url || undefined,
    subtitle: result.location || undefined,
  })) || [];

  // Transform all friends data to Friend format
  // friendsResponse is ServiceResponse<Friend[]>, so we need to access .data
  const allFriends: Friend[] = friendsResponse?.success && Array.isArray(friendsResponse.data)
    ? friendsResponse.data.map((profile: any) => ({
      userId: profile.id,
      fullName: profile.full_name,
      username: profile.username,
      avatarUrl: profile.avatar_url || undefined,
      subtitle: undefined,
    }))
    : [];

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

      // Update recently shared with
      const updated = [
        ...selectedFriends,
        ...recentlySharedWith.filter((id: string) => !selectedFriends.includes(id)),
      ].slice(0, 5);
      localStorage.setItem('recently_shared_with', JSON.stringify(updated));
      setRecentlySharedWith(updated);

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
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
          {(() => {
            const shouldShow = !searchQuery && (isLoadingRecent || recentlySharedUsers.length > 0);
            console.log('[FriendPickerModal] Render check - searchQuery:', searchQuery, 'isLoadingRecent:', isLoadingRecent, 'recentlySharedUsers.length:', recentlySharedUsers.length, 'shouldShow:', shouldShow);
            return shouldShow;
          })() && (
              <div className="p-4 border-b">
                <h3 className="flex items-center text-sm font-semibold text-gray-900 mb-3">
                  <Clock className="w-4 h-4 mr-2" />
                  Recently Shared With
                </h3>
                {isLoadingRecent ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-3 p-2">
                        <div className="w-12 h-12 rounded-full bg-gray-200 animate-pulse" />
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded w-32 mb-2 animate-pulse" />
                          <div className="h-3 bg-gray-200 rounded w-24 animate-pulse" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentlySharedUsers.map((user) => (
                      <FriendRow
                        key={user.userId}
                        userId={user.userId}
                        name={user.fullName}
                        username={user.username}
                        avatarUrl={user.avatarUrl}
                        subtitle={user.subtitle}
                        isSelected={selectedFriends.includes(user.userId)}
                        onToggle={() => handleToggleFriend(user.userId)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

          {/* Search Results or All Friends */}
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
        className={`w-6 h-6 rounded border-2 flex items-center justify-center transition ${isSelected
          ? 'bg-blue-600 border-blue-600'
          : 'border-gray-400 bg-white'
          }`}
      >
        {isSelected && <Check className="w-4 h-4 text-white stroke-[3]" />}
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
        className={`w-6 h-6 rounded border-2 flex items-center justify-center transition ${isSelected
          ? 'bg-blue-600 border-blue-600'
          : 'border-gray-400 bg-white'
          }`}
      >
        {isSelected && <Check className="w-4 h-4 text-white stroke-[3]" />}
      </div>
    </button>
  );
}
