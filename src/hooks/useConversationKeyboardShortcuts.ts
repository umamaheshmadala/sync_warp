import { useEffect } from 'react'
import { conversationManagementService } from '../services/conversationManagementService'
import { toast } from 'react-hot-toast'

export function useConversationKeyboardShortcuts(
  selectedConversationId: string | null,
  onUpdate: () => void
) {
  useEffect(() => {
    const handleKeyPress = async (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      // Require a selected conversation
      if (!selectedConversationId) return

      try {
        switch (e.key.toLowerCase()) {
          case 'a':
            // Archive
            e.preventDefault()
            await conversationManagementService.archiveConversation(
              selectedConversationId
            )
            toast.success('Conversation archived', {
              action: {
                label: 'Undo',
                onClick: async () => {
                  await conversationManagementService.unarchiveConversation(
                    selectedConversationId
                  )
                  toast.success('Undo successful')
                  onUpdate()
                }
              }
            })
            onUpdate()
            break

          case 'p':
            // Pin
            e.preventDefault()
            await conversationManagementService.pinConversation(
              selectedConversationId
            )
            toast.success('Conversation pinned', {
              action: {
                label: 'Undo',
                onClick: async () => {
                  await conversationManagementService.unpinConversation(
                    selectedConversationId
                  )
                  toast.success('Undo successful')
                  onUpdate()
                }
              }
            })
            onUpdate()
            break

          case 'u':
            // Unarchive
            e.preventDefault()
            await conversationManagementService.unarchiveConversation(
              selectedConversationId
            )
            toast.success('Conversation unarchived')
            onUpdate()
            break

          case 'delete':
          case 'backspace':
            if (e.ctrlKey || e.metaKey) {
              // Delete conversation (Ctrl/Cmd + Delete/Backspace)
              e.preventDefault()
              if (confirm('Delete this conversation? This will archive it.')) {
                await conversationManagementService.deleteConversation(
                  selectedConversationId
                )
                toast.success('Conversation deleted')
                onUpdate()
              }
            }
            break
        }
      } catch (error) {
        console.error('Keyboard shortcut failed:', error)
        toast.error('Action failed')
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [selectedConversationId, onUpdate])
}
