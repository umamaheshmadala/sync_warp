import React, { useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { conversationManagementService } from '../../services/conversationManagementService'
import { toast } from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useMessagingStore } from '../../store/messagingStore'
import { cn } from '../../lib/utils'

interface Props {
  conversationId: string
  conversationName: string
  onClose: () => void
  onDeleted: () => void
}

export function DeleteConversationDialog({
  conversationId,
  conversationName,
  onClose,
  onDeleted
}: Props) {
  const [isProcessing, setIsProcessing] = useState(false)

  const handleDelete = async () => {
    setIsProcessing(true)

    try {
      // Soft delete conversation
      await conversationManagementService.deleteConversation(conversationId)

      // Show undo toast with countdown
      showUndoToast(conversationId, conversationName, onDeleted)
      
      onDeleted()
      onClose()
    } catch (error: any) {
      console.error('Delete action failed:', error)
      
      // Log detailed error information
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        full: error
      })
      
      const errorMessage = error.message || 'Unknown error'
      toast.error(`Failed to delete conversation: ${errorMessage}`, { duration: 3000 })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        {/* Dialog */}
        <div 
          className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <h2 className="text-xl font-semibold">Delete Conversation?</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="mb-6">
            <p className="text-gray-600 mb-3">
              Are you sure you want to delete "{conversationName}"?
            </p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              <strong>Note:</strong> This will remove the conversation from your list. The other person can still see it. You can undo this action within 10 seconds.
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={isProcessing}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
            >
              {isProcessing ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
/**
 * Show undo toast with 5-second countdown
 */
function showUndoToast(
  conversationId: string,
  conversationName: string,
  onUpdate: () => void
) {
  let countdown = 5
  let intervalId: NodeJS.Timeout

  const toastId = toast.custom(
    (t) => (
      <div className={cn(
        'bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-4',
        t.visible ? 'animate-enter' : 'animate-leave'
      )}>
        <span>Conversation deleted</span>
        <button
          onClick={async () => {
            clearInterval(intervalId)
            try {
              // First, undo the deletion in the database
              await conversationManagementService.undoDeleteConversation(conversationId)
              
              // Then fetch the restored conversation and add it back to store
              console.log('🔄 Fetching restored conversation:', conversationId)
              
              const { data, error } = await supabase
                .from('conversation_list')
                .select('*')
                .eq('conversation_id', conversationId)
                .single()
              
              if (error) {
                console.error('❌ Failed to fetch restored conversation:', error)
                throw new Error(`Failed to fetch conversation: ${error.message}`)
              }
              
              if (data) {
                console.log('✅ Restored conversation fetched:', data)
                // Add it back to the store
                const currentConversations = useMessagingStore.getState().conversations
                const updatedConversations = [data, ...currentConversations]
                useMessagingStore.getState().setConversations(updatedConversations)
                console.log('✅ Conversation added back to store')
              }
              
              toast.dismiss(toastId)
              toast.success('Deletion undone', { duration: 3000 })
            } catch (error: any) {
              console.error('❌ Undo failed:', error)
              toast.dismiss(toastId)
              if (error.message?.includes('expired')) {
                toast.error('Undo window expired (5 seconds)', { duration: 3000 })
              } else {
                toast.error(`Failed to undo: ${error.message || 'Unknown error'}`, { duration: 3000 })
              }
            }
          }}
          className="px-3 py-1 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
        >
          Undo ({countdown}s)
        </button>
      </div>
    ),
    { duration: 5000 }
  )

  // Countdown timer
  intervalId = setInterval(() => {
    countdown--
    if (countdown <= 0) {
      clearInterval(intervalId)
      toast.dismiss(toastId)
    }
  }, 1000)
}
