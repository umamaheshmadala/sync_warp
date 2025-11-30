import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, Search, MoreHorizontal, Edit } from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import { useConversations } from '../../hooks/useConversations'
import { ConversationCard } from './ConversationCard'
import { ConversationFilterTabs } from './ConversationFilterTabs'
import { SwipeableConversationCard } from './SwipeableConversationCard'
import { SelectableConversationCard } from './SelectableConversationCard'
import { ConversationListBulkActions } from './ConversationListBulkActions'
import { useConversationKeyboardShortcuts } from '../../hooks/useConversationKeyboardShortcuts'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { FriendPickerModal } from './FriendPickerModal'
import { conversationManagementService, type ConversationFilter } from '../../services/conversationManagementService'
import { cn } from '../../lib/utils'

export function ConversationListSidebar() {
  const navigate = useNavigate()
  const { conversationId: activeId } = useParams<{ conversationId: string }>()
  const { conversations, isLoading, refresh } = useConversations()
  const [showFriendPicker, setShowFriendPicker] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<ConversationFilter>('all')
  const [counts, setCounts] = useState({ all: 0, unread: 0, archived: 0, pinned: 0 })
  
  // Multi-select state
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedConversations, setSelectedConversations] = useState<string[]>([])

  const isNative = Capacitor.isNativePlatform()

  // Keyboard shortcuts (web only)
  useConversationKeyboardShortcuts(activeId || null, refresh)

  // Fetch conversation counts
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const countsData = await conversationManagementService.getConversationCounts()
        setCounts(countsData)
      } catch (error) {
        console.error('Failed to fetch counts:', error)
      }
    }
    fetchCounts()
  }, [conversations])

  // Filter conversations
  const filteredConversations = useMemo(() => {
    return conversations
      .filter(c => {
        // Search filter
        const matchesSearch = c.other_participant_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              c.last_message_content?.toLowerCase().includes(searchQuery.toLowerCase())
        if (!matchesSearch) return false

        // Tab filter
        switch (activeFilter) {
          case 'unread':
            return c.unread_count > 0 && !c.is_archived
          case 'archived':
            return c.is_archived
          case 'pinned':
            return c.is_pinned && !c.is_archived
          case 'all':
          default:
            return !c.is_archived
        }
      })
      .sort((a, b) => {
        // Pinned conversations first
        if (a.is_pinned && !b.is_pinned) return -1
        if (!a.is_pinned && b.is_pinned) return 1
        
        // Then sort by last message time
        const timeA = new Date(a.last_message_at || a.created_at).getTime()
        const timeB = new Date(b.last_message_at || b.created_at).getTime()
        return timeB - timeA
      })
  }, [conversations, searchQuery, activeFilter])

  const handleConversationClick = (id: string) => {
    navigate(`/messages/${id}`)
  }

  const handleFilterChange = (filter: ConversationFilter) => {
    setActiveFilter(filter)
  }

  const handleUpdate = () => {
    refresh()
  }

  const handleToggleSelect = (id: string) => {
    setSelectedConversations(prev =>
      prev.includes(id)
        ? prev.filter(convId => convId !== id)
        : [...prev, id]
    )
  }

  const handleClearSelection = () => {
    setSelectedConversations([])
    setSelectionMode(false)
  }

  const handleLongPress = () => {
    if (!selectionMode) {
      setSelectionMode(true)
    }
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Messaging</h1>
          <div className="flex items-center gap-1">
            {!selectionMode && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 text-gray-600"
                onClick={() => setSelectionMode(true)}
              >
                Select
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-gray-600"
              onClick={() => setShowFriendPicker(true)}
            >
              <Edit className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search messages"
            className="pl-9 bg-gray-100 border-none focus-visible:ring-1 focus-visible:ring-gray-300 focus-visible:bg-white transition-colors"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <ConversationFilterTabs
        activeFilter={activeFilter}
        onFilterChange={handleFilterChange}
        counts={counts}
      />

      {/* Bulk Actions Bar */}
      <ConversationListBulkActions
        selectedConversations={selectedConversations}
        selectionMode={selectionMode}
        onClearSelection={handleClearSelection}
        onUpdate={handleUpdate}
      />

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="text-center py-12 px-4">
            <p className="text-gray-500 text-sm">
              {activeFilter === 'archived' ? 'No archived conversations' :
               activeFilter === 'pinned' ? 'No pinned conversations' :
               activeFilter === 'unread' ? 'No unread conversations' :
               'No messages found'}
            </p>
            {activeFilter === 'all' && (
              <Button 
                variant="link" 
                className="mt-2 text-blue-600"
                onClick={() => setShowFriendPicker(true)}
              >
                Start a new conversation
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredConversations.map((conversation) => {
              const isSelected = selectedConversations.includes(conversation.conversation_id)
              
              return isNative ? (
                <SwipeableConversationCard
                  key={conversation.conversation_id}
                  conversation={conversation}
                  onUpdate={handleUpdate}
                >
                  <SelectableConversationCard
                    conversation={conversation}
                    isSelected={isSelected}
                    isSelectionMode={selectionMode}
                    isActive={conversation.conversation_id === activeId}
                    onToggleSelect={handleToggleSelect}
                    onClick={() => handleConversationClick(conversation.conversation_id)}
                  />
                </SwipeableConversationCard>
              ) : (
                <SelectableConversationCard
                  key={conversation.conversation_id}
                  conversation={conversation}
                  isSelected={isSelected}
                  isSelectionMode={selectionMode}
                  isActive={conversation.conversation_id === activeId}
                  onToggleSelect={handleToggleSelect}
                  onClick={() => handleConversationClick(conversation.conversation_id)}
                />
              )
            })}
          </div>
        )}
      </div>

      <FriendPickerModal
        isOpen={showFriendPicker}
        onClose={() => setShowFriendPicker(false)}
      />
    </div>
  )
}
