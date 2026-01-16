import React, { useState, useEffect, useMemo } from 'react'
import { Forward, Search, Check, User, X, Image as ImageIcon, Video, Link as LinkIcon, FileText } from 'lucide-react'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { Capacitor } from '@capacitor/core'
import { friendsService } from '../../services/friendsService'
import { messagingService } from '../../services/messagingService'
import { toast } from 'react-hot-toast'
import { cn } from '../../lib/utils'
import type { Friend } from '../../types/friends'
import { supabase } from '../../lib/supabase'
import { useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'

interface Props {
  message: {
    id: string
    content: string
    type: string
    media_urls?: string[]
    link_previews?: any[]
  }
  onClose: () => void
  onForwarded: () => void
}

function MessagePreview({ message }: { message: Props['message'] }) {
  const isMedia = message.type === 'image' || message.type === 'video'
  const hasLink = message.link_previews && message.link_previews.length > 0

  return (
    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
      {/* Content Preview */}
      <div className="flex gap-3">
        {/* Media Thumbnail (if applicable) */}
        {isMedia && message.media_urls?.[0] && (
          <div className="w-16 h-16 rounded-md bg-gray-200 flex-shrink-0 overflow-hidden relative">
            {message.type === 'image' ? (
              <img
                src={message.media_urls[0]}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-black/10">
                <Video className="w-6 h-6 text-gray-500" />
              </div>
            )}
          </div>
        )}

        {/* Link Preview Thumbnail */}
        {!isMedia && hasLink && message.link_previews![0].image && (
          <div className="w-16 h-16 rounded-md bg-gray-200 flex-shrink-0 overflow-hidden">
            <img
              src={message.link_previews![0].image}
              alt="Link Preview"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="flex-1 min-w-0 flex flex-col justify-center">
          {/* Text Content */}
          {message.content && (
            <p className="text-sm text-gray-700 line-clamp-2 mb-1">
              {message.content}
            </p>
          )}

          {/* Type Indicator */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            {message.type === 'image' && (
              <>
                <ImageIcon className="w-3 h-3" />
                <span>Image</span>
              </>
            )}
            {message.type === 'video' && (
              <>
                <Video className="w-3 h-3" />
                <span>Video</span>
              </>
            )}
            {hasLink && (
              <>
                <LinkIcon className="w-3 h-3" />
                <span className="truncate max-w-[150px]">
                  {message.link_previews![0].title || 'Link'}
                </span>
              </>
            )}
            {message.type === 'file' && (
              <>
                <FileText className="w-3 h-3" />
                <span>File</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function ForwardMessageDialog({ message, onClose, onForwarded }: Props) {
  const queryClient = useQueryClient()
  const [friends, setFriends] = useState<Friend[]>([])
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isForwarding, setIsForwarding] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    loadFriends()
  }, [])

  const loadFriends = async () => {
    try {
      setIsLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setCurrentUserId(user.id)

      const response = await friendsService.getFriends(user.id)
      if (response.success && response.data) {
        setFriends(response.data)
      } else {
        toast.error('Failed to load friends')
      }
    } catch (error) {
      console.error('Failed to load friends:', error)
      toast.error('Failed to load friends')
    } finally {
      setIsLoading(false)
    }
  }

  const filteredFriends = useMemo(() => {
    const query = searchQuery.toLowerCase()
    return friends.filter(friend =>
      friend.full_name.toLowerCase().includes(query) ||
      friend.username?.toLowerCase().includes(query)
    )
  }, [friends, searchQuery])

  const toggleSelection = (id: string) => {
    if (Capacitor.isNativePlatform()) {
      Haptics.impact({ style: ImpactStyle.Light })
    }

    setSelectedFriendIds(prev =>
      prev.includes(id)
        ? prev.filter(i => i !== id)
        : [...prev, id]
    )
  }

  const handleForward = async () => {
    if (selectedFriendIds.length === 0) {
      toast.error('Select at least one friend')
      return
    }

    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Medium })
    }

    setIsForwarding(true)

    try {
      // 1. Get conversation IDs for all selected friends
      const conversationIds = await Promise.all(
        selectedFriendIds.map(async (friendId) => {
          const cid = await messagingService.createOrGetConversation(friendId)
          // CRITICAL FIX: Invalidate cache
          queryClient.removeQueries({ queryKey: ['messages', cid] })
          return cid
        })
      )

      // 2. Forward message to these conversations
      await messagingService.forwardMessage(message.id, conversationIds)

      toast.success(`Forwarded to ${selectedFriendIds.length} friend${selectedFriendIds.length > 1 ? 's' : ''}`)
      onForwarded()
      onClose()
    } catch (error) {
      console.error('Forward failed:', error)
      toast.error('Failed to forward message')
    } finally {
      setIsForwarding(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Forward className="w-5 h-5 text-blue-600" />
              Forward Message
            </h2>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <MessagePreview message={message} />
        </div>

        {/* Search */}
        <div className="p-3 border-b bg-gray-50/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search people..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        {/* Selected Friends Chips */}
        {selectedFriendIds.length > 0 && (
          <div className="px-3 py-2 border-b flex gap-2 overflow-x-auto no-scrollbar bg-blue-50/30 min-h-[52px] items-center">
            {selectedFriendIds.map(id => {
              const friend = friends.find(f => f.id === id)
              if (!friend) return null
              return (
                <div key={id} className="flex-shrink-0 flex items-center gap-1.5 bg-white border border-blue-100 pl-1 pr-2 py-0.5 rounded-full shadow-sm animate-in zoom-in duration-200">
                  <div className="w-5 h-5 rounded-full bg-gray-100 overflow-hidden">
                    {friend.avatar_url ? (
                      <img src={friend.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-3 h-3 text-gray-400 m-auto" />
                    )}
                  </div>
                  <span className="text-xs font-medium text-gray-700 max-w-[80px] truncate">{friend.full_name.split(' ')[0]}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleSelection(id); }}
                    className="p-0.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* Friend List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500 flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm">Loading friends...</p>
            </div>
          ) : filteredFriends.length === 0 ? (
            <div className="p-8 text-center text-gray-500 flex flex-col items-center gap-2">
              <User className="w-8 h-8 text-gray-300" />
              <p className="text-sm">No friends found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filteredFriends.map(friend => {
                const isSelected = selectedFriendIds.includes(friend.id)
                return (
                  <button
                    key={friend.id}
                    onClick={() => toggleSelection(friend.id)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors',
                      isSelected && 'bg-blue-50/50'
                    )}
                  >
                    <div className={cn(
                      'w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 transition-all duration-200',
                      isSelected
                        ? 'bg-blue-600 border-blue-600'
                        : 'bg-white border-gray-300'
                    )}>
                      {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>

                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex-shrink-0 overflow-hidden border border-gray-100">
                      {friend.avatar_url ? (
                        <img
                          src={friend.avatar_url}
                          alt={friend.full_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <User className="w-5 h-5" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 text-left min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {friend.full_name}
                      </div>
                      {friend.username && (
                        <div className="text-xs text-gray-500 truncate">
                          @{friend.username}
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50/50 rounded-b-xl flex gap-3">
          <button
            onClick={onClose}
            disabled={isForwarding}
            className="flex-1 px-4 py-2.5 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleForward}
            disabled={isForwarding || selectedFriendIds.length === 0}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all shadow-sm active:scale-[0.98] flex items-center justify-center gap-2 text-sm"
          >
            {isForwarding ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <Forward className="w-4 h-4" />
                <span>Forward {selectedFriendIds.length > 0 ? `(${selectedFriendIds.length})` : ''}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
