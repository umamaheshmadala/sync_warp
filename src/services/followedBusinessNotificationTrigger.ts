import { supabase } from '../lib/supabase';
import { Product } from '../types/product';
import { Offer } from '../types/offers';
import { Coupon } from '../types/coupon';

type NotificationChannel = 'in_app' | 'push' | 'email' | 'sms' | 'all';

interface FollowerPreference {
    user_id: string;
    notification_preferences: {
        new_products: boolean;
        new_offers: boolean;
        new_coupons: boolean;
        announcements: boolean;
    };
    notification_channel: NotificationChannel;
}

/**
 * Service to handle triggering notifications when a business posts new content.
 * Follows the 'Fan Out' pattern: 1 Event -> N Notifications
 */
export const followedBusinessNotificationTrigger = {

    /**
     * Notify followers about a new product
     */
    async notifyNewProduct(businessId: string, product: Product) {
        try {
            console.log(`[NotificationTrigger] Processing new product for business ${businessId}`);

            // Get current user (sender)
            const { data: { user } } = await supabase.auth.getUser();
            const senderId = user?.id;

            if (!senderId) {
                console.error('[NotificationTrigger] No authenticated user found to be sender.');
                return;
            }

            // 1. Get followers who want 'new_products' updates
            const followers = await this.getTargetFollowers(businessId, 'new_products');

            if (followers.length === 0) return;

            const businessName = await this.getBusinessName(businessId);

            // 2. Create notifications for each follower
            const notifications = followers.map(follower => ({
                user_id: follower.user_id,
                sender_id: senderId, // MUST be a user_id that exists in profiles
                type: 'business', // Using 'business' as generic type for now, could be 'product' if added to router
                title: `New Product from ${businessName}`,
                body: `Check out our new product: ${product.name}`,
                data: {
                    businessId,
                    productId: product.id,
                    type: 'new_product',
                    url: `/business/${businessId}` // Fallback URL
                },
                channel: follower.notification_channel
            }));

            // 3. Send them
            await this.sendNotifications(notifications);

        } catch (error) {
            console.error('[NotificationTrigger] Error notifying new product:', error);
        }
    },

    /**
     * Notify followers about a new offer
     */
    async notifyNewOffer(businessId: string, offer: Offer) {
        try {
            if (!businessId) {
                console.error('[NotificationTrigger] businessId is undefined! Aborting.');
                return;
            }

            // Get current user (sender)
            const { data: { user } } = await supabase.auth.getUser();
            const senderId = user?.id; // Use authenticated user ID as sender

            if (!senderId) {
                console.error('[NotificationTrigger] No authenticated user found to be sender.');
                // Ideally we might fallback to a system user or handle this, but for now we need a valid profile ID.
                // If this is running in a context without auth (unlikely for create offer), we have a problem.
                return;
            }

            const followers = await this.getTargetFollowers(businessId, 'new_offers');

            if (followers.length === 0) {
                return;
            }

            const businessName = await this.getBusinessName(businessId);

            const notifications = followers.map(follower => ({
                user_id: follower.user_id,
                sender_id: senderId, // MUST be a user_id that exists in profiles
                type: 'offer',
                title: `New Offer from ${businessName}`,
                body: `${offer.title} - ${offer.description?.substring(0, 50) || ''}...`,
                data: {
                    businessId,
                    offerId: offer.id,
                    type: 'offer'
                },
                channel: follower.notification_channel
            }));

            await this.sendNotifications(notifications);

        } catch (error) {
            console.error('[NotificationTrigger] Error notifying new offer:', error);
        }
    },

    /**
     * Notify followers about a new coupon
     */
    async notifyNewCoupon(businessId: string, coupon: Coupon) {
        try {
            const followers = await this.getTargetFollowers(businessId, 'new_coupons');
            if (followers.length === 0) return;

            const businessName = await this.getBusinessName(businessId);

            const notifications = followers.map(follower => ({
                user_id: follower.user_id,
                sender_id: businessId,
                type: 'business', // Router doesn't have 'coupon' yet, linking to business
                title: `New Coupon from ${businessName}!`,
                body: `Save with: ${coupon.coupon_code} - ${coupon.title}`,
                data: {
                    businessId,
                    couponId: coupon.id,
                    code: coupon.coupon_code,
                    type: 'new_coupon'
                },
                channel: follower.notification_channel
            }));

            await this.sendNotifications(notifications);

        } catch (error) {
            console.error('[NotificationTrigger] Error notifying new coupon:', error);
        }
    },

    // --- Helpers ---

    async getTargetFollowers(businessId: string, preferenceKey: string): Promise<FollowerPreference[]> {
        console.log(`[NotificationTrigger] Fetching followers for business ${businessId} with preference key "${preferenceKey}"`);

        const { data, error } = await supabase
            .from('business_followers')
            .select('user_id, notification_preferences, notification_channel')
            .eq('business_id', businessId)
            .eq('is_active', true);

        if (error) {
            console.error('[NotificationTrigger] Fetch followers failed:', error);
            return [];
        }

        console.log(`[NotificationTrigger] Total followers found: ${data?.length}`);

        const filtered = (data as any[]).filter(f => {
            const prefs = f.notification_preferences;
            if (!prefs) return true; // Default to true if no preferences set
            return prefs[preferenceKey] === true;
        });

        console.log(`[NotificationTrigger] Final filtered count: ${filtered.length}`);
        return filtered;
    },

    async getBusinessName(businessId: string): Promise<string> {
        const { data } = await supabase
            .from('businesses')
            .select('business_name')
            .eq('id', businessId)
            .single();
        return data?.business_name || 'A Business';
    },

    async sendNotifications(notifications: any[]) {
        // 1. Insert In-App Notifications (Batch) using RPC to bypass RLS
        // Map to structure expected by RPC (which maps to table columns)
        const dbNotifications = notifications.map(n => ({
            user_id: n.user_id,
            sender_id: n.sender_id,
            notification_type: n.type,
            title: n.title,
            body: n.body,
            data: n.data,
            // 'channel' is mapped to 'platform' in the RPC.
            // valid values for platform are: 'web', 'android', 'ios'.
            // promoting 'in_app' to 'web' as a safe default for database storage
            channel: 'web'
        }));

        const { error: dbError } = await supabase.rpc('send_targeted_notifications', {
            notifications: dbNotifications
        });

        if (dbError) {
            console.error('[NotificationTrigger] RPC Insert failed:', JSON.stringify(dbError, null, 2));
        } else {
            console.log(`[NotificationTrigger] Sent ${dbNotifications.length} in-app notifications`);
        }

        // 2. Trigger Push Notifications for those who opted in
        const pushTargets = notifications.filter(n => n.channel === 'push' || n.channel === 'all');

        if (pushTargets.length > 0) {
            await Promise.all(pushTargets.map(target => this.sendPush(target)));
        }
    },

    async sendPush(notification: any) {
        try {
            // Invoke the Edge Function 'send-push-notification'
            const { error } = await supabase.functions.invoke('send-push-notification', {
                body: {
                    userId: notification.user_id,
                    title: notification.title,
                    body: notification.body,
                    data: notification.data
                }
            });

            if (error) throw error;
        } catch (err) {
            console.warn(`[NotificationTrigger] Push failed for user ${notification.user_id}:`, err);
        }
    }
};
