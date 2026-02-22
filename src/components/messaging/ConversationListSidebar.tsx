import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, Search, MoreHorizontal, Edit, ListChecks } from 'lucide-react'
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
import { parseDatabaseDate } from '../../utils/dateUtils'
import * as ReactWindow from 'react-window'
import AutoSizer from 'react-virtualized-auto-sizer'

const listKey = 'FixedSizeList';
const List = (ReactWindow as any)[listKey];

interface ItemData {
  conversations: any[];
  selectedConversations: string[];
  selectionMode: boolean;
  activeId: string | undefined;
  isNative: boolean;
  handleLongPress: () => void;
  handleUpdate: () => void;
  handleToggleSelect: (id: string) => void;
  handleConversationClick: (id: string) => void;
}

const areEqual = (prevProps: any, nextProps: any) => {
  const prevData = prevProps.data;
  const nextData = nextProps.data;
  const index = prevProps.index;

  const prevConv = prevData.conversations[index];
  const nextConv = nextData.conversations[index];

  return (
    prevProps.index === nextProps.index &&
    prevConv === nextConv &&
    prevData.selectionMode === nextData.selectionMode &&
    prevData.activeId === nextData.activeId &&
    prevData.selectedConversations.includes(prevConv?.conversation_id) === nextData.selectedConversations.includes(nextConv?.conversation_id)
  );
};

const Row = React.memo(({ data, index, style }: { data: ItemData; index: number; style: React.CSSProperties }) => {
  const {
    conversations,
    selectedConversations,
    selectionMode,
    activeId,
    isNative,
    handleLongPress,
    handleUpdate,
    handleToggleSelect,
    handleConversationClick
  } = data;

  const conversation = conversations[index];
  const isSelected = selectedConversations.includes(conversation.conversation_id);

  return (
    <div style={style}>
      <div className="border-b border-gray-100 h-full">
        {isNative ? (
          <SwipeableConversationCard
            conversation={conversation}
            isSelectionMode={selectionMode}
            onLongPress={handleLongPress}
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
            conversation={conversation}
            isSelected={isSelected}
            isSelectionMode={selectionMode}
            isActive={conversation.conversation_id === activeId}
            onToggleSelect={handleToggleSelect}
            onClick={() => handleConversationClick(conversation.conversation_id)}
          />
        )}
      </div>
    </div>
  );
}, areEqual);


