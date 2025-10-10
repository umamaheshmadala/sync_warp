// src/types/notification.ts
export type NotificationType =
  | 'connection_request'
  | 'connection_accepted'
  | 'message_received'
  | 'post_like'
  | 'post_comment'
  | 'post_share'
  | 'mention'
  | 'event_invitation'
  | 'event_reminder'
  | 'business_follow'
  | 'business_review'
  | 'marketplace_inquiry'
  | 'marketplace_offer'
  | 'group_invitation'
  | 'group_post'
  | 'system_announcement';

export interface NotificationMetadata {
  // Connection-related
  userId?: string;
  connectionId?: string;
  
  // Message-related
  conversationId?: string;
  messageId?: string;
  
  // Post-related
  postId?: string;
  commentId?: string;
  
  // Event-related
  eventId?: string;
  
  // Business-related
  businessId?: string;
  reviewId?: string;
  
  // Marketplace-related
  listingId?: string;
  offerId?: string;
  
  // Group-related
  groupId?: string;
  
  // General
  targetUrl?: string;
  additionalData?: Record<string, any>;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata: NotificationMetadata;
  is_read: boolean;
  created_at: string;
  read_at?: string;
  
  // Sender info (joined from profiles)
  sender_id?: string;
  sender_name?: string;
  sender_avatar?: string;
}

export interface NotificationGroup {
  type: NotificationType;
  count: number;
  latestNotification: Notification;
  notifications: Notification[];
}

export interface NotificationRouteConfig {
  type: NotificationType;
  getRoute: (metadata: NotificationMetadata) => string;
  getIcon: () => string;
  getColor: () => string;
}

export interface NotificationPreferences {
  user_id: string;
  email_notifications: boolean;
  push_notifications: boolean;
  connection_requests: boolean;
  messages: boolean;
  posts: boolean;
  events: boolean;
  business_updates: boolean;
  marketplace: boolean;
  groups: boolean;
  system_announcements: boolean;
}
