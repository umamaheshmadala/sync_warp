
import { useNavigate } from 'react-router-dom';
import { InAppNotification } from '@/services/notificationService';

/**
 * Hook to handle navigation logic for different notification types.
 * Centralizes the logic used in NotificationCenter and NotificationsPage.
 */
export const useNotificationNavigation = () => {
    const navigate = useNavigate();

    const handleNavigation = (notification: InAppNotification) => {
        // 1. Direct Action URL (Highest Priority)
        const actionUrl = notification.data?.action_url;
        if (actionUrl) {
            navigate(actionUrl);
            return;
        }

        const { notification_type, data } = notification;

        // 2. Type-based Navigation
        switch (notification_type) {
            // Message related
            case 'new_message':
            case 'message':
                if (data?.conversation_id) {
                    navigate(`/messages/${data.conversation_id}`);
                } else {
                    navigate('/messages');
                }
                break;

            // Friend/Connection related
            case 'friend_request':
                navigate('/friends/requests');
                break;

            case 'friend_accepted':
            case 'connection_accepted':
                // Navigate to the user's profile who accepted the request
                const friendId = data?.userId || data?.friend_id || notification.sender_id;
                if (friendId) {
                    navigate(`/profile/${friendId}`);
                } else {
                    navigate('/friends');
                }
                break;

            case 'connection_request': // Alias for friend_request
                navigate('/friends/requests');
                break;

            // Business/Review related
            case 'business_review':
            case 'review_moderation':
                // Navigate to the business page. 
                // Ideal: /business/:id?highlightReview=:reviewId
                if (data?.businessId) {
                    let url = `/business/${data.businessId}`;
                    // If we have a reviewId, we could append it as a query param or separate route
                    // For now, just going to business page is safer unless we know the app supports anchors
                    navigate(url);
                } else if (data?.business_id) {
                    navigate(`/business/${data.business_id}`);
                }
                break;

            case 'admin_review_pending':
                // Go to admin dashboard or reviews queue
                navigate('/admin');
                break;

            // Deals/Offers
            case 'deal_shared':
            case 'new_offer':
                const dealId = data?.deal_id || data?.offerId;
                if (dealId) {
                    navigate(`/deals/${dealId}`);
                } else if (data?.businessId) {
                    navigate(`/business/${data.businessId}`);
                }
                break;

            case 'coupon_shared_message':
                if (data?.conversation_id) navigate(`/messages/${data.conversation_id}`);
                break;

            // Events
            case 'birthday_reminder':
                if (data?.friend_id) navigate(`/profile/${data.friend_id}`);
                break;

            // Default fallback
            default:
                console.warn('Unhandled notification type for navigation:', notification_type);
                // Optionally navigate to a generic page or do nothing
                break;
        }
    };

    return { handleNavigation };
};
