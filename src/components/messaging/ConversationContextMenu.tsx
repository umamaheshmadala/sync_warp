import React from 'react'
import { Archive, Pin, Trash, ArchiveX, PinOff } from 'lucide-react'
import { conversationManagementService } from '../../services/conversationManagementService'
import { toast } from 'react-hot-toast'

interface Props {
  conversation: any
  onUpdate?: () => void
  onDelete?: () => void
  onClose: () => void
  position: { x: number; y: number }
}

export function ConversationContextMenu({
  conversation,
  onUpdate,
  onDelete,
  onClose,
  position
}: Props) {
  const handleArchive = async () => {
    try {
      if (conversation.is_archived) {
        await conversationManagementService.unarchiveConversation(conversation.id)
        toast.success('Conversation unarchived')
      } else {
        await conversationManagementService.archiveConversation(conversation.id)
        toast.success('Conversation archived')
      }
      onUpdate?.()
      onClose()
    } catch (error) {
      toast.error('Failed to archive conversation')
    }
  }

  const handlePin = async () => {
    try {
      if (conversation.is_pinned) {
        await conversationManagementService.unpinConversation(conversation.id)
        toast.success('Conversation unpinned')
      } else {
        await conversationManagementService.pinConversation(conversation.id)
        toast.success('Conversation pinned')
      }
      onUpdate?.()
      onClose()
    } catch (error) {
      toast.error('Failed to pin conversation')
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* Menu */}
      <div
        className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[180px]"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`
        }}
      >
        <button
          onClick={handlePin}
          className="flex items-center gap-3 w-full px-4 py-2 text-sm hover:bg-gray-50 text-left"
        >
          {conversation.is_pinned ? (
            <>
              <PinOff className="w-4 h-4 text-gray-600" />
              <span>Unpin conversation</span>
            </>
          ) : (
            <>
              <Pin className="w-4 h-4 text-blue-600" />
              <span>Pin conversation</span>
            </>
          )}
        </button>

        <button
          onClick={handleArchive}
          className="flex items-center gap-3 w-full px-4 py-2 text-sm hover:bg-gray-50 text-left"
        >
          {conversation.is_archived ? (
            <>
              <ArchiveX className="w-4 h-4 text-gray-600" />
              <span>Unarchive</span>
            </>
          ) : (
            <>
              <Archive className="w-4 h-4 text-gray-600" />
              <span>Archive</span>
            </>
          )}
        </button>

        <div className="border-t border-gray-200 my-1" />

        <button
          onClick={() => {
            onDelete?.()
            onClose()
          }}
          className="flex items-center gap-3 w-full px-4 py-2 text-sm hover:bg-red-50 text-red-600 text-left"
        >
          <Trash className="w-4 h-4" />
          <span>Delete conversation</span>
        </button>
      </div>
    </>
  )
}
