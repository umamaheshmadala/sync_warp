
import { InAppNotification } from '../services/notificationService';

export interface NotificationGroup {
    id: string; // ID of the latest notification in the group
    notifications: InAppNotification[];
    type: string;
    title: string;
    body: string;
    sent_at: string;
    is_group: boolean;
    sender_avatar?: string;
    sender_name?: string;
    data?: any;
    count: number;
}

/**
 * Groups notifications by conversation (for messages) or other relevant contexts.
 * 
 * Strategy:
 * 1. Messages are grouped by 'conversation_id' (found in data or derived).
 * 2. Other notifications are kept individual for now, or could be grouped by type if needed.
 */
export function groupNotifications(notifications: InAppNotification[]): (InAppNotification | NotificationGroup)[] {
    if (!notifications || notifications.length === 0) return [];

    // Since messages are now excluded from the notification center per user request, 
    // and we currently don't group other types, we just return the list as is.
    // We keep this function signature for potential future grouping of other types.

    return [...notifications];
}

/**
 * Type guard to check if an item is a NotificationGroup
 */
export function isNotificationGroup(item: InAppNotification | NotificationGroup): item is NotificationGroup {
    return (item as NotificationGroup).is_group === true;
}
