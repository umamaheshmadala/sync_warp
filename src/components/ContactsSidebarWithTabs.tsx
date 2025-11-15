// src/components/ContactsSidebarWithTabs.tsx
import React, { useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { X, Search, UserPlus, MessageCircle, Users, User, Share2, Trash2, Filter, Check, Clock, MapPin, Heart } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useNewFriends as useFriends } from '../hooks/useNewFriends'
import { useMessagingStore } from '../store/messagingStore'
import { useHapticFeedback } from '../hooks/useHapticFeedback'
import { messagingService } from '../services/messagingService'
import AddFriend from './AddFriend'
import ShareDeal from './ShareDealSimple'
import type { Friend } from '../services/newFriendService'

interface ContactsSidebarProps {
  isOpen: boolean
  onClose: () => void
}

type TabType = 'friends' | 'requests'

const ContactsSidebar: React.FC<ContactsSidebarProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const {
    friends,
    friendRequests,
    loading,
    totalFriends,
    onlineCount,
    removeFriend,
    acceptFriendRequest,
    rejectFriendRequest
  } = useFriends()
  const { conversations } = useMessagingStore()
  const { triggerHaptic } = useHapticFeedback()
  
  const [activeTab, setActiveTab] = useState<TabType>('friends')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddFriend, setShowAddFriend] = useState(false)
  const [showShareDeal, setShowShareDeal] = useState<string | null>(null)
  const [filterOnline, setFilterOnline] = useState(false)
  const [processingRequest, setProcessingRequest] = useState<Set<string>>(new Set())

  // Get filtered friends based on search and filter
  const getFilteredFriends = () => {
    let filteredFriends = friends
    
    // Apply online filter
    if (filterOnline) {
      filteredFriends = filteredFriends.filter(f => f.friend_profile.is_online)
    }
    
    // Apply search filter
    if (searchQuery) {
      filteredFriends = filteredFriends.filter(f =>
        f.friend_profile.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (f.friend_profile.city && f.friend_profile.city.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }
    
    return filteredFriends
  }
  
  const filteredFriends = getFilteredFriends()

  const handleShareTap = (friend: Friend) => {
    triggerHaptic('light')
    setShowShareDeal(friend.friend_profile.user_id)
  }

  const handleMessageTap = async (friend: Friend) => {
    try {
      triggerHaptic('light')
      
      // Check if conversation already exists
      const existingConversation = conversations.find(conv =>
        conv.participant1_id === friend.friend_profile.user_id ||
        conv.participant2_id === friend.friend_profile.user_id
      )
      
      if (existingConversation) {
        // Navigate to existing conversation
        console.log('📬 Navigating to existing conversation:', existingConversation.conversation_id)
        navigate(`/messages/${existingConversation.conversation_id}`)
        triggerHaptic('success')
      } else {
        // Create new conversation and navigate
        console.log('✨ Creating new conversation with:', friend.friend_profile.full_name)
        const conversationId = await messagingService.createOrGetConversation(friend.friend_profile.user_id)
        navigate(`/messages/${conversationId}`)
        triggerHaptic('success')
      }
      
      onClose() // Close sidebar
    } catch (error) {
      console.error('❌ Error starting conversation:', error)
      triggerHaptic('error')
    }
  }
  
  const handleRemoveFriend = async (friend: Friend) => {
    if (confirm(`Remove ${friend.friend_profile.full_name} from friends?`)) {
      try {
        await removeFriend(friend.friend_profile.user_id)
        triggerHaptic('success')
      } catch (error) {
        console.error('Error removing friend:', error)
      }
    }
  }

  const handleAcceptRequest = async (requestId: string) => {
    try {
      setProcessingRequest(prev => new Set(prev).add(requestId))
      await acceptFriendRequest(requestId)
      triggerHaptic('success')
      // Switch to friends tab to show the new friend
      setActiveTab('friends')
    } catch (error) {
      console.error('Error accepting friend request:', error)
      triggerHaptic('error')
    } finally {
      setProcessingRequest(prev => {
        const next = new Set(prev)
        next.delete(requestId)
        return next
      })
    }
  }

  const handleRejectRequest = async (requestId: string) => {
    try {
      setProcessingRequest(prev => new Set(prev).add(requestId))
      await rejectFriendRequest(requestId)
      triggerHaptic('light')
    } catch (error) {
      console.error('Error rejecting friend request:', error)
      triggerHaptic('error')
    } finally {
      setProcessingRequest(prev => {
        const next = new Set(prev)
        next.delete(requestId)
        return next
      })
    }
  }
  
  const formatLastActive = (lastActive: string): string => {
    const date = new Date(lastActive)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return `${Math.floor(diffInMinutes / 1440)}d ago`
  }

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    return `${Math.floor(diffInSeconds / 86400)}d ago`
  }

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
                  <Dialog.Panel className="pointer-events-auto relative w-screen max-w-md">
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

                      {/* Tabs */}
                      <div className="border-b border-gray-200">
                        <nav className="-mb-px flex">
                          <button
                            onClick={() => setActiveTab('friends')}
                            className={`flex-1 py-4 px-1 text-center border-b-2 font-medium text-sm transition-colors ${
                              activeTab === 'friends'
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                          >
                            Friends ({totalFriends})
                          </button>
                          <button
                            onClick={() => setActiveTab('requests')}
                            className={`flex-1 py-4 px-1 text-center border-b-2 font-medium text-sm transition-colors relative ${
                              activeTab === 'requests'
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                          >
                            Requests ({friendRequests.length})
                            {friendRequests.length > 0 && (
                              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                {friendRequests.length}
                              </span>
                            )}
                          </button>
                        </nav>
                      </div>

                      {/* Search and Controls (only for friends tab) */}
                      {activeTab === 'friends' && (
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
                          
                          <button 
                            onClick={() => setShowAddFriend(true)}
                            className="w-full flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <UserPlus className="mr-2 h-4 w-4" />
                            Find Friends
                          </button>
                        </div>
                      )}

                      {/* Content */}
                      <div className="flex-1 px-4 py-4">
                        {activeTab === 'friends' ? (
                          // Friends Tab
                          loading ? (
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
                                  : 'Start connecting with people to share deals and experiences'
                                }
                              </p>
                              {!searchQuery && (
                                <div className="mt-4">
                                  <button 
                                    onClick={() => setShowAddFriend(true)}
                                    className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                                  >
                                    <UserPlus className="mr-1.5 h-4 w-4" />
                                    Find Friends
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <AnimatePresence mode="popLayout">
                                {filteredFriends.map((friendship) => {
                                  const friend = friendship.friend_profile
                                  
                                  return (
                                    <motion.div
                                      key={friendship.id}
                                      className="group flex items-center rounded-lg p-2 hover:bg-gray-50 transition-colors"
                                      initial={{ opacity: 0, y: 20 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, x: -20 }}
                                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                      layout
                                    >
                                      <div className="relative">
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
                                        <motion.div
                                          className={`absolute -bottom-0 -right-0 h-3 w-3 rounded-full border-2 border-white ${
                                            friend.is_online ? 'bg-green-400' : 'bg-gray-400'
                                          }`}
                                          animate={{
                                            scale: friend.is_online ? [1, 1.2, 1] : 1
                                          }}
                                          transition={{
                                            duration: 2,
                                            repeat: friend.is_online ? Infinity : 0,
                                            repeatType: "reverse"
                                          }}
                                        />
                                      </div>
                                      <div className="ml-3 flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">
                                          {friend.full_name}
                                        </p>
                                        <div className="flex items-center space-x-2">
                                          <p className="text-xs text-gray-500">
                                            {friend.is_online ? 'Online' : `Active ${formatLastActive(friend.last_active)}`}
                                          </p>
                                          {friend.city && (
                                            <>
                                              <span className="text-xs text-gray-300">•</span>
                                              <p className="text-xs text-gray-500 truncate">{friend.city}</p>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <motion.button
                                          onClick={() => handleShareTap(friendship)}
                                          className="rounded-full p-1.5 text-indigo-600 hover:bg-indigo-100 transition-colors"
                                          title="Share deal"
                                          whileHover={{ scale: 1.1 }}
                                          whileTap={{ scale: 0.9 }}
                                        >
                                          <Share2 className="h-4 w-4" />
                                        </motion.button>
                                        <motion.button
                                          onClick={() => handleMessageTap(friendship)}
                                          className="rounded-full p-1.5 text-gray-600 hover:bg-gray-100 transition-colors"
                                          title="Send message"
                                          whileHover={{ scale: 1.1 }}
                                          whileTap={{ scale: 0.9 }}
                                        >
                                          <MessageCircle className="h-4 w-4" />
                                        </motion.button>
                                        <motion.button
                                          onClick={() => handleRemoveFriend(friendship)}
                                          className="rounded-full p-1.5 text-red-600 hover:bg-red-100 transition-colors"
                                          title="Remove friend"
                                          whileHover={{ scale: 1.1 }}
                                          whileTap={{ scale: 0.9 }}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </motion.button>
                                      </div>
                                    </motion.div>
                                  )
                                })}
                              </AnimatePresence>
                            </div>
                          )
                        ) : (
                          // Requests Tab
                          friendRequests.length === 0 ? (
                            <div className="text-center py-8">
                              <Users className="mx-auto h-12 w-12 text-gray-400" />
                              <h3 className="mt-2 text-sm font-medium text-gray-900">No pending requests</h3>
                              <p className="mt-1 text-sm text-gray-500">
                                Friend requests will appear here when someone wants to connect
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {friendRequests.map((request) => {
                                const isProcessing = processingRequest.has(request.id)
                                
                                return (
                                  <motion.div
                                    key={request.id}
                                    className="p-4 bg-gray-50 rounded-xl"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -100 }}
                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-3">
                                        <div className="relative">
                                          {request.requester_avatar ? (
                                            <img
                                              src={request.requester_avatar}
                                              alt={request.requester_name}
                                              className="h-12 w-12 rounded-full object-cover"
                                            />
                                          ) : (
                                            <div className="h-12 w-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center">
                                              <span className="text-white font-semibold text-lg">
                                                {request.requester_name.charAt(0).toUpperCase()}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                        
                                        <div className="flex-1">
                                          <h4 className="font-medium text-gray-900">{request.requester_name}</h4>
                                          <div className="flex items-center space-x-4 mt-1">
                                            <div className="flex items-center text-sm text-gray-500">
                                              <Clock className="h-3 w-3 mr-1" />
                                              {formatTimeAgo(request.created_at)}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center justify-end space-x-3 mt-4">
                                      <motion.button
                                        onClick={() => handleRejectRequest(request.id)}
                                        disabled={isProcessing}
                                        className="flex items-center space-x-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                      >
                                        <X className="h-4 w-4" />
                                        <span>Decline</span>
                                      </motion.button>
                                      
                                      <motion.button
                                        onClick={() => handleAcceptRequest(request.id)}
                                        disabled={isProcessing}
                                        className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                      >
                                        {isProcessing ? (
                                          <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                            <span>Processing...</span>
                                          </>
                                        ) : (
                                          <>
                                            <Check className="h-4 w-4" />
                                            <span>Accept</span>
                                          </>
                                        )}
                                      </motion.button>
                                    </div>
                                  </motion.div>
                                )
                              })}
                            </div>
                          )
                        )}
                      </div>

                      {/* Footer */}
                      <div className="border-t border-gray-200 p-4">
                        <button
                          onClick={onClose}
                          className="w-full rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
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
      
      {showShareDeal && (
        <ShareDeal
          friendId={showShareDeal}
          friendName={friends.find(f => f.friend_profile.user_id === showShareDeal)?.friend_profile.full_name}
          isOpen={true}
          onClose={() => setShowShareDeal(null)}
        />
      )}
    </>
  )
}

export default ContactsSidebar