import { supabase } from '../lib/supabase';

export interface LikedByFriend {
    user_id: string;
    full_name: string;
    avatar_url: string;
}

export const productLikeService = {
    async likeProduct(productId: string, userId: string): Promise<{ error: any }> {
        const { error } = await supabase
            .from('product_likes')
            .insert({ product_id: productId, user_id: userId });
        return { error };
    },

    async unlikeProduct(productId: string, userId: string): Promise<{ error: any }> {
        const { error } = await supabase
            .from('product_likes')
            .delete()
            .match({ product_id: productId, user_id: userId });
        return { error };
    },

    async checkIsLiked(productId: string, userId: string): Promise<boolean> {
        const { data, error } = await supabase
            .from('product_likes')
            .select('id')
            .match({ product_id: productId, user_id: userId })
            .maybeSingle();

        return !!data && !error;
    },

    async getFriendsWhoLiked(productId: string, viewerId: string, limit = 2): Promise<LikedByFriend[]> {
        const { data, error } = await supabase.rpc('get_friends_who_liked_product', {
            p_product_id: productId,
            p_viewer_id: viewerId,
            p_limit: limit
        });

        if (error) {
            console.error('Error fetching friends who liked:', error);
            return [];
        }
        return data || [];
    },

    async notifyOwner(productId: string, likerId: string, interactionType?: 'like' | 'comment') {
        try {
            // 1. Fetch product to get owner and notification setting
            const { data: product } = await supabase
                .from('products')
                .select(`
                    id, 
                    name, 
                    notifications_enabled,
                    businesses!inner (
                        user_id
                    )
                `)
                .eq('id', productId)
                .single();

            if (!product) return;

            // Cast or safe access for joined data
            const productData = product as any;

            // 2. Check if notifications are enabled
            if (productData.notifications_enabled === false) {
                console.log('Notifications disabled for this product');
                return;
            }

            // JOIN returns an object for single relation usually, but sometimes array
            const businessFn = productData.businesses;
            const ownerId = Array.isArray(businessFn) ? businessFn[0]?.user_id : businessFn?.user_id;

            if (!ownerId) {
                console.warn('Owner ID not found for product', productId);
                return;
            }

            // Don't notify if owner likes their own product
            if (ownerId === likerId) return;

            // 3. Send notification (optimistic trigger, simplified)
            // Ideally we'd use a dedicated notification service or Edge Function
            // For now, triggering via RPC or similar mechanism if available, 
            // or just rely on Realtime if the owner is online.
            // Since we don't have a direct "send_notification" RPC exposed here easily without full payload construction,
            // we will log it. In a real scenario, this matches 'followedBusinessNotificationTrigger' pattern 
            // but targeted at the owner.

            // TODO: Call actual notification sender. 
            // For now, we assume the backend/Edge Function typically handles this on INSERT.
            // valid point: verify if we have a trigger on product_likes table? 
            // If yes, we need to modify the trigger function.
            // If no, we need to manually send it here.

            console.log(`[Mock] Sending like notification to owner ${ownerId} for product ${product.name}`);

        } catch (error) {
            console.error('Error notifying owner:', error);
        }
    }
};
