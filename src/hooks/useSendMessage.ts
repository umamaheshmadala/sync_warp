import { useState, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { messagingService } from '../services/messagingService'
import { useAuthStore } from '../store/authStore'
import type { SendMessageParams, Message } from '../types/messaging'
import toast from 'react-hot-toast'
import { queryClient } from '../lib/react-query'

export function useSendMessage() {
  const [isSending, setIsSending] = useState(false)
  const user = useAuthStore((state) => state.user)

  const sendMessage = useCallback(async (params: SendMessageParams) => {
    if (!user) {
      toast.error('You must be logged in to send messages')
      return null
    }

    setIsSending(true)
    const tempId = `temp-${uuidv4()}`

    // Story 8.10.5 - Construct parent_message for optimistic reply context
    const parentMessage = params.replyToMessage ? {
      id: params.replyToMessage.id,
      content: params.replyToMessage.content,
      type: params.replyToMessage.type,
      sender_id: params.replyToMessage.sender_id,
      sender_name: params.replyToMessage.sender_id === user.id ? 'You' : (params.replyToMessage.sender_id === params.conversationId ? 'Partner' : 'User'),
      created_at: params.replyToMessage.created_at
    } : undefined;

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

      _optimistic: true,
      _failed: false,
      _tempId: tempId,
      status: 'sending',
      parent_message: parentMessage
    }


    try {
      // 1. Add to React Query cache immediately
      queryClient.setQueryData(['messages', params.conversationId], (old: any) => {
        const currentMessages = old?.messages || []
        return {
          ...old,
          messages: [optimisticMessage, ...currentMessages]
        }
      })

      // 2. Send to server
      const realMessageId = await messagingService.sendMessage(params)

      // 3. Replace temp message with real one in React Query cache
      const confirmedMessage: Message = {
        ...optimisticMessage,
        id: realMessageId,
        _optimistic: false,
        _tempId: undefined,
        status: 'sent' as const // Server confirmed reception
      }

      queryClient.setQueryData(['messages', params.conversationId], (old: any) => {
        const currentMessages = old?.messages || []

        // Prevent duplicates if Realtime was faster
        if (currentMessages.some((m: Message) => m.id === realMessageId)) {
          return {
            ...old,
            messages: currentMessages.map((m: Message) => {
              if (m.id === realMessageId && !m.parent_message && confirmedMessage.parent_message) {
                // Merge in the context we have locally
                return { ...m, parent_message: confirmedMessage.parent_message }
              }
              // Also ensure we remove the optimistic message if it's still there
              if (m._tempId === tempId) return null as any;
              return m
            }).filter(Boolean)
          }
        }

        // Otherwise replace the temp message
        return {
          ...old,
          messages: currentMessages.map((m: Message) => m.id === tempId ? confirmedMessage : m)
        }
      })

      return realMessageId
    } catch (error) {
      console.error('❌ Send message failed:', error)

      // 4. Mark as failed in React Query cache
      queryClient.setQueryData(['messages', params.conversationId], (old: any) => {
        const currentMessages = old?.messages || []
        return {
          ...old,
          messages: currentMessages.map((m: Message) =>
            m.id === tempId ? { ...m, _failed: true, status: 'failed' } : m
          )
        }
      })

      // Optional: Show toast if it's a general error, but the UI should show the retry button
      // toast.error('Failed to send message') 

      return null
    } finally {
      setIsSending(false)
    }
  }, [user])

  const retryMessage = useCallback(async (message: Message) => {
    if (!message._tempId || !message._failed) return

    setIsSending(true)
    const { conversation_id, _tempId, content, type, media_urls, thumbnail_url, reply_to_id, link_previews, shared_coupon_id, shared_deal_id } = message

    // Reset failure state to sending in cache
    queryClient.setQueryData(['messages', conversation_id], (old: any) => {
      const currentMessages = old?.messages || []
      return {
        ...old,
        messages: currentMessages.map((m: Message) =>
          m.id === _tempId ? { ...m, _failed: false, status: 'sending' } : m
        )
      }
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

      const confirmedMessage: Message = {
        ...message,
        id: realMessageId,
        _optimistic: false,
        _tempId: undefined,
        _failed: false,
        status: 'sent'
      }

      queryClient.setQueryData(['messages', conversation_id], (old: any) => {
        const currentMessages = old?.messages || []
        return {
          ...old,
          messages: currentMessages.map((m: Message) => m.id === _tempId ? confirmedMessage : m)
        }
      })
    } catch (error) {
      console.error('❌ Retry failed:', error)
      queryClient.setQueryData(['messages', conversation_id], (old: any) => {
        const currentMessages = old?.messages || []
        return {
          ...old,
          messages: currentMessages.map((m: Message) =>
            m.id === _tempId ? { ...m, _failed: true, status: 'failed' } : m
          )
        }
      })
    } finally {
      setIsSending(false)
    }
  }, [])

  return { sendMessage, isSending, retryMessage }
}
