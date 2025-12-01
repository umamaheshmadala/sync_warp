import { ActionSheet, ActionSheetButtonStyle } from '@capacitor/action-sheet'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { conversationManagementService } from '../../services/conversationManagementService'
import { toast } from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useMessagingStore } from '../../store/messagingStore'

interface DeleteConversationSheetOptions {
  conversationId: string
  conversationName: string
  onDeleted: () => void
}

/**
 * Show native action sheet for deleting or clearing a conversation (Mobile only)
 */
export async function showDeleteConversationSheet({
  conversationId,
  conversationName,
  onDeleted
}: DeleteConversationSheetOptions) {
  // Trigger haptic feedback
  await Haptics.impact({ style: ImpactStyle.Medium })

  const result = await ActionSheet.showActions({
    title: `Delete "${conversationName}"?`,
    message: 'Choose an option',
    options: [
      {
        title: 'Delete Conversation',
        style: ActionSheetButtonStyle.Destructive,
      },
      {
        title: 'Clear Chat History',
        style: ActionSheetButtonStyle.Destructive,
      },
      {
        title: 'Cancel',
        style: ActionSheetButtonStyle.Cancel,
      },
    ],
  })

  try {
    if (result.index === 0) {
      // Delete conversation
      await conversationManagementService.deleteConversation(conversationId)

      // Remove from store instantly
      const currentConversations = useMessagingStore.getState().conversations
      const updatedConversations = currentConversations.filter(
        (c) => c.conversation_id !== conversationId
      )
      useMessagingStore.getState().setConversations(updatedConversations)

      // Show undo toast with countdown
      showUndoToast(conversationId, conversationName, onDeleted)

      onDeleted()

    } else if (result.index === 1) {
      // Clear chat history
      await conversationManagementService.clearConversationMessages(conversationId)
      
      // Haptic feedback for success
      await Haptics.impact({ style: ImpactStyle.Light })
      
      toast.success('Chat history cleared', { duration: 3000 })
      onDeleted()
    }
  } catch (error: any) {
    console.error('Delete action failed:', error)
    toast.error(`Action failed: ${error.message || 'Unknown error'}`, { duration: 3000 })
  }
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
              
              // Haptic feedback for success
              await Haptics.impact({ style: ImpactStyle.Light })
              
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

// Helper for class names
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}
