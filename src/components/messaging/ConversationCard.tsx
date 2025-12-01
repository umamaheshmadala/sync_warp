import React, { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { Badge } from '../ui/badge'
import { Pin, BellOff } from 'lucide-react'
import { useNewFriends } from '../../hooks/useNewFriends'
import { ConversationActionButtons } from './ConversationActionButtons'
import type { ConversationWithDetails } from '../../types/messaging'
import { cn } from '../../lib/utils'
import { formatConversationDate } from '../../utils/dateUtils'

interface ConversationCardProps {
  conversation: ConversationWithDetails
  onClick: (e?: React.MouseEvent) => void
  isActive?: boolean
  onLongPress?: (conversation: ConversationWithDetails) => void
  showActions?: boolean
  onUpdate?: () => void
}

export function ConversationCard({ 
  conversation, 
  onClick, 
  isActive = false,
  onLongPress,
  showActions = false,
  onUpdate
}: ConversationCardProps) {
  const {
    other_participant_name,
    other_participant_avatar,
    last_message_content,
    last_message_at,
    unread_count,
    participant1_id,
    participant2_id,
    is_pinned
  } = conversation

  const { friends } = useNewFriends()
  const [isHovered, setIsHovered] = useState(false)

  // Get friend's online status
  const friendProfile = React.useMemo(() => {
    return friends.find(f =>
      f.friend_profile.user_id === participant1_id ||
      f.friend_profile.user_id === participant2_id
    )?.friend_profile
  }, [friends, participant1_id, participant2_id])

  // Generate initials
  const initials = other_participant_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?'

  // Format time (e.g., "Nov 24" or "8:29 AM")
  const timeLabel = React.useMemo(() => {
    return formatConversationDate(last_message_at)
  }, [last_message_at])

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => onClick(e)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "flex items-start gap-3 p-3 hover:bg-gray-50 cursor-pointer transition-colors border-l-4 border-transparent relative",
        isActive && "bg-blue-50 border-l-green-700"
      )}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0 mt-1">
        <Avatar className="h-12 w-12">
          <AvatarImage 
            src={other_participant_avatar || undefined} 
            alt={other_participant_name || 'User'} 
          />
          <AvatarFallback className="bg-gray-200 text-gray-600 font-medium text-sm">
            {initials}
          </AvatarFallback>
        </Avatar>
        {/* Online indicator */}
        {friendProfile?.is_online && (
          <div
            className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500"
            title="Online"
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between mb-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <h3 className={cn(
              "text-sm font-semibold truncate",
              unread_count > 0 ? "text-gray-900" : "text-gray-900"
            )}>
              {other_participant_name || 'Unknown User'}
            </h3>
            {conversation.is_muted && (
              <div title="Muted">
                <BellOff className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              </div>
            )}
            {is_pinned && (
              <div title="Pinned">
                <Pin className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
              </div>
            )}
          </div>
          {last_message_at && (
            <span className={cn(
              "text-xs flex-shrink-0 ml-2",
              unread_count > 0 ? "text-gray-900 font-medium" : "text-gray-500"
            )}>
              {timeLabel}
            </span>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <p className={cn(
            "text-sm truncate pr-2",
            unread_count > 0 ? "text-gray-900 font-medium" : "text-gray-500"
          )}>
            {last_message_content || 'No messages yet'}
          </p>
          {unread_count > 0 && (
            <Badge 
              variant="default" 
              className="flex-shrink-0 bg-green-700 hover:bg-green-800 h-5 min-w-[20px] px-1.5 flex items-center justify-center"
            >
              {unread_count > 99 ? '99+' : unread_count}
            </Badge>
          )}
        </div>
      </div>

      {/* Action Buttons (Web Only - shown on hover) */}
      {showActions && isHovered && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <ConversationActionButtons
            conversation={conversation}
            onUpdate={onUpdate}
          />
        </div>
      )}
    </div>
  )
}
