// src/utils/notificationRouter.ts
import type { NotificationType, NotificationMetadata, NotificationRouteConfig } from '../types/notification';
import { getBusinessUrl } from '../utils/slugUtils';
import {
  UserPlus,
  Users,
  MessageCircle,
  Heart,
  MessageSquare,
  Share2,
  AtSign,
  Calendar,
  Bell,
  Briefcase,
  Star,
  ShoppingBag,
  Tag,
  UsersRound,
  FileText,
  Megaphone,
  CheckCircle,
  XCircle,
} from 'lucide-react';

/**
 * Notification Router Configuration
 * Maps notification types to their routing logic, icons, and colors
 */
export const notificationRoutes: Record<NotificationType, NotificationRouteConfig> = {
  connection_request: {
    type: 'connection_request',
    getRoute: (metadata) => `/connections?request=${metadata.connectionId || ''}`,
    getIcon: () => 'UserPlus',
    getColor: () => 'text-blue-600',
  },
  connection_accepted: {
    type: 'connection_accepted',
    getRoute: (metadata) => `/profile/${metadata.userId || ''}`,
    getIcon: () => 'Users',
    getColor: () => 'text-green-600',
  },
  message_received: {
    type: 'message_received',
    getRoute: (metadata) => `/messages/${metadata.conversationId || ''}`,
    getIcon: () => 'MessageCircle',
    getColor: () => 'text-purple-600',
  },
  post_like: {
    type: 'post_like',
    getRoute: (metadata) => `/feed?post=${metadata.postId || ''}`,
    getIcon: () => 'Heart',
    getColor: () => 'text-red-600',
  },
  post_comment: {
    type: 'post_comment',
    getRoute: (metadata) => `/feed?post=${metadata.postId}&comment=${metadata.commentId || ''}`,
    getIcon: () => 'MessageSquare',
    getColor: () => 'text-blue-600',
  },
  post_share: {
    type: 'post_share',
    getRoute: (metadata) => `/feed?post=${metadata.postId || ''}`,
    getIcon: () => 'Share2',
    getColor: () => 'text-indigo-600',
  },
  mention: {
    type: 'mention',
    getRoute: (metadata) => {
      if (metadata.postId) return `/feed?post=${metadata.postId}`;
      if (metadata.commentId) return `/feed?comment=${metadata.commentId}`;
      return '/feed';
    },
    getIcon: () => 'AtSign',
    getColor: () => 'text-orange-600',
  },
  event_invitation: {
    type: 'event_invitation',
    getRoute: (metadata) => `/events/${metadata.eventId || ''}`,
    getIcon: () => 'Calendar',
    getColor: () => 'text-teal-600',
  },
  event_reminder: {
    type: 'event_reminder',
    getRoute: (metadata) => `/events/${metadata.eventId || ''}`,
    getIcon: () => 'Bell',
    getColor: () => 'text-amber-600',
  },
  business_follow: {
    type: 'business_follow',
    getRoute: (metadata) => getBusinessUrl(metadata.businessId || '', metadata.businessName),
    getIcon: () => 'Briefcase',
    getColor: () => 'text-cyan-600',
  },
  business_review: {
    type: 'business_review',
    getRoute: (metadata) => `${getBusinessUrl(metadata.businessId || '', metadata.businessName)}/reviews${metadata.reviewId ? `#${metadata.reviewId}` : ''}`,
    getIcon: () => 'Star',
    getColor: () => 'text-yellow-600',
  },
  marketplace_inquiry: {
    type: 'marketplace_inquiry',
    getRoute: (metadata) => `/marketplace/${metadata.listingId || ''}`,
    getIcon: () => 'ShoppingBag',
    getColor: () => 'text-pink-600',
  },
  marketplace_offer: {
    type: 'marketplace_offer',
    getRoute: (metadata) => `/marketplace/${metadata.listingId}/offers${metadata.offerId ? `/${metadata.offerId}` : ''}`,
    getIcon: () => 'Tag',
    getColor: () => 'text-rose-600',
  },
  group_invitation: {
    type: 'group_invitation',
    getRoute: (metadata) => `/groups/${metadata.groupId || ''}`,
    getIcon: () => 'UsersRound',
    getColor: () => 'text-violet-600',
  },
  group_post: {
    type: 'group_post',
    getRoute: (metadata) => `/groups/${metadata.groupId}/posts${metadata.postId ? `/${metadata.postId}` : ''}`,
    getIcon: () => 'FileText',
    getColor: () => 'text-fuchsia-600',
  },
  system_announcement: {
    type: 'system_announcement',
    getRoute: (metadata) => metadata.targetUrl || '/dashboard',
    getIcon: () => 'Megaphone',
    getColor: () => 'text-gray-600',
  },
  new_offer: {
    type: 'new_offer',
    getRoute: (metadata) => `${getBusinessUrl(metadata.businessId || '', metadata.businessName)}/offers?highlight=${metadata.offer_code || metadata.offerCode || ''}`,
    getIcon: () => 'Tag',
    getColor: () => 'text-green-600',
  },
  business_approved: {
    type: 'business_approved',
    getRoute: (metadata) => getBusinessUrl(metadata.businessId || metadata['business_id'] || '', metadata.businessName || metadata['business_name']),
    getIcon: () => 'CheckCircle',
    getColor: () => 'text-green-600',
  },
  business_rejected: {
    type: 'business_rejected',
    getRoute: (metadata) => `/business/dashboard`,
    getIcon: () => 'XCircle',
    getColor: () => 'text-red-600',
  },
};

/**
 * Get the routing configuration for a notification type
 */
export function getNotificationRoute(type: NotificationType, metadata: NotificationMetadata): string {
  const config = notificationRoutes[type];
  if (!config) {
    console.warn(`No route configuration found for notification type: ${type}`);
    return '/dashboard';
  }
  return config.getRoute(metadata);
}

/**
 * Get the icon name for a notification type
 */
export function getNotificationIcon(type: NotificationType): string {
  const config = notificationRoutes[type];
  return config?.getIcon() || 'Bell';
}

/**
 * Get the color class for a notification type
 */
export function getNotificationColor(type: NotificationType): string {
  const config = notificationRoutes[type];
  return config?.getColor() || 'text-gray-600';
}

/**
 * Get a human-readable label for a notification type
 */
export function getNotificationTypeLabel(type: NotificationType): string {
  const labels: Record<NotificationType, string> = {
    connection_request: 'Connection Request',
    connection_accepted: 'Connection Accepted',
    message_received: 'New Message',
    post_like: 'Post Liked',
    post_comment: 'New Comment',
    post_share: 'Post Shared',
    mention: 'Mentioned You',
    event_invitation: 'Event Invitation',
    event_reminder: 'Event Reminder',
    business_follow: 'New Follower',
    business_review: 'New Review',
    marketplace_inquiry: 'Marketplace Inquiry',
    marketplace_offer: 'New Offer',
    group_invitation: 'Group Invitation',
    group_post: 'Group Post',
    system_announcement: 'Announcement',
    new_offer: 'New Promotion',
    business_approved: 'Business Approved',
    business_rejected: 'Business Rejected',
  };
  return labels[type] || type.replace(/_/g, ' ');
}

/**
 * Icon component mapping for dynamic rendering
 */
export const iconComponents = {
  UserPlus,
  Users,
  MessageCircle,
  Heart,
  MessageSquare,
  Share2,
  AtSign,
  Calendar,
  Bell,
  Briefcase,
  Star,
  ShoppingBag,
  Tag,
  UsersRound,
  FileText,
  Megaphone,
  CheckCircle,
  XCircle,
};
