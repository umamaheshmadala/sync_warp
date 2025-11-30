import React, { useState } from 'react'
import { Archive, Pin, Trash, X } from 'lucide-react'
import { conversationManagementService } from '../../services/conversationManagementService'
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
    <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between shadow-md border-b border-blue-700">
      <div className="flex items-center gap-2">
        <button
          onClick={onClearSelection}
          className="p-1 hover:bg-blue-700 rounded transition-colors"
          aria-label="Clear selection"
        >
          <X className="w-5 h-5" />
        </button>
        <span className="font-medium">
          {selectedConversations.length > 0 ? `${selectedConversations.length} selected` : 'Select conversations'}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleBulkPin}
          disabled={isProcessing || selectedConversations.length === 0}
          className="p-2 bg-blue-700 hover:bg-blue-800 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Pin selected conversations"
          title="Pin selected conversations"
        >
          <Pin className="w-4 h-4" />
        </button>

        <button
          onClick={handleBulkArchive}
          disabled={isProcessing || selectedConversations.length === 0}
          className="p-2 bg-blue-700 hover:bg-blue-800 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Archive selected conversations"
          title="Archive selected conversations"
        >
          <Archive className="w-4 h-4" />
        </button>

        <button
          onClick={handleBulkDelete}
          disabled={isProcessing || selectedConversations.length === 0}
          className="p-2 bg-red-600 hover:bg-red-700 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Delete selected conversations"
          title="Delete selected conversations"
        >
          <Trash className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
