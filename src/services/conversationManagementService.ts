import { supabase } from '../lib/supabase'

export type ConversationFilter = 'all' | 'unread' | 'archived' | 'pinned'

interface Conversation {
  id: string
  type: string
  is_archived: boolean
  is_pinned: boolean
  pinned_at: string | null
  archived_at: string | null
  last_message_at: string
  unread_count: number
  other_participant: {
    id: string
    username: string
    avatar_url: string | null
    is_online: boolean
  }
  last_message: {
    id: string
    content: string
    type: string
    created_at: string
    sender_id: string
  } | null
}

class ConversationManagementService {
  /**
   * Archive a conversation
   */
  async archiveConversation(conversationId: string): Promise<void> {
    console.log('📦 Archiving conversation:', conversationId)
    console.log('  - Type:', typeof conversationId)
    console.log('  - Value:', JSON.stringify(conversationId))

    const { data, error } = await supabase
      .from('conversations')
      .update({
        is_archived: true,
        archived_at: new Date().toISOString(),
      })
      .eq('id', conversationId)
      .select()

    console.log('  - Update result:', { data, error })

    if (error) {
      console.error('❌ Failed to archive conversation:', error)
      throw error
    }

    if (!data || data.length === 0) {
      console.error('⚠️ No rows updated - conversation ID may be incorrect')
      throw new Error('No conversation found with that ID')
    }

    console.log('✅ Conversation archived successfully:', data)
  }

  /**
   * Unarchive a conversation
   */
  async unarchiveConversation(conversationId: string): Promise<void> {
    console.log('📤 Unarchiving conversation:', conversationId)

    const { error } = await supabase
      .from('conversations')
      .update({
        is_archived: false,
        archived_at: null,
      })
      .eq('id', conversationId)

    if (error) {
      console.error('Failed to unarchive conversation:', error)
      throw error
    }

    console.log('✅ Conversation unarchived')
  }

  /**
   * Pin a conversation to the top
   */
  async pinConversation(conversationId: string): Promise<void> {
    console.log('📌 Pinning conversation:', conversationId)
    console.log('  - Type:', typeof conversationId)
    console.log('  - Value:', JSON.stringify(conversationId))

    const { data, error } = await supabase
      .from('conversations')
      .update({
        is_pinned: true,
        pinned_at: new Date().toISOString(),
      })
      .eq('id', conversationId)
      .select()

    console.log('  - Update result:', { data, error })

    if (error) {
      console.error('❌ Failed to pin conversation:', error)
      throw error
    }

    if (!data || data.length === 0) {
      console.error('⚠️ No rows updated - conversation ID may be incorrect')
      throw new Error('No conversation found with that ID')
    }

    console.log('✅ Conversation pinned successfully:', data)
  }

  /**
   * Unpin a conversation
   */
  async unpinConversation(conversationId: string): Promise<void> {
    console.log('📍 Unpinning conversation:', conversationId)

    const { error } = await supabase
      .from('conversations')
      .update({
        is_pinned: false,
        pinned_at: null,
      })
      .eq('id', conversationId)

    if (error) {
      console.error('Failed to unpin conversation:', error)
      throw error
    }

    console.log('✅ Conversation unpinned')
  }

