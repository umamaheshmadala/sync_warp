import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useMessagingStore } from '../store/messagingStore'
import { useAuthStore } from '../store/authStore'
import { messagingService } from '../services/messagingService'
import { offlineQueueService } from '../services/offlineQueueService'
import { triggerPushNotification } from '../services/pushNotificationSender'
import { useNetworkStatus } from './useNetworkStatus'
import { toast } from 'react-hot-toast'
import type { SendMessageParams, Message } from '../types/messaging'
import * as blockService from '../services/blockService'
import { linkValidationService } from '../services/LinkValidationService'

/**
 * Hook to send messages with optimistic updates, loading state, and error handling
 * 
 * Features (Story 8.2.7):
 * - Optimistic UI updates (message appears immediately)
 * - Sends messages via messagingService
 * - Tracks sending state (isSending)
 * - Displays toast notifications on error
 * - Supports retry mechanism for failed messages
 * - Returns message ID on success
 * 
 * @returns sendMessage function, retryMessage function, and isSending state
 */
export function useSendMessage() {
  const queryClient = useQueryClient()
  const {
    isSendingMessage,
    setSendingMessage,
    addOptimisticMessage,
    replaceOptimisticMessage,
    markMessageFailed,
    messages // Access messages to look up parent message
  } = useMessagingStore()

  // Get current user ID from auth store
  const currentUserId = useAuthStore(state => state.user?.id)

  // Get network status for offline detection
  const { isOnline } = useNetworkStatus()

  /*
   * Send a message with optimistic UI updates and offline support
   */
  const sendMessage = useCallback(async (params: SendMessageParams) => {
    // Generate temporary ID for optimistic message OR reuse existing if retrying
    const tempId = params.tempId || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const isRetry = !!params.tempId

    // Look up parent message if this is a reply
    let parentMessage = null
    if (params.replyToId) {
      const conversationMessages = messages.get(params.conversationId) || []
      const parentMsg = conversationMessages.find(m => m.id === params.replyToId)
      if (parentMsg) {
        parentMessage = {
          id: parentMsg.id,
          content: parentMsg.content,
          type: parentMsg.type,
          sender_id: parentMsg.sender_id,
          sender_name: 'User', // Will be populated from backend
          created_at: parentMsg.created_at
        }
      }
    }

    // Create optimistic message
    const optimisticMessage: Message = {
      id: tempId, // Temporary ID (reused if retrying)
      conversation_id: params.conversationId,
      sender_id: currentUserId || 'unknown',
      content: params.content,
      type: params.type || 'text',
      media_urls: params.mediaUrls || null,
      thumbnail_url: params.thumbnailUrl || null,
      link_previews: params.linkPreviews || null,
      shared_coupon_id: params.sharedCouponId || null,
      shared_deal_id: params.sharedDealId || null,
      reply_to_id: params.replyToId || null,
      parent_message: parentMessage,
      is_edited: false,
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      _optimistic: true,
      _tempId: tempId,
      _failed: false, // Reset failure status on retry
      status: 'sending'
    }

    // 1. Add/Update optimistic message immediately (instant UI feedback)
    console.log('🚀 [useSendMessage] Starting optimistic update...', { tempId, isRetry })

    // Update React Query cache directly
    queryClient.setQueryData(['messages', params.conversationId], (old: any) => {
      console.log('💾 [useSendMessage] Updating cache. Old data exists:', !!old)
      const currentMessages = old?.messages || []
      const exists = currentMessages.some((m: Message) => m.id === tempId)

      // If retrying (exists), replace it. If new, append.
      const updatedMessages = exists
        ? currentMessages.map((m: Message) => m.id === tempId ? optimisticMessage : m)
        : [...currentMessages, optimisticMessage]

      console.log('💾 [useSendMessage] Cache updated. Count:', updatedMessages.length)
      return {
        messages: updatedMessages,
        hasMore: old?.hasMore ?? true
      }
    })

    // Also update Zustand (backwards compatibility)
    if (isRetry) {
      replaceOptimisticMessage(params.conversationId, tempId, optimisticMessage)
    } else {
      addOptimisticMessage(params.conversationId, optimisticMessage)
    }

    setSendingMessage(true)

    try {
      // [STORY 8.7.4] Validate links before sending
      if (params.content) {
        const validation = await linkValidationService.validateUrls(params.content)
        if (!validation.valid) {
          // Revert optimistic update!
          useMessagingStore.getState().removeMessage(params.conversationId, tempId)
          queryClient.setQueryData(['messages', params.conversationId], (old: any) => ({
            messages: (old?.messages || []).filter((m: Message) => m.id !== tempId),
            hasMore: old?.hasMore ?? true
          }))

          toast.error(validation.reason || 'Message contains unsafe links')
          throw new Error(validation.reason || 'Link validation failed')
        }
      }

      // 2. Check if online - if offline, queue message for later
      if (!isOnline) {
        console.log('📴 Offline - queueing message for later sync')

        const queueId = await offlineQueueService.queueMessage({
          conversationId: params.conversationId,
          senderId: currentUserId || 'unknown',
          content: params.content,
          type: (params.type || 'text') as any,
          mediaUrls: params.mediaUrls || undefined,
          thumbnailUrl: params.thumbnailUrl || undefined,
          replyToId: params.replyToId || undefined
        })

        const queuedMessage = {
          ...optimisticMessage,
          _queued: true,
          _queueId: queueId,
          status: 'queued' as const
        }

        // Update React Query cache
        queryClient.setQueryData(['messages', params.conversationId], (old: any) => ({
          messages: (old?.messages || []).map((msg: Message) =>
            msg.id === tempId ? queuedMessage : msg
          ),
          hasMore: old?.hasMore ?? true
        }))

        // Update Zustand
        replaceOptimisticMessage(params.conversationId, tempId, queuedMessage)

        console.log(`📤 Message queued: ${queueId}`)
        toast('Message saved. Will send when back online.', { icon: '📴' })
        return tempId
      }

      // 3. Online - send actual message to server
      const messageId = await messagingService.sendMessage(params)

      // 4. Replace optimistic message with real message
      const completedMessage = {
        ...optimisticMessage,
        id: messageId,
        _optimistic: undefined,
        _failed: undefined,
        _tempId: undefined, // Clear temp ID
        _queued: undefined,
        _queueId: undefined,
        status: 'delivered' as const
      }

      // Update React Query cache - SWAP temp ID with real ID
      queryClient.setQueryData(['messages', params.conversationId], (old: any) => ({
        messages: (old?.messages || []).map((msg: Message) =>
          msg.id === tempId ? completedMessage : msg
        ),
        hasMore: old?.hasMore ?? true
      }))

      // Update Zustand
      replaceOptimisticMessage(params.conversationId, tempId, completedMessage)

      console.log('✅ Message sent:', messageId)
      return tempId
    } catch (error) {
      console.error('❌ Failed to send message:', error)

      const errorMessage = error instanceof Error ? error.message : String(error)
      const isBlockError =
        errorMessage.includes('blocked') ||
        errorMessage.includes('PGRST116') ||
        errorMessage.includes('new row violates row-level security policy')

      if (isBlockError) {
        console.log('🚫 Message blocked by RLS policy')
        // Update React Query cache
        queryClient.setQueryData(['messages', params.conversationId], (old: any) => ({
          messages: (old?.messages || []).map((msg: Message) =>
            msg.id === tempId ? { ...msg, _failed: true, status: 'failed' } : msg
          ),
          hasMore: old?.hasMore ?? true
        }))

        markMessageFailed(params.conversationId, tempId)
        toast.error('Unable to send message. This user may have blocked you.')
        throw error
      }

      // Check for network error
      const isNetworkError = error instanceof TypeError &&
        (error.message.includes('fetch') || error.message.includes('network'))

      if (isNetworkError) {
        console.log('📴 Network error - queueing message')
        // Queue logic same as above... simplified for brevity, assume offline handled by isOnline usually
        // But if isOnline was true but fetch failed:
        try {
          const queueId = await offlineQueueService.queueMessage({
            conversationId: params.conversationId,
            senderId: currentUserId || 'unknown',
            content: params.content,
            type: (params.type || 'text') as any,
            mediaUrls: params.mediaUrls || undefined,
            thumbnailUrl: params.thumbnailUrl || undefined,
            replyToId: params.replyToId || undefined
          })

          const queuedMessage = {
            ...optimisticMessage,
            _queued: true,
            _queueId: queueId,
            status: 'queued' as const
          }

          queryClient.setQueryData(['messages', params.conversationId], (old: any) => ({
            messages: (old?.messages || []).map((msg: Message) =>
              msg.id === tempId ? queuedMessage : msg
            ),
            hasMore: old?.hasMore ?? true
          }))

          replaceOptimisticMessage(params.conversationId, tempId, queuedMessage)
          toast('Message saved. Will send when back online.', { icon: '📴' })
          return tempId
        } catch (queueError) {
          console.error('❌ Failed to queue:', queueError)
        }
      }

      // Mark message as failed
      queryClient.setQueryData(['messages', params.conversationId], (old: any) => ({
        messages: (old?.messages || []).map((msg: Message) =>
          msg.id === tempId ? { ...msg, _failed: true, status: 'failed' } : msg
        ),
        hasMore: old?.hasMore ?? true
      }))

      markMessageFailed(params.conversationId, tempId)
      toast.error('Failed to send message. Tap to retry.')
      throw error
    } finally {
      setSendingMessage(false)
    }
  }, [setSendingMessage, addOptimisticMessage, replaceOptimisticMessage, markMessageFailed, isOnline, currentUserId, queryClient, messages])

  /**
   * Retry sending a failed message
   */
  const retryMessage = useCallback(async (failedMessage: Message) => {
    if (!failedMessage._tempId) {
      console.error('Cannot retry message without _tempId')
      return
    }

    try {
      // Re-send the message with same content AND same ID
      await sendMessage({
        conversationId: failedMessage.conversation_id,
        content: failedMessage.content,
        type: failedMessage.type as any, // Type assertion for stricter types
        mediaUrls: failedMessage.media_urls || undefined,
        replyToId: failedMessage.reply_to_id || undefined,
        tempId: failedMessage._tempId // Pass existing ID to update in-place
      })
    } catch (error) {
      console.error('Retry failed:', error)
    }
  }, [sendMessage])

  return {
    sendMessage,
    retryMessage,
    isSending: isSendingMessage
  }
}
