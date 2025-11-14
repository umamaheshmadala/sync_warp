import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, MoreVertical } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { useMessagingStore } from '../../store/messagingStore'

interface ChatHeaderProps {
  conversationId: string
}

/**
 * ChatHeader Component
 * 
 * Header bar for chat screen with:
 * - Back button
 * - Participant avatar and name
 * - Online status (future enhancement)
 * - More options button (future enhancement)
 * 
 * @example
 * ```tsx
 * <ChatHeader conversationId={conversationId} />
 * ```
 */
export function ChatHeader({ conversationId }: ChatHeaderProps) {
  const navigate = useNavigate()
  const conversations = useMessagingStore(state => state.conversations)
  
  // Find the conversation
  const conversation = conversations.find(c => c.conversation_id === conversationId)
  
  if (!conversation) {
    return null
  }

  const { other_participant_name, other_participant_avatar } = conversation

  // Generate initials
  const initials = other_participant_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?'

  return (
    <div className="bg-white border-b px-4 py-3 safe-area-top flex items-center gap-3">
      {/* Back Button */}
      <button
        onClick={() => navigate('/messages')}
        className="p-2 hover:bg-gray-100 rounded-full transition-colors -ml-2"
        aria-label="Back to conversations"
      >
        <ArrowLeft className="h-5 w-5 text-gray-700" />
      </button>

      {/* Avatar */}
      <Avatar className="h-10 w-10 flex-shrink-0">
        <AvatarImage 
          src={other_participant_avatar || undefined} 
          alt={other_participant_name || 'User'} 
        />
        <AvatarFallback className="bg-blue-500 text-white font-semibold text-sm">
          {initials}
        </AvatarFallback>
      </Avatar>

      {/* Participant Info */}
      <div className="flex-1 min-w-0">
        <h2 className="font-semibold text-gray-900 truncate">
          {other_participant_name || 'Unknown User'}
        </h2>
        {/* TODO: Add online status when presence system is implemented */}
        {/* <p className="text-xs text-gray-500">Online</p> */}
      </div>

      {/* More Options (future enhancement) */}
      <button
        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        aria-label="More options"
        onClick={() => {
          // TODO: Implement options menu (mute, block, report, etc.)
          console.log('More options clicked')
        }}
      >
        <MoreVertical className="h-5 w-5 text-gray-700" />
      </button>
    </div>
  )
}
