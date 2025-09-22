// src/components/ContactsSidebar.tsx
import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { X, Search, UserPlus, MessageCircle, Users, User, Share2, Trash2, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { useFriends } from '../hooks/useFriends';
import { useHapticFeedback } from '../hooks/useHapticFeedback';
import AddFriend from './AddFriend';
import FriendRequests from './FriendRequests';
import ShareDeal from './ShareDeal';
import type { Friendship } from '../services/friendService';


interface ContactsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const ContactsSidebar: React.FC<ContactsSidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useAuthStore();
  const {
    friends,
    friendRequests,
    loading,
    onlineFriends,
    offlineFriends,
    totalFriends,
    onlineCount,
    removeFriend,
    shareDeal
  } = useFriends();
  const { triggerHaptic } = useHapticFeedback();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [showShareDeal, setShowShareDeal] = useState<string | null>(null);
  const [filterOnline, setFilterOnline] = useState(false);

  // Get filtered friends based on search and filter
  const getFilteredFriends = () => {
    let filteredFriends = friends;
    
    // Apply online filter
    if (filterOnline) {
      filteredFriends = filteredFriends.filter(f => f.friend_profile.is_online);
    }
    
    // Apply search filter
    if (searchQuery) {
      filteredFriends = filteredFriends.filter(f =>
        f.friend_profile.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (f.friend_profile.city && f.friend_profile.city.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    return filteredFriends;
  };
  
  const filteredFriends = getFilteredFriends();


  const handleShareTap = (friendship: Friendship) => {
    triggerHaptic('light');
    setShowShareDeal(friendship.friend_profile.user_id);
  };

  const handleMessageTap = (friendship: Friendship) => {
    triggerHaptic('light');
    // This would open a messaging interface
    console.log('Message friend:', friendship.friend_profile.full_name);
  };
  
  const handleRemoveFriend = async (friendship: Friendship) => {
    if (confirm(`Remove ${friendship.friend_profile.full_name} from friends?`)) {
      try {
        await removeFriend(friendship.friend_profile.user_id);
        triggerHaptic('success');
      } catch (error) {
        console.error('Error removing friend:', error);
      }
    }
  };
  
  const formatLastActive = (lastActive: string): string => {
    const date = new Date(lastActive);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <>
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-in-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in-out duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-300"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-300"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <Dialog.Panel className="pointer-events-auto relative w-screen max-w-sm">
                  <div className="flex h-full flex-col overflow-y-scroll bg-white shadow-xl">
                    {/* Header */}
                    <div className="bg-indigo-600 px-4 py-6 sm:px-6">
                      <div className="flex items-center justify-between">
                        <Dialog.Title className="text-lg font-medium text-white">
                          Your Friends
                        </Dialog.Title>
                        <div className="ml-3 flex h-7 items-center">
                          <button
                            type="button"
                            className="rounded-md bg-indigo-600 text-indigo-200 hover:text-white focus:outline-none focus:ring-2 focus:ring-white"
                            onClick={onClose}
                          >
                            <span className="sr-only">Close panel</span>
                            <X className="h-6 w-6" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <p className="text-sm text-indigo-200">
                          {totalFriends} friends • {onlineCount} online
                        </p>
                        {friendRequests.length > 0 && (
                          <div className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                            {friendRequests.length}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Search */}
                    <div className="border-b border-gray-200 p-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          placeholder="Search friends..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Search */}
                    <div className="border-b border-gray-200 p-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <input
                            type="text"
                            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            placeholder="Search friends..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                          />
                        </div>
                        <button
                          onClick={() => setFilterOnline(!filterOnline)}
                          className={`p-2 rounded-lg border transition-colors ${
                            filterOnline 
                              ? 'bg-green-100 border-green-300 text-green-700'
                              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                          title="Filter online friends"
                        >
                          <Filter className="h-4 w-4" />
                        </button>
                      </div>
                      
                      {/* Quick Actions */}
                      <div className="grid grid-cols-2 gap-3">
                        <button 
                          onClick={() => setShowAddFriend(true)}
                          className="flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          <UserPlus className="mr-2 h-4 w-4" />
                          Find Friends
                        </button>
                        <button 
                          onClick={() => setShowRequests(true)}
                          className="flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 relative"
                        >
                          <Users className="mr-2 h-4 w-4" />
                          Requests
                          {friendRequests.length > 0 && (
                            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                              {friendRequests.length}
                            </span>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Friends List */}
                    <div className="flex-1 px-4 py-2">
                      {loading ? (
                        <div className="space-y-3">
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center space-x-3">
                              <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse"></div>
                              <div className="flex-1">
                                <div className="h-4 bg-gray-200 rounded animate-pulse mb-1"></div>
                                <div className="h-3 bg-gray-100 rounded animate-pulse w-2/3"></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : filteredFriends.length === 0 ? (
                        <div className="text-center py-8">
                          <Users className="mx-auto h-12 w-12 text-gray-400" />
                          <h3 className="mt-2 text-sm font-medium text-gray-900">
                            {searchQuery ? 'No friends found' : 'No friends yet'}
                          </h3>
                          <p className="mt-1 text-sm text-gray-500">
                            {searchQuery 
                              ? 'Try searching with a different name' 
                              : 'Start connecting with people to share coupons and experiences'
                            }
                          </p>
                          {!searchQuery && (
                            <div className="mt-4">
                              <button className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500">
                                <UserPlus className="mr-1.5 h-4 w-4" />
                                Find Friends
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {filteredFriends.map((friend) => (
                            <div
                              key={friend.id}
                              className="group flex items-center rounded-lg p-2 hover:bg-gray-50"
                            >
                              <div className="relative">
                                {friend.avatar_url ? (
                                  <img
                                    className="h-10 w-10 rounded-full"
                                    src={friend.avatar_url}
                                    alt={friend.full_name}
                                  />
                                ) : (
                                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-300">
                                    <User className="h-5 w-5 text-gray-600" />
                                  </div>
                                )}
                                {friend.is_online && (
                                  <span className="absolute -bottom-0 -right-0 block h-3 w-3 rounded-full border-2 border-white bg-green-400" />
                                )}
                              </div>
                              <div className="ml-3 flex-1">
                                <p className="text-sm font-medium text-gray-900">
                                  {friend.full_name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {friend.is_online ? 'Online' : `Active ${friend.last_active}`}
                                </p>
                              </div>
                              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleShareTap(friend)}
                                  className="rounded-full p-1 text-indigo-600 hover:bg-indigo-100"
                                  title="Share coupon"
                                >
                                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleMessageTap(friend)}
                                  className="rounded-full p-1 text-gray-600 hover:bg-gray-100"
                                  title="Send message"
                                >
                                  <MessageCircle className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="border-t border-gray-200 p-4">
                      <button
                        onClick={onClose}
                        className="w-full rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition.Root>

    {/* Modals */}
    <AddFriend 
      isOpen={showAddFriend}
      onClose={() => setShowAddFriend(false)}
    />
    
    <FriendRequests 
      isOpen={showRequests}
      onClose={() => setShowRequests(false)}
    />
  </>
  );
};

export default ContactsSidebar;
