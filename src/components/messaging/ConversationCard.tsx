import React, { useState, useMemo } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { Badge } from '../ui/badge'
import { formatDistanceToNow } from 'date-fns'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { Capacitor } from '@capacitor/core'
import { useNewFriends } from '../../hooks/useNewFriends'
import type { ConversationWithDetails } from '../../types/messaging'
import { cn } from '../../lib/utils'

interface ConversationCardProps {
  conversation: ConversationWithDetails
  onClick: () => void
  isActive?: boolean
  onLongPress?: (conversation: ConversationWithDetails) => void
}

/**
 * ConversationCard Component
 * 
 * Displays a conversation summary with:
 * - Participant avatar and name
 * - Last message preview
 * - Timestamp
 * - Unread message badge
 * - Mobile haptic feedback on tap
 * - Long-press context menu support
 * - Full accessibility support (Story 8.2.8)
 * 
 * Accessibility Features:
 * - role="button" for screen readers
 * - Descriptive ARIA label with unread count
 * - Keyboard navigation (Enter/Space)
 * - Focus indicators
 * - aria-pressed state
 * 
 * @example
 * ```tsx
 * <ConversationCard
 *   conversation={conversation}
 *   onClick={() => navigate(`/messages/${conversation.id}`)}
 *   isActive={activeId === conversation.id}
 *   onLongPress={(conv) => showContextMenu(conv)}
 * />
 * ```
 */
export function ConversationCard({ 
  conversation, 
  onClick, 
  isActive = false,
  onLongPress
}: ConversationCardProps) {
  const {
    other_participant_name,
    other_participant_avatar,
    last_message_content,
    last_message_at,
    unread_count,
    participant1_id,
    participant2_id
  } = conversation

  const { friends } = useNewFriends()
  const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null)

  // Get friend's online status
  const friendProfile = useMemo(() => {
    return friends.find(f =>
      f.friend_profile.user_id === participant1_id ||
      f.friend_profile.user_id === participant2_id
    )?.friend_profile
  }, [friends, participant1_id, participant2_id])

  // Generate initials from participant name
  const initials = other_participant_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?'

  // Handle tap with haptic feedback
  const handleClick = async () => {
    // Provide haptic feedback on mobile
    if (Capacitor.isNativePlatform()) {
      try {
        await Haptics.impact({ style: ImpactStyle.Light })
      } catch (error) {
        console.warn('Haptic feedback not available:', error)
      }
    }
    
    onClick()
  }

  // Keyboard navigation (Story 8.2.8)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }

  // Long-press for context menu (mobile)
  const handleTouchStart = () => {
    if (Capacitor.isNativePlatform() && onLongPress) {
      const timer = setTimeout(async () => {
        try {
          await Haptics.impact({ style: ImpactStyle.Medium })
          onLongPress(conversation)
        } catch (error) {
          console.warn('Haptic feedback not available:', error)
        }
      }, 500) // Long-press after 500ms
      
      setPressTimer(timer)
    }
  }

  const handleTouchEnd = () => {
    if (pressTimer) {
      clearTimeout(pressTimer)
      setPressTimer(null)
    }
  }

  // Generate descriptive ARIA label (Story 8.2.8)
  const unreadLabel = unread_count > 0
    ? `${unread_count} unread message${unread_count > 1 ? 's' : ''}`
    : 'No unread messages'
  
  const lastMessageLabel = last_message_content
    ? `Last message: ${last_message_content}`
    : 'No messages yet'
  
  const ariaLabel = `Conversation with ${other_participant_name || 'Unknown User'}. ${unreadLabel}. ${lastMessageLabel}`

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      aria-label={ariaLabel}
      aria-pressed={isActive}
      className={cn(
        "flex items-center gap-3 p-4 hover:bg-gray-50 cursor-pointer transition-colors border-b",
        "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset",
        isActive && "bg-blue-50 hover:bg-blue-100",
        "active:bg-gray-100" // Active state for tap feedback
      )}
    >
      {/* Avatar with online status */}
      <div className="relative flex-shrink-0">
        <Avatar className="h-12 w-12">
          <AvatarImage 
            src={other_participant_avatar || undefined} 
            alt={other_participant_name || 'User'} 
          />
          <AvatarFallback className="bg-blue-500 text-white font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        {/* Online indicator */}
        {friendProfile && (
          <div
            className={cn(
              "absolute -bottom-0 -right-0 h-3 w-3 rounded-full border-2 border-white",
              friendProfile.is_online ? "bg-green-400" : "bg-gray-400"
            )}
            title={friendProfile.is_online ? "Online" : "Offline"}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h3 className={cn(
            "font-semibold truncate",
            unread_count > 0 ? "text-gray-900" : "text-gray-700"
          )}>
            {other_participant_name || 'Unknown User'}
          </h3>
          {last_message_at && (
            <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
              {formatDistanceToNow(new Date(last_message_at), { addSuffix: true })}
            </span>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <p className={cn(
            "text-sm truncate",
            unread_count > 0 ? "text-gray-900 font-medium" : "text-gray-600"
          )}>
            {last_message_content || 'No messages yet'}
          </p>
          {unread_count > 0 && (
            <Badge 
              variant="default" 
              className="ml-2 flex-shrink-0 bg-blue-600 hover:bg-blue-700"
            >
              {unread_count > 99 ? '99+' : unread_count}
            </Badge>
          )}
        </div>
      </div>
    </div>
  )
}