export function ConversationListSidebar() {
  const navigate = useNavigate()
  const { conversationId: activeId } = useParams<{ conversationId: string }>()
  const { conversations, isLoading, refresh } = useConversations()
  const [showFriendPicker, setShowFriendPicker] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<ConversationFilter>('all')
  const [counts, setCounts] = useState({ all: 0, unread: 0, archived: 0, blocked: 0 })

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

        // Compute blocked count from conversations (since messagingService enriches with is_blocked)
        const blockedCount = conversations.filter(c => c.is_blocked).length

        setCounts({
          ...countsData,
          blocked: blockedCount,  // Override with actual count
        })
      } catch (error) {
        console.error('Failed to fetch counts:', error)
      }
    }
    fetchCounts()
  }, [conversations])

  // Filter conversations
  const filteredConversations = useMemo(() => {
    return conversations
      .filter(c => c != null) // Filter out null/undefined entries first
      .filter(c => {
        // Debug log for blocked status
        if (c.is_blocked) {
          console.log(`🔒 Sidebar: Conversation ${c.conversation_id} is BLOCKED in render`);
        }

        // Search filter

        const matchesSearch = c.other_participant_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.last_message_content?.toLowerCase().includes(searchQuery.toLowerCase())
        if (!matchesSearch) return false

        // Tab filter
        switch (activeFilter) {
          case 'unread':
            return !c.is_archived && !c.is_blocked && (c.unread_count > 0)
          case 'archived':
            return c.is_archived && !c.is_blocked  // Exclude blocked from archived
          case 'blocked':
            return c.is_blocked  // Show only blocked conversations
          case 'all':
          default:
            return !c.is_archived && !c.is_blocked  // Show active, non-blocked
        }
      })
      .sort((a, b) => {
        // Pinned conversations first
        if (a.is_pinned && !b.is_pinned) return -1
        if (!a.is_pinned && b.is_pinned) return 1

        // Then sort by last message time
        const timeA = parseDatabaseDate(a.last_message_at || a.created_at)?.getTime() || 0
        const timeB = parseDatabaseDate(b.last_message_at || b.created_at)?.getTime() || 0
        return timeB - timeA
      })
  }, [conversations, searchQuery, activeFilter])

  // Debug logging
  useEffect(() => {
    const blocked = conversations.filter(c => c.is_blocked);
    console.log(`📊 Sidebar Stats:
      Total: ${conversations.length}
      Blocked: ${blocked.length}
      Active Filter: ${activeFilter}
      Blocked IDs: ${blocked.map(c => c.conversation_id).join(', ')}
    `);
  }, [conversations, activeFilter]);

  const handleConversationClick = useCallback((id: string) => {
    navigate(`/messages/${id}`)
  }, [navigate]);

  const handleFilterChange = useCallback((filter: ConversationFilter) => {
    setActiveFilter(filter)
  }, []);

  const handleUpdate = useCallback(() => {
    refresh()
  }, [refresh]);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedConversations(prev =>
      prev.includes(id)
        ? prev.filter(convId => convId !== id)
        : [...prev, id]
    )
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedConversations([])
    setSelectionMode(false)
  }, []);

  const handleLongPress = useCallback(() => {
    if (!selectionMode) {
      setSelectionMode(true)
    }
  }, [selectionMode]);

  const itemData = useMemo(() => ({
    conversations: filteredConversations,
    selectedConversations,
    selectionMode,
    activeId,
    isNative,
    handleLongPress,
    handleUpdate,
    handleToggleSelect,
    handleConversationClick
  }), [
    filteredConversations,
    selectedConversations,
    selectionMode,
    activeId,
    isNative,
    handleLongPress,
    handleUpdate,
    handleToggleSelect,
    handleConversationClick
  ]);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Filter Tabs */}
      <ConversationFilterTabs
        activeFilter={activeFilter}
        onFilterChange={handleFilterChange}
        counts={counts}
      />

      {/* Search and Actions */}
      <div className="px-4 py-3 border-b flex items-center gap-2">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search messages"
            className="pl-9 bg-gray-100 border-none focus-visible:ring-1 focus-visible:ring-gray-300 focus-visible:bg-white transition-colors h-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {!selectionMode && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-gray-600 shrink-0"
              onClick={() => setSelectionMode(true)}
              title="Select conversations"
            >
              <ListChecks className="h-5 w-5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-gray-600 shrink-0"
            onClick={() => setShowFriendPicker(true)}
          >
            <Edit className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      <ConversationListBulkActions
        selectedConversations={selectedConversations}
        selectionMode={selectionMode}
        onClearSelection={handleClearSelection}
        onUpdate={handleUpdate}
      />

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto will-change-scroll">
        {conversations.length === 0 && isLoading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="text-center py-12 px-4">
            <p className="text-gray-500 text-sm">
              {activeFilter === 'archived' ? 'No archived conversations' :
                activeFilter === 'blocked' ? 'No blocked users' :
                  activeFilter === 'unread' ? 'No unread messages' :
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
          <AutoSizer>
            {({ height, width }) => (
              <List
                height={height}
                itemCount={filteredConversations.length}
                itemSize={72} // Standard height of ConversationCard based on standard design
                width={width}
                itemData={itemData}
                overscanCount={5}
                className="scrollbar-hide"
              >
                {Row}
              </List>
            )}
          </AutoSizer>
        )}
      </div>

      <FriendPickerModal
        isOpen={showFriendPicker}
        onClose={() => setShowFriendPicker(false)}
      />
    </div>
  )
}
