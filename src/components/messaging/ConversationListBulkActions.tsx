import React, { useState } from 'react'
import { Archive, Pin, Trash, X } from 'lucide-react'
import { conversationManagementService } from '../../services/conversationManagementService'
import { toast } from 'react-hot-toast'

interface Props {
  selectedConversations: string[]
  onClearSelection: () => void
  onUpdate: () => void
}

export function ConversationListBulkActions({
  selectedConversations,
  onClearSelection,
  onUpdate
}: Props) {
  const [isProcessing, setIsProcessing] = useState(false)

  const handleBulkArchive = async () => {
    setIsProcessing(true)
    try {
      await Promise.all(
        selectedConversations.map(id =>
          conversationManagementService.archiveConversation(id)
        )
      )
      
      toast.success(`Archived ${selectedConversations.length} conversation${selectedConversations.length > 1 ? 's' : ''}`, {
        action: {
          label: 'Undo',
          onClick: async () => {
            await Promise.all(
              selectedConversations.map(id =>
                conversationManagementService.unarchiveConversation(id)
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
      console.error('Bulk archive failed:', error)
      toast.error('Failed to archive conversations')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBulkPin = async () => {
    setIsProcessing(true)
    try {
      await Promise.all(
        selectedConversations.map(id =>
          conversationManagementService.pinConversation(id)
        )
      )
      
      toast.success(`Pinned ${selectedConversations.length} conversation${selectedConversations.length > 1 ? 's' : ''}`, {
        action: {
          label: 'Undo',
          onClick: async () => {
            await Promise.all(
              selectedConversations.map(id =>
                conversationManagementService.unpinConversation(id)
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
      console.error('Bulk pin failed:', error)
      toast.error('Failed to pin conversations')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedConversations.length} conversation${selectedConversations.length > 1 ? 's' : ''}? This will archive them.`)) {
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

  if (selectedConversations.length === 0) return null

  return (
    <div className="sticky top-0 z-20 bg-blue-600 text-white px-4 py-3 flex items-center justify-between shadow-md">
      <div className="flex items-center gap-2">
        <button
          onClick={onClearSelection}
          className="p-1 hover:bg-blue-700 rounded transition-colors"
          aria-label="Clear selection"
        >
          <X className="w-5 h-5" />
        </button>
        <span className="font-medium">
          {selectedConversations.length} selected
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleBulkPin}
          disabled={isProcessing}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Pin selected conversations"
        >
          <Pin className="w-4 h-4" />
          Pin
        </button>

        <button
          onClick={handleBulkArchive}
          disabled={isProcessing}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Archive selected conversations"
        >
          <Archive className="w-4 h-4" />
          Archive
        </button>

        <button
          onClick={handleBulkDelete}
          disabled={isProcessing}
          className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Delete selected conversations"
        >
          <Trash className="w-4 h-4" />
          Delete
        </button>
      </div>
    </div>
  )
}
