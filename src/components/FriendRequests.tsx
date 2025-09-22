// src/components/FriendRequests.tsx
import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Check, X, User, Clock, MapPin, Heart } from 'lucide-react'
import { useNewFriends as useFriends } from '../hooks/useNewFriends'
import { useHapticFeedback } from '../hooks/useHapticFeedback'
import type { FriendRequest } from '../services/newFriendService'

interface FriendRequestsProps {
  isOpen: boolean
  onClose: () => void
}

const FriendRequests: React.FC<FriendRequestsProps> = ({ isOpen, onClose }) => {
  const { friendRequests, acceptFriendRequest, rejectFriendRequest } = useFriends()
  const { triggerHaptic } = useHapticFeedback()
  const [processingRequest, setProcessingRequest] = useState<Set<string>>(new Set())

  // Only log when component opens/closes, not on every render
  React.useEffect(() => {
    if (isOpen) {
      console.log('FriendRequests opened with requests:', friendRequests.length)
    }
  }, [isOpen, friendRequests.length])

  /**
   * Accept friend request
   */
  const handleAccept = async (requestId: string) => {
    try {
      setProcessingRequest(prev => new Set(prev).add(requestId))
      await acceptFriendRequest(requestId)
      triggerHaptic('success')
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

  /**
   * Reject friend request
   */
  const handleReject = async (requestId: string) => {
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

  /**
   * Format time ago
   */
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
              onClick={onClose}
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
                    <div className="p-2 bg-blue-100 rounded-full">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">Friend Requests</h3>
                      <p className="text-sm text-gray-600">
                        {friendRequests.length} pending {friendRequests.length === 1 ? 'request' : 'requests'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Friend Requests List */}
                <div className="max-h-96 overflow-y-auto">
                  {friendRequests.length === 0 ? (
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
                                onClick={() => handleReject(request.id)}
                                disabled={isProcessing}
                                className="flex items-center space-x-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <X className="h-4 w-4" />
                                <span>Decline</span>
                              </motion.button>
                              
                              <motion.button
                                onClick={() => handleAccept(request.id)}
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
                  )}
                </div>

                {/* Footer */}
                <div className="flex justify-end pt-6 border-t border-gray-200 mt-6">
                  <button
                    onClick={onClose}
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

export default FriendRequests