import React, { useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, Search, MoreHorizontal, Edit } from 'lucide-react'
import { useConversations } from '../../hooks/useConversations'
import { ConversationCard } from './ConversationCard'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs'
import { FriendPickerModal } from './FriendPickerModal'
import { cn } from '../../lib/utils'

export function ConversationListSidebar() {
  const navigate = useNavigate()
  const { conversationId: activeId } = useParams<{ conversationId: string }>()
  const { conversations, isLoading } = useConversations()
  const [showFriendPicker, setShowFriendPicker] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'unread' | 'groups'>('all')

  // Filter conversations
  const filteredConversations = useMemo(() => {
    return conversations
      .filter(c => {
        // Search filter
        const matchesSearch = c.other_participant_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              c.last_message_content?.toLowerCase().includes(searchQuery.toLowerCase())
        if (!matchesSearch) return false

        // Tab filter
        if (filter === 'unread') return c.unread_count > 0
        if (filter === 'groups') return c.type === 'group'
        return true
      })
      .sort((a, b) => {
        // Sort by last message time
        const timeA = new Date(a.last_message_at || a.created_at).getTime()
        const timeB = new Date(b.last_message_at || b.created_at).getTime()
        return timeB - timeA
      })
  }, [conversations, searchQuery, filter])

  const handleConversationClick = (id: string) => {
    navigate(`/messages/${id}`)
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Messaging</h1>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-600">
              <MoreHorizontal className="h-5 w-5" />
            </Button>
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

      {/* Tabs */}
      <div className="px-4 py-2 border-b">
        <Tabs defaultValue="all" value={filter} onValueChange={(v) => setFilter(v as any)} className="w-full">
          <TabsList className="w-full justify-start h-8 bg-transparent p-0 gap-2">
            <TabsTrigger 
              value="all" 
              className="data-[state=active]:bg-green-700 data-[state=active]:text-white rounded-full px-4 h-7 text-xs border border-gray-200 data-[state=active]:border-green-700"
            >
              All
            </TabsTrigger>
            <TabsTrigger 
              value="unread" 
              className="data-[state=active]:bg-green-700 data-[state=active]:text-white rounded-full px-4 h-7 text-xs border border-gray-200 data-[state=active]:border-green-700"
            >
              Unread
            </TabsTrigger>
            {/* <TabsTrigger 
              value="groups" 
              className="data-[state=active]:bg-green-700 data-[state=active]:text-white rounded-full px-4 h-7 text-xs border border-gray-200 data-[state=active]:border-green-700"
            >
              Groups
            </TabsTrigger> */}
          </TabsList>
        </Tabs>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="text-center py-12 px-4">
            <p className="text-gray-500 text-sm">No messages found</p>
            <Button 
              variant="link" 
              className="mt-2 text-green-600"
              onClick={() => setShowFriendPicker(true)}
            >
              Start a new conversation
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredConversations.map((conversation) => (
              <ConversationCard
                key={conversation.conversation_id}
                conversation={conversation}
                isActive={conversation.conversation_id === activeId}
                onClick={() => handleConversationClick(conversation.conversation_id)}
              />
            ))}
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
