import React from 'react'
import { Archive, Pin, MoreVertical, ArchiveX, PinOff } from 'lucide-react'
import { conversationManagementService } from '../../services/conversationManagementService'
import { useMessagingStore } from '../../store/messagingStore'
import { toast } from 'react-hot-toast'
import { cn } from '../../lib/utils'

interface Props {
  conversation: any
  onUpdate?: () => void
  className?: string
}

export function ConversationActionButtons({ conversation, onUpdate, className }: Props) {
  const [showActions, setShowActions] = React.useState(false)
  const { togglePinOptimistic, toggleArchiveOptimistic } = useMessagingStore()

  const handleArchive = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('🔘 Archive button clicked')
    try {
      if (conversation.is_archived) {
        toggleArchiveOptimistic(conversation.conversation_id)
        await conversationManagementService.unarchiveConversation(conversation.conversation_id)
        toast.success('Conversation unarchived')
      } else {
        toggleArchiveOptimistic(conversation.conversation_id)
        await conversationManagementService.archiveConversation(conversation.conversation_id)
        toast.success('Conversation archived', {
          action: {
            label: 'Undo',
            onClick: async () => {
              await conversationManagementService.unarchiveConversation(conversation.conversation_id)
              toast.success('Undo successful')
              onUpdate?.()
            }
          }
        })
      }
      onUpdate?.()
    } catch (error) {
      console.error('Archive action failed:', error)
      toast.error('Failed to archive conversation')
    }
  }

  const handlePin = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('🔘 Pin button clicked')
    try {
      if (conversation.is_pinned) {
        togglePinOptimistic(conversation.conversation_id)
        await conversationManagementService.unpinConversation(conversation.conversation_id)
        toast.success('Conversation unpinned')
      } else {
        togglePinOptimistic(conversation.conversation_id)
        await conversationManagementService.pinConversation(conversation.conversation_id)
        toast.success('Conversation pinned', {
          action: {
            label: 'Undo',
            onClick: async () => {
              await conversationManagementService.unpinConversation(conversation.conversation_id)
              toast.success('Undo successful')
              onUpdate?.()
            }
          }
        })
      }
      onUpdate?.()
    } catch (error) {
      console.error('Pin action failed:', error)
      toast.error('Failed to pin conversation')
    }
  }

  return (
    <div 
      className={cn('flex items-center gap-1', className)}
      onClick={(e) => e.stopPropagation()} // Prevent parent card onClick
    >
      {/* Pin Button */}
      <button
        onClick={handlePin}
        className={cn(
          'p-1.5 rounded-md transition-colors',
          conversation.is_pinned
            ? 'text-blue-600 hover:bg-blue-50'
            : 'text-gray-500 hover:bg-gray-100'
        )}
        title={conversation.is_pinned ? 'Unpin conversation' : 'Pin conversation'}
        aria-label={conversation.is_pinned ? 'Unpin conversation' : 'Pin conversation'}
      >
        {conversation.is_pinned ? (
          <PinOff className="w-4 h-4" />
        ) : (
          <Pin className="w-4 h-4" />
        )}
      </button>

      {/* Archive Button */}
      <button
        onClick={handleArchive}
        className={cn(
          'p-1.5 rounded-md transition-colors',
          conversation.is_archived
            ? 'text-gray-600 hover:bg-gray-100'
            : 'text-gray-500 hover:bg-gray-100'
        )}
        title={conversation.is_archived ? 'Unarchive conversation' : 'Archive conversation'}
        aria-label={conversation.is_archived ? 'Unarchive conversation' : 'Archive conversation'}
      >
        {conversation.is_archived ? (
          <ArchiveX className="w-4 h-4" />
        ) : (
          <Archive className="w-4 h-4" />
        )}
      </button>
    </div>
  )
}
