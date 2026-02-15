import { useState, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useMessagingStore } from '../store/messagingStore'
import { messagingService } from '../services/messagingService'
import { useAuthStore } from '../store/authStore'
import type { SendMessageParams, Message } from '../types/messaging'
import toast from 'react-hot-toast'
import { queryClient } from '../lib/react-query'

export function useSendMessage() {
  const [isSending, setIsSending] = useState(false)
  const user = useAuthStore((state) => state.user)

  const {
    addOptimisticMessage,
    replaceOptimisticMessage,
    markMessageFailed
  } = useMessagingStore()

  const sendMessage = useCallback(async (params: SendMessageParams) => {
    if (!user) {
      toast.error('You must be logged in to send messages')
      return null
    }

    setIsSending(true)
    const tempId = `temp-${uuidv4()}`

    // Create optimistic message object
    const optimisticMessage: Message = {
      id: tempId,
      conversation_id: params.conversationId,
      sender_id: user.id,
      content: params.content,
      type: params.type || 'text',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false,
      is_edited: false,
      // Optional fields
      media_urls: params.mediaUrls || [],
      thumbnail_url: params.thumbnailUrl,
      reply_to_id: params.replyToId,
      link_previews: params.linkPreviews,
      shared_coupon_id: params.sharedCouponId,
      shared_deal_id: params.sharedDealId,

      // Optimistic flags (will be set/overwritten by store action, but good to have)
      _optimistic: true,
      _failed: false,
      _tempId: tempId,
      status: 'sending'
    }

    try {
      // 1. Add to store immediately
      addOptimisticMessage(params.conversationId, optimisticMessage)

      // 2. Send to server
      const realMessageId = await messagingService.sendMessage(params)

      // 3. Replace temp message with real one
      const confirmedMessage = {
        ...optimisticMessage,
        id: realMessageId,
        _optimistic: false,
        _tempId: undefined,
        status: 'sent' as const // Server confirmed reception
      }

      replaceOptimisticMessage(params.conversationId, tempId, confirmedMessage)

      // 4. Update React Query cache immediately to prevent flicker
      // (The optimistic message disappears from store.messages when replaceOptimisticMessage runs,
      // so we must ensure it exists in React Query cache before Realtime event arrives)
      queryClient.setQueryData(['messages', params.conversationId], (old: any) => {
        const currentMessages = old?.messages || []
        // Prevent duplicates if Realtime was faster
        if (currentMessages.some((m: Message) => m.id === realMessageId)) {
          return old
        }
        return {
          messages: [...currentMessages, confirmedMessage],
          hasMore: old?.hasMore ?? true
        }
      })

      return realMessageId
    } catch (error) {
      console.error('❌ Send message failed:', error)

      // 4. Mark as failed
      markMessageFailed(params.conversationId, tempId)

      // Optional: Show toast if it's a general error, but the UI should show the retry button
      // toast.error('Failed to send message') 

      return null
    } finally {
      setIsSending(false)
    }
  }, [user, addOptimisticMessage, replaceOptimisticMessage, markMessageFailed])

  const retryMessage = useCallback(async (message: Message) => {
    if (!message._tempId || !message._failed) return

    setIsSending(true)
    const { conversation_id, _tempId, content, type, media_urls, thumbnail_url, reply_to_id, link_previews, shared_coupon_id, shared_deal_id } = message

    // Reset failure state to sending
    useMessagingStore.getState().updateMessage(conversation_id, _tempId, {
      _failed: false,
      status: 'sending'
    })

    try {
      const realMessageId = await messagingService.sendMessage({
        conversationId: conversation_id,
        content,
        type,
        mediaUrls: media_urls || undefined,
        thumbnailUrl: thumbnail_url || undefined,
        replyToId: reply_to_id || undefined,
        linkPreviews: link_previews || undefined,
        sharedCouponId: shared_coupon_id || undefined,
        sharedDealId: shared_deal_id || undefined
      })

      replaceOptimisticMessage(conversation_id, _tempId, {
        ...message,
        id: realMessageId,
        _optimistic: false,
        _tempId: undefined,
        _failed: false,
        status: 'sent'
      })
    } catch (error) {
      console.error('❌ Retry failed:', error)
      markMessageFailed(conversation_id, _tempId)
    } finally {
      setIsSending(false)
    }
  }, [replaceOptimisticMessage, markMessageFailed])

  return { sendMessage, isSending, retryMessage }
}
