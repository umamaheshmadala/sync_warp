import React, { useState, useEffect } from 'react'
import { Forward, Search, Check, User } from 'lucide-react'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { Capacitor } from '@capacitor/core'
import { friendsService } from '../../services/friendsService'
import { messagingService } from '../../services/messagingService'
import { toast } from 'react-hot-toast'
import { cn } from '../../lib/utils'
import type { Friend } from '../../types/friends'
import { supabase } from '../../lib/supabase'
import { useQueryClient } from '@tanstack/react-query'

interface Props {
  message: {
    id: string
    content: string
    type: string
  }
  onClose: () => void
  onForwarded: () => void
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

  const filteredFriends = friends.filter(friend => {
    const query = searchQuery.toLowerCase()
    return (
      friend.full_name.toLowerCase().includes(query) ||
      friend.username?.toLowerCase().includes(query)
    )
  })

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[80vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="p-4 border-b">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Forward className="w-5 h-5" />
            Forward Message
          </h2>
          <p className="text-sm text-gray-600 mt-1 truncate">
            {message.type === 'text'
              ? message.content
              : `[${message.type}]`
            }
          </p>
        </div>

        {/* Search */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search friends..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Friend List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Loading friends...</div>
          ) : filteredFriends.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No friends found
            </div>
          ) : (
            filteredFriends.map(friend => {
              const isSelected = selectedFriendIds.includes(friend.id)
              return (
                <button
                  key={friend.id}
                  onClick={() => toggleSelection(friend.id)}
                  className={cn(
                    'w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors border-b last:border-0',
                    isSelected && 'bg-blue-50'
                  )}
                >
                  <div className={cn(
                    'w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                    isSelected
                      ? 'bg-blue-600 border-blue-600'
                      : 'bg-white border-gray-300'
                  )}>
                    {isSelected && <Check className="w-4 h-4 text-white" />}
                  </div>

                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
                    {friend.avatar_url ? (
                      <img
                        src={friend.avatar_url}
                        alt={friend.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500">
                        <User className="w-5 h-5" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 text-left min-w-0">
                    <div className="font-medium truncate">
                      {friend.full_name}
                    </div>
                    {friend.username && (
                      <div className="text-sm text-gray-500 truncate">
                        @{friend.username}
                      </div>
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex gap-3 bg-gray-50 rounded-b-lg">
          <button
            onClick={onClose}
            disabled={isForwarding}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleForward}
            disabled={isForwarding || selectedFriendIds.length === 0}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
          >
            {isForwarding
              ? 'Forwarding...'
              : `Forward${selectedFriendIds.length > 0 ? ` (${selectedFriendIds.length})` : ''}`
            }
          </button>
        </div>
      </div>
    </div>
  )
}
