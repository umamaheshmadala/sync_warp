import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, MoreHorizontal, Video, Phone } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { Button } from '../ui/button'
import { useMessagingStore } from '../../store/messagingStore'
import { useNewFriends } from '../../hooks/useNewFriends'

interface ChatHeaderProps {
  conversationId: string
}

export function ChatHeader({ conversationId }: ChatHeaderProps) {
  const navigate = useNavigate()
  const conversations = useMessagingStore(state => state.conversations)
  const { friends } = useNewFriends()
  
  // Find the conversation
  const conversation = conversations.find(c => c.conversation_id === conversationId)
  
  if (!conversation) {
    return null
  }

  const { other_participant_name, other_participant_avatar, participant1_id, participant2_id } = conversation

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

  return (
    <div className="bg-white border-b px-3 py-2 flex items-center justify-between shadow-sm z-10">
      <div className="flex items-center gap-2">
        {/* Back Button (Mobile only) */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/messages')}
          className="md:hidden h-8 w-8 text-gray-600"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        {/* Avatar & Info */}
        <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded-lg transition-colors">
          <div className="relative">
            <Avatar className="h-8 w-8">
              <AvatarImage src={other_participant_avatar || undefined} />
              <AvatarFallback className="bg-blue-600 text-white text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            {friendProfile?.is_online && (
              <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-green-500" />
            )}
          </div>
          
          <div className="flex flex-col">
            <h2 className="text-sm font-semibold text-gray-900 leading-none">
              {other_participant_name || 'Unknown User'}
            </h2>
            <span className="text-xs text-gray-500 mt-0.5">
              {friendProfile?.is_online ? 'Active now' : 'View profile'}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-600">
          <Video className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-600">
          <Phone className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-600">
          <MoreHorizontal className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}
