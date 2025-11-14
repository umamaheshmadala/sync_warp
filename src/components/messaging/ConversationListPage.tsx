import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useConversations } from '../../hooks/useConversations'
import { useMessagingStore } from '../../store/messagingStore'
import { ConversationCard } from './ConversationCard'
import { SearchBar } from '../ui/SearchBar'
import { Skeleton } from '../ui/skeleton'
import { MessageSquarePlus } from 'lucide-react'
import './ConversationListPage.css'

/**
 * ConversationListPage Component
 * 
 * Main page displaying:
 * - Header with title and new conversation button
 * - Search bar for filtering conversations
 * - List of conversations (sorted by recent activity)
 * - Loading skeletons
 * - Empty states (no conversations / no search results)
 * 
 * Features:
 * - Realtime conversation updates
 * - Instant search filtering
 * - Responsive design (320px to 1920px)
 * - Platform-specific optimizations
 * 
 * @example
 * ```tsx
 * // In router:
 * <Route path="/messages" element={<ConversationListPage />} />
 * ```
 */
export function ConversationListPage() {
  const navigate = useNavigate()
  const { conversations, isLoading } = useConversations()
  const activeConversationId = useMessagingStore(state => state.activeConversationId)
  
  const [searchQuery, setSearchQuery] = useState('')

  // Filter conversations by search query (instant filtering)
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations

    const query = searchQuery.toLowerCase()
    return conversations.filter(conv =>
      conv.other_participant_name?.toLowerCase().includes(query) ||
      conv.last_message_content?.toLowerCase().includes(query)
    )
  }, [conversations, searchQuery])

  // Loading skeleton
  if (isLoading && conversations.length === 0) {
    return (
      <div className="flex flex-col h-screen bg-gray-50">
        {/* Header Skeleton */}
        <div className="bg-white border-b px-4 py-3 safe-area-top">
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-24" />
        </div>
        
        {/* Search Skeleton */}
        <div className="px-4 py-3 bg-white border-b">
          <Skeleton className="h-10 w-full" />
        </div>
        
        {/* List Skeleton */}
        <div className="flex-1 overflow-y-auto conversation-list-scroll">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-4 border-b">
              <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 safe-area-top">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
            <p className="text-sm text-gray-500">
              {filteredConversations.length} conversation{filteredConversations.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => navigate('/friends')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Start new conversation"
            aria-label="Start new conversation"
          >
            <MessageSquarePlus className="h-6 w-6 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-3 bg-white border-b">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search conversations..."
        />
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto conversation-list-scroll safe-area-bottom">
        {filteredConversations.length === 0 ? (
          // Empty State
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            {searchQuery ? (
              // No Search Results
              <>
                <div className="mb-4">
                  <MessageSquarePlus className="h-16 w-16 text-gray-300 mx-auto" />
                </div>
                <p className="text-lg font-medium text-gray-700 mb-2">
                  No conversations found
                </p>
                <p className="text-sm text-gray-500">
                  Try adjusting your search or browse friends to start a new conversation
                </p>
              </>
            ) : (
              // No Conversations Yet
              <>
                <div className="mb-4">
                  <MessageSquarePlus className="h-16 w-16 text-gray-300 mx-auto" />
                </div>
                <p className="text-lg font-medium text-gray-700 mb-2">
                  No conversations yet
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  Start chatting with your friends to see conversations here
                </p>
                <button
                  onClick={() => navigate('/friends')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Browse Friends
                </button>
              </>
            )}
          </div>
        ) : (
          // Conversation List
          filteredConversations.map(conversation => (
            <ConversationCard
              key={conversation.conversation_id}
              conversation={conversation}
              onClick={() => {
                navigate(`/messages/${conversation.conversation_id}`)
              }}
              isActive={conversation.conversation_id === activeConversationId}
              onLongPress={(conv) => {
                // TODO: Implement context menu (Archive, Delete, Mark as Unread, etc.)
                console.log('Long press on conversation:', conv.conversation_id)
              }}
            />
          ))
        )}
      </div>
    </div>
  )
}
