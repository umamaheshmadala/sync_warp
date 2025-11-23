// src/components/FriendRequests.tsx
import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, X } from 'lucide-react'
import { useReceivedFriendRequests, useAcceptFriendRequest, useRejectFriendRequest } from '../hooks/useFriendRequests'
import { useHapticFeedback } from '../hooks/useHapticFeedback'
import FriendRequestCard from './FriendRequestCard'
import { NoRequestsEmptyState } from './friends/EmptyStates'
import { toast } from 'react-hot-toast'

interface FriendRequestsProps {
  isOpen: boolean
  onClose: () => void
}

const FriendRequests: React.FC<FriendRequestsProps> = ({ isOpen, onClose }) => {
  const { receivedRequests, isLoading } = useReceivedFriendRequests()
  const acceptRequest = useAcceptFriendRequest()
  const rejectRequest = useRejectFriendRequest()
  const { triggerHaptic } = useHapticFeedback()
  const [processingRequest, setProcessingRequest] = useState<Set<string>>(new Set())

  // Only log when component opens/closes, not on every render
  React.useEffect(() => {
    if (isOpen) {
      console.log('FriendRequests opened with requests:', receivedRequests.length)
    }
  }, [isOpen, receivedRequests.length])

  /**
   * Accept friend request
   */
  const handleAccept = (requestId: string) => {
    setProcessingRequest(prev => new Set(prev).add(requestId))

    acceptRequest.mutate(requestId, {
      onSuccess: (result) => {
        if (result.success) {
          triggerHaptic('success')
          toast.success('Friend request accepted!')
        } else {
          triggerHaptic('error')
          toast.error(result.error || 'Failed to accept request')
        }
        setProcessingRequest(prev => {
          const next = new Set(prev)
          next.delete(requestId)
          return next
        })
      },
      onError: (error) => {
        console.error('Error accepting friend request:', error)
        triggerHaptic('error')
        toast.error('Failed to accept friend request')
        setProcessingRequest(prev => {
          const next = new Set(prev)
          next.delete(requestId)
          return next
        })
      }
    })
  }

  /**
   * Reject friend request
   */
  const handleReject = (requestId: string) => {
    setProcessingRequest(prev => new Set(prev).add(requestId))

    rejectRequest.mutate(requestId, {
      onSuccess: (result) => {
        if (result.success) {
          triggerHaptic('light')
          toast.success('Friend request declined')
        } else {
          triggerHaptic('error')
          toast.error(result.error || 'Failed to decline request')
        }
        setProcessingRequest(prev => {
          const next = new Set(prev)
          next.delete(requestId)
          return next
        })
      },
      onError: (error) => {
        console.error('Error rejecting friend request:', error)
        triggerHaptic('error')
        toast.error('Failed to decline friend request')
        setProcessingRequest(prev => {
          const next = new Set(prev)
          next.delete(requestId)
          return next
        })
      }
    })
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
                        {receivedRequests.length} pending {receivedRequests.length === 1 ? 'request' : 'requests'}
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
                  {isLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" />
                      <p className="mt-4 text-gray-600">Loading requests...</p>
                    </div>
                  ) : receivedRequests.length === 0 ? (
                    <NoRequestsEmptyState />
                  ) : (
                    <div className="space-y-4">
                      {receivedRequests.map((request) => (
                        <FriendRequestCard
                          key={request.id}
                          request={request}
                          onAccept={handleAccept}
                          onReject={handleReject}
                          isProcessing={processingRequest.has(request.id)}
                          variant="received"
                        />
                      ))}
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