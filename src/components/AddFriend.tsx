// src/components/AddFriend.tsx
import React, { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, UserPlus, User, MapPin, Heart, X, Check } from 'lucide-react'
import { useNewFriends as useFriends } from '../hooks/useNewFriends'
import { useSendFriendRequest } from '../hooks/useFriendRequests'
import { useHapticFeedback } from '../hooks/useHapticFeedback'
import { toast } from 'react-hot-toast'
import type { FriendProfile } from '../services/newFriendService'

interface AddFriendProps {
  isOpen: boolean
  onClose: () => void
}

const AddFriend: React.FC<AddFriendProps> = ({ isOpen, onClose }) => {
  const { searchUsers } = useFriends()
  const sendRequest = useSendFriendRequest()
  const { triggerHaptic } = useHapticFeedback()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<FriendProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [sendingRequest, setSendingRequest] = useState<Set<string>>(new Set())
  const [successMessages, setSuccessMessages] = useState<Set<string>>(new Set())
  const searchTimeoutRef = useRef<NodeJS.Timeout>()

  /**
   * Debounced search function
   */
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setLoading(true)
    try {
      const results = await searchUsers(query)
      setSearchResults(results)
    } catch (error) {
      console.error('Search error:', error)
      setSearchResults([])
    } finally {
      setLoading(false)
    }
  }, [searchUsers])

  /**
   * Handle search input change with debouncing
   */
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value)
    
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    // Set new timeout
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(value)
    }, 300)
  }, [performSearch])

  /**
   * Send friend request
   */
  const handleSendRequest = useCallback((userId: string) => {
    setSendingRequest(prev => new Set(prev).add(userId))
    
    sendRequest.mutate(
      { receiverId: userId },
      {
        onSuccess: (result) => {
          if (result.success) {
            triggerHaptic('success')
            toast.success('Friend request sent!')
            
            // Mark as successfully sent
            setSuccessMessages(prev => new Set(prev).add(userId))
            
            // Remove user from search results after successful send
            setSearchResults(prev => prev.filter(user => user.user_id !== userId))
          } else {
            triggerHaptic('error')
            toast.error(result.error || 'Failed to send friend request')
          }
          
          setSendingRequest(prev => {
            const next = new Set(prev)
            next.delete(userId)
            return next
          })
        },
        onError: (error) => {
          console.error('Error sending friend request:', error)
          triggerHaptic('error')
          toast.error('Failed to send friend request')
          
          setSendingRequest(prev => {
            const next = new Set(prev)
            next.delete(userId)
            return next
          })
        }
      }
    )
  }, [sendRequest, triggerHaptic])

  /**
   * Reset component when closing
   */
  const handleClose = useCallback(() => {
    setSearchQuery('')
    setSearchResults([])
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    onClose()
  }, [onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 overflow-y-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="min-h-screen px-4 text-center">
            <motion.div
              className="fixed inset-0 bg-black/30 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
            />
            
            <div className="inline-block w-full max-w-lg p-6 my-8 text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl relative">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: "spring", duration: 0.3 }}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-indigo-100 rounded-full">
                      <UserPlus className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">Find Friends</h3>
                      <p className="text-sm text-gray-600">Search for people to connect with</p>
                    </div>
                  </div>
                  <button
                    onClick={handleClose}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Search Input */}
                <div className="relative mb-6">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="Search by name or email..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    autoFocus
                  />
                  {loading && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600" />
                    </div>
                  )}
                </div>

                {/* Search Results */}
                <div className="max-h-96 overflow-y-auto">
                  {searchQuery && !loading && searchResults.length === 0 && (
                    <div className="text-center py-8">
                      <User className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Try searching with a different name or email
                      </p>
                    </div>
                  )}

                  {!searchQuery && (
                    <div className="text-center py-8">
                      <Search className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">Start searching</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Enter a name or email to find friends
                      </p>
                    </div>
                  )}

                  <div className="space-y-3">
                    {searchResults.map((user) => {
                      const isSending = sendingRequest.has(user.user_id)
                      const wasSuccessful = successMessages.has(user.user_id)
                      
                      return (
                        <motion.div
                          key={user.user_id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="relative">
                              {user.avatar_url ? (
                                <img
                                  src={user.avatar_url}
                                  alt={user.full_name}
                                  className="h-12 w-12 rounded-full object-cover"
                                />
                              ) : (
                                <div className="h-12 w-12 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center">
                                  <span className="text-white font-semibold text-lg">
                                    {user.full_name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                              {user.is_online && (
                                <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-400 border-2 border-white rounded-full" />
                              )}
                            </div>
                            
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{user.full_name}</h4>
                              <div className="flex items-center space-x-4 mt-1">
                                {user.city && (
                                  <div className="flex items-center text-sm text-gray-500">
                                    <MapPin className="h-3 w-3 mr-1" />
                                    {user.city}
                                  </div>
                                )}
                                {user.interests && user.interests.length > 0 && (
                                  <div className="flex items-center text-sm text-gray-500">
                                    <Heart className="h-3 w-3 mr-1" />
                                    {user.interests.slice(0, 2).join(', ')}
                                    {user.interests.length > 2 && '...'}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <motion.button
                            onClick={() => handleSendRequest(user.user_id)}
                            disabled={isSending || wasSuccessful}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                              isSending || wasSuccessful
                                ? 'bg-green-100 text-green-700 cursor-not-allowed'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700'
                            }`}
                            whileHover={{ scale: isSending || wasSuccessful ? 1 : 1.02 }}
                            whileTap={{ scale: isSending || wasSuccessful ? 1 : 0.98 }}
                          >
                            {isSending ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600" />
                                <span>Sending...</span>
                              </>
                            ) : wasSuccessful ? (
                              <>
                                <Check className="h-4 w-4" />
                                <span>Sent ✓</span>
                              </>
                            ) : (
                              <>
                                <UserPlus className="h-4 w-4" />
                                <span>Add</span>
                              </>
                            )}
                          </motion.button>
                        </motion.div>
                      )
                    })}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end pt-6 border-t border-gray-200 mt-6">
                  <button
                    onClick={handleClose}
                    className="px-6 py-2 text-gray-600 hover:text-gray-800 font-medium"
                  >
                    Done
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default AddFriend