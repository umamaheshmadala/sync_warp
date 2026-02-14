import React, { useState } from 'react'
import { Archive, ArchiveRestore, Pin, PinOff, Trash, X } from 'lucide-react'
import { cn } from '../../lib/utils'
import { conversationManagementService } from '../../services/conversationManagementService'
import { useMessagingStore } from '../../store/messagingStore'
import { toast } from 'react-hot-toast'

interface Props {
  selectedConversations: string[]
  selectionMode: boolean
  onClearSelection: () => void
  onUpdate: () => void
}

export function ConversationListBulkActions({
  selectedConversations,
  selectionMode,
  onClearSelection,
  onUpdate
}: Props) {
  const [isProcessing, setIsProcessing] = useState(false)
  const { conversations, togglePinOptimistic, toggleArchiveOptimistic } = useMessagingStore()

  // Check if all selected conversations are already pinned
  const allPinned = selectedConversations.length > 0 && selectedConversations.every(id =>
    conversations.find(c => c.conversation_id === id)?.is_pinned
  )

  // Check if all selected conversations are already archived
  const allArchived = selectedConversations.length > 0 && selectedConversations.every(id =>
    conversations.find(c => c.conversation_id === id)?.is_archived
  )

  const handleBulkArchive = async () => {
    setIsProcessing(true)
    const action = allArchived ? 'unarchive' : 'archive'

    try {
      await Promise.all(
        selectedConversations.map(id => {
          const conversation = conversations.find(c => c.conversation_id === id)
          if (!conversation) return Promise.resolve()

          // Optimistic update
          if ((action === 'archive' && !conversation.is_archived) || (action === 'unarchive' && conversation.is_archived)) {
            toggleArchiveOptimistic(id)
          }

          return action === 'archive'
            ? conversationManagementService.archiveConversation(id)
            : conversationManagementService.unarchiveConversation(id)
        })
      )

      const successMessage = action === 'archive'
        ? `Archived ${selectedConversations.length} conversation${selectedConversations.length > 1 ? 's' : ''}`
        : `Unarchived ${selectedConversations.length} conversation${selectedConversations.length > 1 ? 's' : ''}`

      toast.success(successMessage, {
        action: {
          label: 'Undo',
          onClick: async () => {
            await Promise.all(
              selectedConversations.map(id =>
                action === 'archive'
                  ? conversationManagementService.unarchiveConversation(id)
                  : conversationManagementService.archiveConversation(id)
              )
            )
            toast.success('Undo successful')
            onUpdate()
          }
        }
      })

      onUpdate()
      onClearSelection()
    } catch (error) {
      console.error(`Bulk ${action} failed:`, error)
      toast.error(`Failed to ${action} conversations`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleTogglePin = async () => {
    setIsProcessing(true)
    const action = allPinned ? 'unpin' : 'pin'

    try {
      await Promise.all(
        selectedConversations.map(id => {
          // Only update if state matches intended action (to avoid flipping correctly set ones in mixed selection)
          // Actually, standard behavior for "Pin" on mixed selection is to Pin ALL.
          // For "Unpin" (only if all pinned), it Unpins ALL.

          const conversation = conversations.find(c => c.conversation_id === id)
          if (!conversation) return Promise.resolve()

          // If we are pinning, and it's already pinned, skip API call but maybe ensure store is correct? 
          // Pinning an already pinned item is idempotent usually.
          // Unpinning an unpinned item is also safe.

          // Optimistic update
          if ((action === 'pin' && !conversation.is_pinned) || (action === 'unpin' && conversation.is_pinned)) {
            togglePinOptimistic(id)
          }

          return action === 'pin'
            ? conversationManagementService.pinConversation(id)
            : conversationManagementService.unpinConversation(id)
        })
      )

      const successMessage = action === 'pin'
        ? `Pinned ${selectedConversations.length} conversation${selectedConversations.length > 1 ? 's' : ''}`
        : `Unpinned ${selectedConversations.length} conversation${selectedConversations.length > 1 ? 's' : ''}`

      toast.success(successMessage, {
        action: {
          label: 'Undo',
          onClick: async () => {
            await Promise.all(
              selectedConversations.map(id =>
                action === 'pin'
                  ? conversationManagementService.unpinConversation(id)
                  : conversationManagementService.pinConversation(id)
              )
            )
            toast.success('Undo successful')
            onUpdate()
          }
        }
      })

      onUpdate()
      onClearSelection()
    } catch (error) {
      console.error(`Bulk ${action} failed:`, error)
      toast.error(`Failed to ${action} conversations`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBulkDelete = async () => {
    console.log('🗑️ Bulk delete clicked')
    const confirmed = window.confirm(`Delete ${selectedConversations.length} conversation${selectedConversations.length > 1 ? 's' : ''}? This action cannot be undone.`)
    console.log('  - Confirmed:', confirmed)
    if (!confirmed) {
      return
    }

    setIsProcessing(true)
    try {
      await Promise.all(
        selectedConversations.map(id =>
          conversationManagementService.deleteConversation(id)
        )
      )

      toast.success(`Deleted ${selectedConversations.length} conversation${selectedConversations.length > 1 ? 's' : ''}`)
      onUpdate()
      onClearSelection()
    } catch (error) {
      console.error('Bulk delete failed:', error)
      toast.error('Failed to delete conversations')
    } finally {
      setIsProcessing(false)
    }
  }

  // Show bar in selection mode even with 0 items (for cancel button)
  if (!selectionMode) return null

  return (
    <div className="bg-blue-600 text-white px-4 py-3 flex items-center shadow-md border-b border-blue-700">
      <button
        onClick={onClearSelection}
        className="p-1 hover:bg-blue-700 rounded transition-colors flex-none"
        aria-label="Clear selection"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="flex-1 flex items-center justify-center gap-6">
        <button
          onClick={handleTogglePin}
          disabled={isProcessing || selectedConversations.length === 0}
          className="p-3 bg-blue-700 hover:bg-blue-800 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          aria-label={allPinned ? "Unpin selected conversations" : "Pin selected conversations"}
          title={allPinned ? "Unpin selected conversations" : "Pin selected conversations"}
        >
          {allPinned ? <PinOff className="w-5 h-5" /> : <Pin className="w-5 h-5" />}
        </button>

        <button
          onClick={handleBulkArchive}
          disabled={isProcessing || selectedConversations.length === 0}
          className="p-3 bg-blue-700 hover:bg-blue-800 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          aria-label={allArchived ? "Unarchive selected conversations" : "Archive selected conversations"}
          title={allArchived ? "Unarchive selected conversations" : "Archive selected conversations"}
        >
          {allArchived ? <ArchiveRestore className="w-5 h-5" /> : <Archive className="w-5 h-5" />}
        </button>

        <button
          onClick={handleBulkDelete}
          disabled={isProcessing || selectedConversations.length === 0}
          className="p-3 bg-red-600 hover:bg-red-700 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          aria-label="Delete selected conversations"
          title="Delete selected conversations"
        >
          <Trash className="w-5 h-5" />
        </button>
      </div>

      {/* Spacer to balance the X button on the left if we want true absolute center, 
          but usually just taking up space is enough. 
          To make it perfectly centered visually, we can add a ghost element or absolute positioning.
          Flex-1 with justify-center works well enough usually. */}
      <div className="w-7"></div>
    </div>
  )
}
