import React from 'react'
import { useNavigate } from 'react-router-dom'

import { ArrowLeft, MoreVertical, Video, Phone, Trash, Archive, Pin, MessageSquare, CheckCircle, ArchiveX, PinOff, AlertCircle } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { Button } from '../ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { useMessagingStore } from '../../store/messagingStore'
import { useNewFriends } from '../../hooks/useNewFriends'
import { conversationManagementService } from '../../services/conversationManagementService'
import { toast } from 'react-hot-toast'

interface ChatHeaderProps {
  conversationId: string
}

export function ChatHeader({ conversationId }: ChatHeaderProps) {
  const navigate = useNavigate()
  const { conversations, togglePinOptimistic, toggleArchiveOptimistic } = useMessagingStore()
  const { friends } = useNewFriends()
  
  // Find the conversation
  const conversation = conversations.find(c => c.conversation_id === conversationId)
  
  // Get friend's online status - MUST be called before any early returns
  const friendProfile = React.useMemo(() => {
    if (!conversation) return null
    return friends.find(f =>
      f.friend_profile.user_id === conversation.participant1_id ||
      f.friend_profile.user_id === conversation.participant2_id
    )?.friend_profile
  }, [friends, conversation])

  // Early return AFTER all hooks
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

  const handleAction = async (action: string) => {
    try {
      switch (action) {
        case 'pin':
          togglePinOptimistic(conversationId)
          if (conversation.is_pinned) {
            await conversationManagementService.unpinConversation(conversationId)
            toast.success('Conversation unpinned')
          } else {
            await conversationManagementService.pinConversation(conversationId)
            toast.success('Conversation pinned')
          }
          break
          
        case 'archive':
          toggleArchiveOptimistic(conversationId)
          if (conversation.is_archived) {
            await conversationManagementService.unarchiveConversation(conversationId)
            toast.success('Conversation unarchived')
          } else {
            await conversationManagementService.archiveConversation(conversationId)
            toast.success('Conversation archived')
            navigate('/messages')
          }
          break

        case 'mark_unread':
          await conversationManagementService.markConversationAsUnread(conversationId)
          toast.success('Marked as unread')
          navigate('/messages')
          break

        case 'clear_chat':
          if (window.confirm('Are you sure you want to clear all messages? This cannot be undone.')) {
            await conversationManagementService.clearConversationMessages(conversationId)
            toast.success('Chat cleared')
          }
          break

        case 'delete':
          if (window.confirm('Are you sure you want to delete this conversation? This cannot be undone.')) {
            await conversationManagementService.deleteConversation(conversationId)
            toast.success('Conversation deleted')
            navigate('/messages')
          }
          break
      }
    } catch (error) {
      console.error('Action failed:', error)
      toast.error('Action failed')
    }
  }

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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-600">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Chat Options</DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            <DropdownMenuItem onClick={() => handleAction('pin')}>
              {conversation.is_pinned ? (
                <>
                  <PinOff className="mr-2 h-4 w-4" />
                  <span>Unpin</span>
                </>
              ) : (
                <>
                  <Pin className="mr-2 h-4 w-4" />
                  <span>Pin</span>
                </>
              )}
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => handleAction('archive')}>
              {conversation.is_archived ? (
                <>
                  <ArchiveX className="mr-2 h-4 w-4" />
                  <span>Unarchive</span>
                </>
              ) : (
                <>
                  <Archive className="mr-2 h-4 w-4" />
                  <span>Archive</span>
                </>
              )}
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => handleAction('mark_unread')}>
              <AlertCircle className="mr-2 h-4 w-4" />
              <span>Mark as unread</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={() => handleAction('clear_chat')} className="text-red-600 focus:text-red-600">
              <MessageSquare className="mr-2 h-4 w-4" />
              <span>Clear chat</span>
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => handleAction('delete')} className="text-red-600 focus:text-red-600">
              <Trash className="mr-2 h-4 w-4" />
              <span>Delete conversation</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
