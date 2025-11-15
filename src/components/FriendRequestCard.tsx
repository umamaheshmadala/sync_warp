// src/components/FriendRequestCard.tsx
// Reusable card component for displaying friend requests (Story 9.1.3)

import React from 'react'
import { motion } from 'framer-motion'
import { Check, X, Clock, User } from 'lucide-react'
import type { FriendRequest } from '../services/friendRequestService'

interface FriendRequestCardProps {
  request: FriendRequest
  onAccept?: (requestId: string) => void
  onReject?: (requestId: string) => void
  onCancel?: (requestId: string) => void
  isProcessing?: boolean
  variant?: 'received' | 'sent'
}

/**
 * Reusable card component for displaying a single friend request
 * Supports both received requests (with Accept/Reject) and sent requests (with Cancel)
 */
export const FriendRequestCard: React.FC<FriendRequestCardProps> = ({
  request,
  onAccept,
  onReject,
  onCancel,
  isProcessing = false,
  variant = 'received'
}) => {
  /**
   * Format time ago from timestamp
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

  /**
   * Calculate time until expiry
   */
  const getExpiryInfo = (expiresAt: string): { text: string; isUrgent: boolean } => {
    const expires = new Date(expiresAt)
    const now = new Date()
    const diffInMs = expires.getTime() - now.getTime()
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))

    if (diffInMs < 0) {
      return { text: 'Expired', isUrgent: true }
    }
    if (diffInDays < 1) {
      return { text: `Expires in ${diffInHours}h`, isUrgent: true }
    }
    if (diffInDays < 3) {
      return { text: `Expires in ${diffInDays} days`, isUrgent: true }
    }
    return { text: `Expires in ${diffInDays} days`, isUrgent: false }
  }

  const profile = variant === 'received' ? request.sender : request.receiver
  const expiryInfo = getExpiryInfo(request.expires_at)

  return (
    <motion.div
      className="p-4 bg-gray-50 rounded-xl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-1">
          {/* Avatar */}
          <div className="relative">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name}
                className="h-12 w-12 rounded-full object-cover"
              />
            ) : (
              <div className="h-12 w-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-lg">
                  {profile?.full_name?.charAt(0).toUpperCase() || '?'}
                </span>
              </div>
            )}
            {profile?.is_online && (
              <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-400 border-2 border-white rounded-full" />
            )}
          </div>
          
          {/* Info */}
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-gray-900 truncate">
              {profile?.full_name || 'Unknown User'}
            </h4>
            
            {/* Message (if present) */}
            {request.message && (
              <p className="text-sm text-gray-600 italic mt-1 line-clamp-2">
                "{request.message}"
              </p>
            )}
            
            {/* Metadata */}
            <div className="flex items-center space-x-3 mt-1">
              <div className="flex items-center text-sm text-gray-500">
                <Clock className="h-3 w-3 mr-1" />
                {formatTimeAgo(request.created_at)}
              </div>
              
              {profile?.city && (
                <div className="flex items-center text-sm text-gray-500">
                  <span>• {profile.city}</span>
                </div>
              )}
              
              {/* Expiry warning */}
              {expiryInfo.isUrgent && (
                <div className={`flex items-center text-xs px-2 py-0.5 rounded-full ${
                  expiryInfo.text === 'Expired' 
                    ? 'bg-red-100 text-red-700' 
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  <Clock className="h-3 w-3 mr-1" />
                  {expiryInfo.text}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end space-x-3 mt-4">
        {variant === 'received' && (onAccept || onReject) && (
          <>
            {onReject && (
              <motion.button
                onClick={() => onReject(request.id)}
                disabled={isProcessing}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <X className="h-4 w-4" />
                <span>Decline</span>
              </motion.button>
            )}
            
            {onAccept && (
              <motion.button
                onClick={() => onAccept(request.id)}
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
            )}
          </>
        )}

        {variant === 'sent' && onCancel && (
          <motion.button
            onClick={() => onCancel(request.id)}
            disabled={isProcessing}
            className="flex items-center space-x-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-700" />
                <span>Cancelling...</span>
              </>
            ) : (
              <>
                <X className="h-4 w-4" />
                <span>Cancel Request</span>
              </>
            )}
          </motion.button>
        )}
      </div>
    </motion.div>
  )
}

export default FriendRequestCard