  /**
   * Get filtered conversations
   */
  async getConversations(
    filter: ConversationFilter = 'all'
  ): Promise<Conversation[]> {
    console.log('🔍 Fetching conversations with filter:', filter)

    let query = supabase.from('conversation_list').select('*')

    switch (filter) {
      case 'unread':
        query = query.gt('unread_count', 0).eq('is_archived', false)
        break
      case 'archived':
        query = query.eq('is_archived', true)
        break
      case 'pinned':
        query = query.eq('is_pinned', true).eq('is_archived', false)
        break
      case 'all':
      default:
        query = query.eq('is_archived', false)
        break
    }

    // Sorting is handled by the view, but we can add explicit ordering
    query = query
      .order('is_pinned', { ascending: false })
      .order('last_message_at', { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error('Failed to fetch conversations:', error)
      throw error
    }

    console.log(`✅ Fetched ${data?.length || 0} conversations`)
    return data as Conversation[]
  }

  /**
   * Mark all messages in a conversation as read
   */
  async markConversationAsRead(conversationId: string): Promise<void> {
    console.log('✅ Marking conversation as read:', conversationId)

    const { error } = await supabase.rpc('mark_conversation_as_read', {
      p_conversation_id: conversationId
    })

    if (error) {
      console.error('Failed to mark conversation as read:', error)
      throw error
    }

    console.log('✅ Conversation marked as read')
  }

  /**
   * Mark conversation as unread (manually)
   * This sets the read_at of the last received message to NULL
   */
  async markConversationAsUnread(conversationId: string): Promise<void> {
    console.log('Marking conversation as unread:', conversationId)
    const user = await supabase.auth.getUser()
    const userId = user.data.user?.id

    if (!userId) throw new Error('User not authenticated')

    // 1. Get the last message received by this user
    const { data: lastMessage } = await supabase
      .from('messages')
      .select('id')
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId) // Only messages sent by others
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!lastMessage) {
      console.log('No received messages to mark as unread')
      return
    }

    // 2. Set read_at to NULL for this message in receipts
    const { error } = await supabase
      .from('message_read_receipts')
      .update({ read_at: null })
      .eq('message_id', lastMessage.id)
      .eq('user_id', userId)

    if (error) {
      console.error('Failed to mark conversation as unread:', error)
      throw error
    }

    console.log('✅ Conversation marked as unread')
  }

  /**
   * Clear all messages in a conversation (soft delete via RPC)
   */
  async clearConversationMessages(conversationId: string): Promise<void> {
    console.log('🧹 Clearing chat history for:', conversationId)

    const { error } = await supabase.rpc('clear_chat_history', {
      p_conversation_id: conversationId,
    })

    if (error) {
      console.error('Failed to clear chat history:', error)
      throw error
    }

    console.log('✅ Chat history cleared (hidden for user)')
  }

  /**
   * Delete a conversation (soft delete via RPC)
   * Can be undone within 10 seconds
   */
  async deleteConversation(conversationId: string): Promise<void> {
    console.log('🗑️ Deleting conversation (soft delete):', conversationId)

    const { error } = await supabase.rpc('delete_conversation_for_user', {
      p_conversation_id: conversationId,
    })

    if (error) {
      console.error('Failed to delete conversation:', error)
      throw error
    }

    console.log('✅ Conversation soft deleted (can undo within 10s)')
  }

  /**
   * Undo delete conversation (within 10 seconds)
   */
  async undoDeleteConversation(conversationId: string): Promise<void> {
    console.log('↩️ Undoing delete for conversation:', conversationId)

    const { error } = await supabase.rpc('undo_delete_conversation', {
      p_conversation_id: conversationId,
    })

    if (error) {
      console.error('Failed to undo delete:', error)
      throw error
    }

    console.log('✅ Delete undone successfully')
  }

  /**
   * Get conversation counts for each filter
   */
  async getConversationCounts(): Promise<{
    all: number
    unread: number
    archived: number
    pinned: number
  }> {
    const [allResult, unreadResult, archivedResult, pinnedResult] =
      await Promise.all([
        supabase
          .from('conversation_list')
          .select('*', { count: 'exact', head: true })
          .eq('is_archived', false),
        supabase
          .from('conversation_list')
          .select('*', { count: 'exact', head: true })
          .gt('unread_count', 0)
          .eq('is_archived', false),
        supabase
          .from('conversation_list')
          .select('*', { count: 'exact', head: true })
          .eq('is_archived', true),
        supabase
          .from('conversation_list')
          .select('*', { count: 'exact', head: true })
          .eq('is_pinned', true)
          .eq('is_archived', false),
      ])

    return {
      all: allResult.count || 0,
      unread: unreadResult.count || 0,
      archived: archivedResult.count || 0,
      pinned: pinnedResult.count || 0,
    }
  }
}

export const conversationManagementService =
  new ConversationManagementService()
