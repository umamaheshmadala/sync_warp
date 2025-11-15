// src/components/messaging/FriendPickerModal.tsx
// Story: 8.2.9 - Friends-to-Messaging Integration
// Modal for selecting a friend to start a conversation

import React, { useState, useMemo } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { X, Search, MessageCircle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNewFriends } from '../../hooks/useNewFriends';
import { useMessagingStore } from '../../store/messagingStore';
import { useHapticFeedback } from '../../hooks/useHapticFeedback';
import { messagingService } from '../../services/messagingService';

interface FriendPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FriendPickerModal: React.FC<FriendPickerModalProps> = ({
  isOpen,
  onClose
}) => {
  const navigate = useNavigate();
  const { friends, loading } = useNewFriends();
  const { conversations } = useMessagingStore();
  const { triggerHaptic } = useHapticFeedback();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if conversation already exists with this friend
  const getExistingConversation = (friendId: string) => {
    return conversations.find(conv =>
      conv.participant1_id === friendId ||
      conv.participant2_id === friendId
    );
  };

  // Filter and sort friends
  const filteredFriends = useMemo(() => {
    let result = friends;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(f =>
        f.friend_profile.full_name.toLowerCase().includes(query) ||
        (f.friend_profile.city && f.friend_profile.city.toLowerCase().includes(query))
      );
    }

    // Sort: Online first, then alphabetically
    return result.sort((a, b) => {
      // Online friends first
      if (a.friend_profile.is_online && !b.friend_profile.is_online) return -1;
      if (!a.friend_profile.is_online && b.friend_profile.is_online) return 1;
      
      // Then alphabetically
      return a.friend_profile.full_name.localeCompare(b.friend_profile.full_name);
    });
  }, [friends, searchQuery]);

  // Handle friend selection
  const handleSelectFriend = async (friendId: string, friendName: string) => {
    try {
      setError(null);
      setIsCreating(true);
      triggerHaptic('light');

      // Check if conversation exists
      const existingConversation = getExistingConversation(friendId);

      if (existingConversation) {
        // Navigate to existing conversation
        console.log('📬 Navigating to existing conversation:', existingConversation.conversation_id);
        navigate(`/messages/${existingConversation.conversation_id}`);
        triggerHaptic('success');
      } else {
        // Create new conversation
        console.log('✨ Creating new conversation with:', friendName);
        const conversationId = await messagingService.createOrGetConversation(friendId);
        
        // Navigate to new conversation
        navigate(`/messages/${conversationId}`);
        triggerHaptic('success');
      }

      onClose();
    } catch (err: any) {
      console.error('❌ Error starting conversation:', err);
      setError(err.message || 'Failed to start conversation');
      triggerHaptic('error');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                {/* Header */}
                <div className="bg-indigo-600 px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <Dialog.Title className="text-lg font-medium text-white">
                      New Message
                    </Dialog.Title>
                    <button
                      type="button"
                      className="rounded-md text-indigo-200 hover:text-white focus:outline-none focus:ring-2 focus:ring-white"
                      onClick={onClose}
                      disabled={isCreating}
                    >
                      <span className="sr-only">Close</span>
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                  <p className="mt-1 text-sm text-indigo-200">
                    Select a friend to start chatting
                  </p>
                </div>

                {/* Search */}
                <div className="px-4 pt-4 sm:px-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="Search friends..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      disabled={isCreating}
                    />
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="mx-4 mt-3 rounded-md bg-red-50 p-3 sm:mx-6">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                {/* Friends List */}
                <div className="mt-3 max-h-96 overflow-y-auto px-4 pb-4 sm:px-6">
                  {loading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center space-x-3 rounded-lg p-3">
                          <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse" />
                          <div className="flex-1">
                            <div className="h-4 bg-gray-200 rounded animate-pulse mb-2 w-2/3" />
                            <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : filteredFriends.length === 0 ? (
                    <div className="py-12 text-center">
                      <MessageCircle className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">
                        {searchQuery ? 'No friends found' : 'No friends yet'}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {searchQuery
                          ? 'Try searching with a different name'
                          : 'Add friends to start chatting'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {filteredFriends.map((friendship) => {
                        const friend = friendship.friend_profile;
                        const existingConv = getExistingConversation(friend.user_id);
                        
                        return (
                          <button
                            key={friendship.id}
                            onClick={() => handleSelectFriend(friend.user_id, friend.full_name)}
                            disabled={isCreating}
                            className="w-full flex items-center space-x-3 rounded-lg p-3 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {/* Avatar with online status */}
                            <div className="relative flex-shrink-0">
                              {friend.avatar_url ? (
                                <img
                                  className="h-10 w-10 rounded-full object-cover"
                                  src={friend.avatar_url}
                                  alt={friend.full_name}
                                />
                              ) : (
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-purple-500">
                                  <span className="text-white font-medium text-sm">
                                    {friend.full_name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                              {/* Online indicator */}
                              <div
                                className={`absolute -bottom-0 -right-0 h-3 w-3 rounded-full border-2 border-white ${
                                  friend.is_online ? 'bg-green-400' : 'bg-gray-400'
                                }`}
                              />
                            </div>

                            {/* Friend info */}
                            <div className="flex-1 min-w-0 text-left">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {friend.full_name}
                              </p>
                              <div className="flex items-center space-x-2">
                                <p className="text-xs text-gray-500">
                                  {friend.is_online ? 'Online' : 'Offline'}
                                </p>
                                {friend.city && (
                                  <>
                                    <span className="text-xs text-gray-300">•</span>
                                    <p className="text-xs text-gray-500 truncate">{friend.city}</p>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Existing conversation indicator */}
                            {existingConv && (
                              <div className="flex-shrink-0 flex items-center text-green-600">
                                <CheckCircle className="h-5 w-5" />
                                <span className="ml-1 text-xs hidden sm:inline">Active</span>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:mt-0 sm:w-auto"
                    onClick={onClose}
                    disabled={isCreating}
                  >
                    Cancel
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};
