import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'

import { ArrowLeft, MoreVertical, Video, Phone, Trash, Archive, Pin, MessageSquare, CheckCircle, ArchiveX, PinOff, AlertCircle, BellOff, Bell, Search } from 'lucide-react'
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
import { DeleteConversationDialog } from './DeleteConversationDialog'
import { ClearChatDialog } from './ClearChatDialog'
import { MuteConversationDialog } from './MuteConversationDialog'
import { FriendProfileModal } from '../friends/FriendProfileModal'
import { showDeleteConversationSheet } from './DeleteConversationSheet'
import { toast } from 'react-hot-toast'

interface ChatHeaderProps {
  conversationId: string
  onSearchClick?: () => void
}

export function ChatHeader({ conversationId, onSearchClick }: ChatHeaderProps) {
  const navigate = useNavigate()
  const { conversations, togglePinOptimistic, toggleArchiveOptimistic } = useMessagingStore()
  const { friends } = useNewFriends()
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)
  const [showClearDialog, setShowClearDialog] = React.useState(false)
  const [showMuteDialog, setShowMuteDialog] = React.useState(false)
  const [showProfileModal, setShowProfileModal] = React.useState(false)
  
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
  
  // Get friend ID for modal
  const friendId = React.useMemo(() => {
    if (!conversation) return null
    const userId = useMessagingStore.getState().userId
    const isParticipant1 = userId === conversation.participant1_id
    return isParticipant1 ? conversation.participant2_id : conversation.participant1_id
  }, [conversation])

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
            toast.success('Conversation unpinned', { duration: 3000 })
          } else {
            await conversationManagementService.pinConversation(conversationId)
            toast.success('Conversation pinned', { duration: 3000 })
          }
          break
          
        case 'archive':
          toggleArchiveOptimistic(conversationId)
          if (conversation.is_archived) {
            await conversationManagementService.unarchiveConversation(conversationId)
            toast.success('Conversation unarchived', { duration: 3000 })
          } else {
            await conversationManagementService.archiveConversation(conversationId)
            toast.success('Conversation archived', { duration: 3000 })
            navigate('/messages')
          }
          break
          
        case 'mark_unread':
          await conversationManagementService.markConversationAsUnread(conversationId)
          toast.success('Marked as unread')
          navigate('/messages')
          break

        case 'clear_chat':
          // Use native action sheet on mobile, dialog on web
          if (Capacitor.isNativePlatform()) {
            showDeleteConversationSheet({
              conversationId,
              conversationName: other_participant_name || 'Unknown User',
              onDeleted: () => {
                // Navigate back to messages list
                navigate('/messages')
              }
            })
          } else {
            setShowClearDialog(true)
          }
          break

        case 'delete':
          // Use native action sheet on mobile, dialog on web
          if (Capacitor.isNativePlatform()) {
            showDeleteConversationSheet({
              conversationId,
              conversationName: other_participant_name || 'Unknown User',
              onDeleted: handleDeleted
            })
          } else {
            setShowDeleteDialog(true)
          }
          break

        case 'mute':
          setShowMuteDialog(true)
          break
      }
    } catch (error) {
      console.error('Action failed:', error)
      toast.error('Action failed')
    }
  }

  const handleDialogClose = () => {
    setShowDeleteDialog(false)
  }

  const handleClearDialogClose = () => {
    setShowClearDialog(false)
  }

  const handleDeleted = () => {
    // Remove deleted conversation from store for instant UI update
    const updatedConversations = conversations.filter(
      (c) => c.conversation_id !== conversationId
    )
    useMessagingStore.getState().setConversations(updatedConversations)
    
    // Navigate back to list
    navigate('/messages')
  }

  const handleCleared = () => {
    // Messages are cleared, conversation remains
    // No need to navigate, just show success
  }

  return (
    <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between px-3 py-2">
        {/* Left section */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/messages')}
            className="text-gray-600 hover:text-gray-900 flex-shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          {/* Avatar + Name */}
          <div 
            className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setShowProfileModal(true)}
          >
            <div className="relative flex-shrink-0">
              <Avatar className="h-8 w-8">
                <AvatarImage src={other_participant_avatar || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs">
                  {other_participant_name?.substring(0, 2).toUpperCase()}
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
              <span className="text-xs text-blue-600 mt-0.5 hover:underline">
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

            <DropdownMenuItem onClick={() => {
              if (onSearchClick) {
                onSearchClick()
              } else {
                console.warn('Search handler not implemented')
              }
            }}>
              <Search className="mr-2 h-4 w-4" />
              <span>Search</span>
            </DropdownMenuItem>
            
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

            <DropdownMenuItem onClick={() => handleAction('mute')}>
              {conversation.is_muted ? (
                <>
                  <Bell className="mr-2 h-4 w-4" />
                  <span>Unmute</span>
                </>
              ) : (
                <>
                  <BellOff className="mr-2 h-4 w-4" />
                  <span>Mute</span>
                </>
              )}
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

      {/* Delete Dialog */}
      {showDeleteDialog && (
        <DeleteConversationDialog
          conversationId={conversationId}
          conversationName={other_participant_name || 'Unknown User'}
          onClose={handleDialogClose}
          onDeleted={handleDeleted}
        />
      )}

      {/* Clear Chat Dialog */}
      {showClearDialog && (
        <ClearChatDialog
          conversationId={conversationId}
          conversationName={other_participant_name || 'Unknown User'}
          onClose={handleClearDialogClose}
          onCleared={handleCleared}
        />
      )}

      {/* Mute Dialog */}
      {showMuteDialog && (
        <MuteConversationDialog
          conversationId={conversationId}
          conversationName={other_participant_name || 'Unknown User'}
          isMuted={conversation.is_muted}
          onClose={() => setShowMuteDialog(false)}
          onMuted={() => {
            // Optimistic update handles the UI, no need to reload
            // invalidating queries would be better if using React Query
          }}
        />
      )}
      
      {/* Friend Profile Modal */}
      {showProfileModal && friendId && (
        <FriendProfileModal
          friendId={friendId}
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
        />
      )}
      </div>
    </div>
  )
}
