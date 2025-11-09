import { NavigateFunction } from 'react-router-dom'

export type NotificationType = 'review' | 'offer' | 'follower' | 'business' | 'message' | 'test'

export interface NotificationData {
  type: NotificationType
  businessId?: string
  reviewId?: string
  offerId?: string
  userId?: string
  messageId?: string
  // Additional fields for extensibility
  [key: string]: any
}

/**
 * NotificationRouter
 * 
 * Handles deep linking and routing for push notifications.
 * Routes users to appropriate screens based on notification type and data.
 */
export class NotificationRouter {
  /**
   * Route to appropriate screen based on notification data
   * 
   * @param data - Notification data containing type and relevant IDs
   * @param navigate - React Router navigate function
   */
  static route(data: NotificationData, navigate: NavigateFunction): void {
    console.log('[NotificationRouter] Routing to:', data.type, data)

    switch (data.type) {
      case 'review':
        if (data.businessId && data.reviewId) {
          // Route to specific review
          navigate(`/business/${data.businessId}/reviews/${data.reviewId}`)
        } else if (data.businessId) {
          // Route to business reviews tab
          navigate(`/business/${data.businessId}/reviews`)
        } else {
          // Fallback to home
          console.warn('[NotificationRouter] Review notification missing businessId')
          navigate('/')
        }
        break

      case 'offer':
        if (data.businessId && data.offerId) {
          // Route to specific offer
          navigate(`/business/${data.businessId}/offers/${data.offerId}`)
        } else if (data.businessId) {
          // Route to business offers tab
          navigate(`/business/${data.businessId}/offers`)
        } else {
          // Fallback to offers page
          navigate('/offers')
        }
        break

      case 'business':
        if (data.businessId) {
          // Route to business profile
          navigate(`/business/${data.businessId}`)
        } else {
          console.warn('[NotificationRouter] Business notification missing businessId')
          navigate('/')
        }
        break

      case 'follower':
        if (data.userId) {
          // Route to user profile
          navigate(`/profile/${data.userId}`)
        } else {
          // Route to followers list
          navigate('/followers')
        }
        break

      case 'message':
        if (data.messageId) {
          // Route to specific message thread
          navigate(`/messages/${data.messageId}`)
        } else {
          // Route to messages inbox
          navigate('/messages')
        }
        break

      case 'test':
        // Test notifications just go to home
        console.log('[NotificationRouter] Test notification received')
        navigate('/')
        break

      default:
        console.warn('[NotificationRouter] Unknown notification type:', data.type)
        navigate('/')
    }
  }

  /**
   * Get display label for notification type
   * 
   * @param type - Notification type
   * @returns Formatted label with emoji
   */
  static getTypeLabel(type: NotificationType): string {
    const labels: Record<NotificationType, string> = {
      review: '📝 Review',
      offer: '🎁 Offer',
      follower: '👥 Follower',
      business: '🏢 Business',
      message: '💬 Message',
      test: '🧪 Test'
    }
    return labels[type] || '🔔 Notification'
  }

  /**
   * Get color scheme for notification type
   * 
   * @param type - Notification type
   * @returns Color hex code
   */
  static getTypeColor(type: NotificationType): string {
    const colors: Record<NotificationType, string> = {
      review: '#007AFF',
      offer: '#FF9500',
      follower: '#5856D6',
      business: '#34C759',
      message: '#FF2D55',
      test: '#8E8E93'
    }
    return colors[type] || '#007AFF'
  }

  /**
   * Validate notification data structure
   * 
   * @param data - Notification data to validate
   * @returns true if valid, false otherwise
   */
  static isValid(data: any): data is NotificationData {
    if (!data || typeof data !== 'object') {
      return false
    }

    const validTypes: NotificationType[] = ['review', 'offer', 'follower', 'business', 'message', 'test']
    
    if (!validTypes.includes(data.type)) {
      console.warn('[NotificationRouter] Invalid notification type:', data.type)
      return false
    }

    return true
  }
}
