import React, { useState } from 'react'
import { Eraser, X, AlertTriangle } from 'lucide-react'
import { conversationManagementService } from '../../services/conversationManagementService'
import { toast } from 'react-hot-toast'

interface Props {
  conversationId: string
  conversationName: string
  onClose: () => void
  onCleared: () => void
}

export function ClearChatDialog({
  conversationId,
  conversationName,
  onClose,
  onCleared
}: Props) {
  const [isProcessing, setIsProcessing] = useState(false)

  const handleClear = async () => {
    setIsProcessing(true)

    try {
      await conversationManagementService.clearConversationMessages(conversationId)
      toast.success('Chat history cleared', { duration: 3000 })
      
      onCleared()
      onClose()
    } catch (error: any) {
      console.error('Clear chat failed:', error)
      
      const errorMessage = error.message || 'Unknown error'
      toast.error(`Failed to clear history: ${errorMessage}`, { duration: 3000 })
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
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <Eraser className="w-6 h-6 text-orange-600" />
              </div>
              <h2 className="text-xl font-semibold">Clear Chat History?</h2>
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
              This will permanently delete all messages in "{conversationName}".
            </p>
            
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-orange-800">
                <strong>This action cannot be undone.</strong> The conversation will remain, but all messages will be permanently deleted.
              </div>
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
              onClick={handleClear}
              disabled={isProcessing}
              className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50"
            >
              {isProcessing ? 'Clearing...' : 'Clear History'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
