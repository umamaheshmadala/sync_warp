import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

export interface FavoriteProduct {
    id: string; // Product ID
    name: string;
    description?: string;
    price: number;
    image_urls: string[];
    business_id: string;
    business_name: string;
    is_available: boolean;
    favorited_at: string;
}

export const productFavoriteService = {
    /**
     * Add a product to favorites
     */
    async addFavorite(productId: string): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Must be logged in');

        const { error } = await supabase.from('user_favorites').insert({
            user_id: user.id,
            item_type: 'product',
            item_id: productId
        });

        if (error) {
            // Context: Duplicate key error is fine (already favorited)
            if (error.code === '23505') return;
            throw error;
        }
    },

    /**
     * Remove a product from favorites
     */
    async removeFavorite(productId: string): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Must be logged in');

        const { error } = await supabase.from('user_favorites')
            .delete()
            .match({
                user_id: user.id,
                item_type: 'product',
                item_id: productId
            });

        if (error) throw error;
    },

    /**
     * Check if a product is favorited
     */
    async isFavorite(productId: string): Promise<boolean> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        const { data } = await supabase
            .from('user_favorites')
            .select('id')
            .match({
                user_id: user.id,
                item_type: 'product',
                item_id: productId
            })
            .maybeSingle();

        return !!data;
    },

    /**
     * Toggle favorite status
     * @returns New status (true = favorited, false = unfavorited)
     */
    async toggleFavorite(productId: string): Promise<boolean> {
        try {
            // We use the RPC if available for atomic toggle, or manual check
            // Based on favoritesService.ts, there is a 'toggle_favorite' RPC
            const { data, error } = await supabase.rpc('toggle_favorite', {
                p_item_type: 'product',
                p_item_id: productId
            });

            if (error) throw error;
            return data as boolean;
        } catch (error) {
            console.error('Error toggling product favorite:', error);
            // Fallback to manual check-then-act if RPC fails
            const isFav = await this.isFavorite(productId);
            if (isFav) {
                await this.removeFavorite(productId);
                return false;
            } else {
                await this.addFavorite(productId);
                return true;
            }
        }
    },

    /**
     * Get all favorite products for the current user
     */
    async getFavoriteProducts(): Promise<FavoriteProduct[]> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        // Assuming there's a view or we join manually. 
        // Based on favoritesService.ts, there is 'get_user_favorite_products' RPC
        const { data, error } = await supabase.rpc('get_user_favorite_products', {
            p_user_id: user.id
        });

        if (error) {
            console.error('Error fetching favorite products:', error);
            return [];
        }

        return data as FavoriteProduct[];
    }
};
