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

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // First, get all message IDs in the conversation
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('id')
      .eq('conversation_id', conversationId)

    if (messagesError) {
      console.error('Failed to fetch messages:', messagesError)
      throw messagesError
    }

    if (!messages || messages.length === 0) {
      console.log('No messages to mark as read')
      return
    }

    const messageIds = messages.map(m => m.id)

    // Update read receipts for these messages
    const { error } = await supabase
      .from('message_read_receipts')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('read_at', null)
      .in('message_id', messageIds)

    if (error) {
      console.error('Failed to mark conversation as read:', error)
      throw error
    }

    console.log('✅ Conversation marked as read')
  }

  /**
   * Delete a conversation (soft delete by archiving)
   */
  async deleteConversation(conversationId: string): Promise<void> {
    console.log('🗑️ Deleting conversation:', conversationId)

    // For now, we'll just archive it
    // In a future story, we can implement hard delete
    await this.archiveConversation(conversationId)

    console.log('✅ Conversation deleted (archived)')
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
