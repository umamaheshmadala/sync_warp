import { supabase } from '../lib/supabase'
import { optimisticUpdates } from '../utils/optimisticUpdates'
import { useMessagingStore } from '../store/messagingStore'

export type ConversationFilter = 'all' | 'archived' | 'blocked'
export type MuteDuration = 'hour' | 'day' | 'week' | 'forever'

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
   * Archive a conversation (user-specific)
   * Also auto-mutes the conversation
   */
  async archiveConversation(conversationId: string): Promise<void> {
    console.log('📦 Archiving conversation:', conversationId)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Optimistic Update
    const updateId = `archive:${conversationId}`
    optimisticUpdates.applyOptimistic(updateId, { is_archived: true }, { is_archived: false })
    useMessagingStore.getState().toggleArchiveOptimistic(conversationId)

    const { error } = await supabase
      .from('conversation_participants')
      .update({
        is_archived: true,
        archived_at: new Date().toISOString(),
      })
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)

    if (error) {
      console.error('❌ Failed to archive conversation:', error)
      // Rollback
      optimisticUpdates.rollbackUpdate(updateId)
      useMessagingStore.getState().toggleArchiveOptimistic(conversationId) // Toggle back
      throw error
    }

    // Auto-mute using RPC function
    try {
      await supabase.rpc('mute_conversation', {
        p_conversation_id: conversationId,
        p_duration: 'forever',
      })
    } catch (muteError) {
      console.warn('⚠️ Failed to auto-mute archived conversation:', muteError)
      // Don't throw - archiving succeeded even if mute failed
    }

    optimisticUpdates.confirmUpdate(updateId)
    console.log('✅ Conversation archived and muted successfully')

    // Trigger conversation list refetch to update UI (switch tabs)
    window.dispatchEvent(new Event('conversation-updated'))
  }

  /**
   * Unarchive a conversation (user-specific)
   * Also auto-unmutes the conversation
   */
  async unarchiveConversation(conversationId: string): Promise<void> {
    console.log('📤 Unarchiving conversation:', conversationId)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Optimistic Update
    const updateId = `unarchive:${conversationId}`
    optimisticUpdates.applyOptimistic(updateId, { is_archived: false }, { is_archived: true })
    useMessagingStore.getState().toggleArchiveOptimistic(conversationId)

    const { error } = await supabase
      .from('conversation_participants')
      .update({
        is_archived: false,
        archived_at: null,
      })
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Failed to unarchive conversation:', error)
      // Rollback
      optimisticUpdates.rollbackUpdate(updateId)
      useMessagingStore.getState().toggleArchiveOptimistic(conversationId)
      throw error
    }

    // Auto-unmute using RPC function
    try {
      await supabase.rpc('unmute_conversation', {
        p_conversation_id: conversationId,
      })
    } catch (unmuteError) {
      console.warn('⚠️ Failed to auto-unmute unarchived conversation:', unmuteError)
      // Don't throw - unarchiving succeeded even if unmute failed
    }

    optimisticUpdates.confirmUpdate(updateId)
    console.log('✅ Conversation unarchived and unmuted successfully')

    // Trigger conversation list refetch to update UI (switch tabs)
    window.dispatchEvent(new Event('conversation-updated'))
  }

  /**
   * Pin a conversation to the top
   */
  /**
   * Pin a conversation to the top
   */
  async pinConversation(conversationId: string): Promise<void> {
    console.log('📌 Pinning conversation:', conversationId)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Optimistic Update
    const updateId = `pin:${conversationId}`
    optimisticUpdates.applyOptimistic(updateId, { is_pinned: true }, { is_pinned: false })
    useMessagingStore.getState().togglePinOptimistic(conversationId)

    const { error } = await supabase
      .from('conversation_participants')
      .update({
        is_pinned: true,
      })
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)

    if (error) {
      console.error('❌ Failed to pin conversation:', error)
      // Rollback
      optimisticUpdates.rollbackUpdate(updateId)
      useMessagingStore.getState().togglePinOptimistic(conversationId)
      throw error
    }

    optimisticUpdates.confirmUpdate(updateId)
    console.log('✅ Conversation pinned successfully')

    // Trigger conversation list refetch to update UI
    window.dispatchEvent(new Event('conversation-updated'))
  }

  /**
   * Unpin a conversation
   */
  async unpinConversation(conversationId: string): Promise<void> {
    console.log('📍 Unpinning conversation:', conversationId)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Optimistic Update
    const updateId = `unpin:${conversationId}`
    optimisticUpdates.applyOptimistic(updateId, { is_pinned: false }, { is_pinned: true })
    useMessagingStore.getState().togglePinOptimistic(conversationId)

    const { error } = await supabase
      .from('conversation_participants')
      .update({
        is_pinned: false,
      })
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Failed to unpin conversation:', error)
      // Rollback
      optimisticUpdates.rollbackUpdate(updateId)
      useMessagingStore.getState().togglePinOptimistic(conversationId)
      throw error
    }

    optimisticUpdates.confirmUpdate(updateId)
    console.log('✅ Conversation unpinned')

    // Trigger conversation list refetch to update UI
    window.dispatchEvent(new Event('conversation-updated'))
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
      case 'archived':
        // Show archived conversations (exclude blocked)
        query = query.eq('is_archived', true)
        // TODO: Add exclusion for blocked users once we have is_blocked in view
        break
      case 'blocked':
        // Show conversations with blocked users
        // TODO: Filter by is_blocked once added to conversation_list view
        query = query.eq('is_archived', false) // Temporary - will be replaced
        break
      case 'all':
      default:
        // Show active conversations (not archived, not blocked)
        query = query.eq('is_archived', false)
        // TODO: Add exclusion for blocked users once we have is_blocked in view
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
   * Mute conversation
   */
  async muteConversation(
    conversationId: string,
    duration: MuteDuration = 'forever'
  ): Promise<void> {
    console.log('🔕 Muting conversation:', conversationId, 'for', duration)

    // Optimistic Update
    const updateId = `mute:${conversationId}`
    optimisticUpdates.applyOptimistic(updateId, { is_muted: true }, { is_muted: false })
    useMessagingStore.getState().toggleMuteOptimistic(conversationId, true)

    const { data, error } = await supabase.rpc('mute_conversation', {
      p_conversation_id: conversationId,
      p_duration: duration,
    })

    console.log('🔕 [muteConversation] RPC response:', { data, error })

    if (error) {
      console.error('Failed to mute conversation:', error)
      // Rollback
      optimisticUpdates.rollbackUpdate(updateId)
      useMessagingStore.getState().toggleMuteOptimistic(conversationId, false)
      throw error
    }

    optimisticUpdates.confirmUpdate(updateId)
    console.log('✅ Conversation muted')

    // Trigger conversation list refetch to update UI
    window.dispatchEvent(new Event('conversation-updated'))
  }

  /**
   * Unmute conversation
   */
  async unmuteConversation(conversationId: string): Promise<void> {
    console.log('🔔 Unmuting conversation:', conversationId)

    // Optimistic Update
    const updateId = `unmute:${conversationId}`
    optimisticUpdates.applyOptimistic(updateId, { is_muted: false }, { is_muted: true })
    useMessagingStore.getState().toggleMuteOptimistic(conversationId, false)

    const { data, error } = await supabase.rpc('unmute_conversation', {
      p_conversation_id: conversationId,
    })

    console.log('🔔 [unmuteConversation] RPC response:', { data, error })

    if (error) {
      console.error('Failed to unmute conversation:', error)
      // Rollback
      optimisticUpdates.rollbackUpdate(updateId)
      useMessagingStore.getState().toggleMuteOptimistic(conversationId, true)
      throw error
    }

    optimisticUpdates.confirmUpdate(updateId)
    console.log('✅ Conversation unmuted')

    // Trigger conversation list refetch to update UI
    window.dispatchEvent(new Event('conversation-updated'))
  }

  /**
   * Check if conversation is muted
   */
  async isConversationMuted(conversationId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('is_conversation_muted', {
      p_conversation_id: conversationId,
    })

    if (error) {
      console.error('Failed to check mute status:', error)
      return false
    }

    return data as boolean
  }

  /**
   * Get conversation counts for each filter
   */
  async getConversationCounts(): Promise<{
    all: number
    unread: number
    archived: number
    blocked: number
  }> {
    const [allResult, unreadResult, archivedResult] =
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
      ])

    return {
      all: allResult.count || 0,
      unread: unreadResult.count || 0,
      archived: archivedResult.count || 0,
      blocked: 0, // TODO: Implement blocked count once is_blocked added to view
    }
  }
}

export const conversationManagementService =
  new ConversationManagementService()
