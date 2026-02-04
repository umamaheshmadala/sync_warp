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
    }
};
