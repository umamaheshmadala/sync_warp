// src/types/messaging.ts
// Comprehensive type definitions for messaging system
// Story: 8.2.1 - Messaging Service Layer

/**
 * Message content types
 */
export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'file' | 'link' | 'coupon' | 'deal';

/**
 * Message delivery status
 */
export type MessageStatus = 'sent' | 'delivered' | 'read';

/**
 * Link preview metadata for shared URLs
 */
export interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
}

/**
 * Core message entity
 */
export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  type: MessageType;
  media_urls?: string[] | null;
  thumbnail_url?: string | null;
  link_preview?: LinkPreview | null;
  shared_coupon_id?: string | null;
  shared_deal_id?: string | null;
  reply_to_id?: string | null;
  is_edited: boolean;
  edited_at?: string | null;
  is_deleted: boolean;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
  
  // Optimistic UI fields (client-side only)
  _optimistic?: boolean;   // True if message is being sent
  _failed?: boolean;       // True if message failed to send
  _tempId?: string;        // Temporary ID for optimistic messages
}

/**
 * Conversation entity
 */
export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  participants: string[];
  group_name?: string | null;
  group_avatar?: string | null;
  last_message_at?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Conversation with enriched participant details and unread count
 * Used for conversation list UI
 */
export interface ConversationWithDetails {
  conversation_id: string;
  type: 'direct' | 'group';
  participants: string[];
  is_archived: boolean;
  is_muted: boolean;
  is_pinned: boolean;
  created_at: string;
  last_message_at?: string | null;
  last_message_id?: string | null;
  last_message_content?: string | null;
  last_message_type?: MessageType | null;
  last_message_sender_id?: string | null;
  last_message_timestamp?: string | null;
  last_message_sender_name?: string | null;
  last_message_sender_avatar?: string | null;
  other_participant_id?: string | null; // For direct conversations
  other_participant_name?: string | null;
  other_participant_avatar?: string | null;
  other_participant_online?: boolean | null;
  unread_count: number;
}

/**
 * Parameters for sending a message
 */
export interface SendMessageParams {
  conversationId: string;
  content: string;
  type?: MessageType;
  mediaUrls?: string[];
  thumbnailUrl?: string;
  linkPreview?: LinkPreview;
  sharedCouponId?: string;
  sharedDealId?: string;
  replyToId?: string;
}

/**
 * Response wrapper for fetchMessages with pagination metadata
 */
export interface FetchMessagesResponse {
  messages: Message[];
  hasMore: boolean;
}

/**
 * Message read receipt
 */
export interface MessageReadReceipt {
  message_id: string;
  user_id: string;
  read_at: string | null;
  created_at: string;
}

/**
 * Unsubscribe function type for realtime subscriptions
 */
export type UnsubscribeFunction = () => void;
