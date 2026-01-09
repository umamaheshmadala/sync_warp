// favoritesService.ts
// Backend service for managing user favorites (offers and products)
// Story 4.13: Unified favorites system

import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

export interface FavoriteOffer {
    id: string;
    title: string;
    description?: string;
    offer_code: string;
    valid_from: string;
    valid_until: string;
    business_id: string;
    business_name: string;
    business_logo?: string;
    icon_image_url?: string;
    favorited_at: string;
    view_count: number;
    share_count: number;
}

export interface FavoriteProduct {
    id: string;
    name: string;
    description?: string;
    price: number;
    image_urls: string[];
    business_id: string;
    business_name: string;
    is_available: boolean;
    is_featured: boolean;
    favorited_at: string;
}

export type FavoriteItemType = 'offer' | 'product';

class FavoritesService {
    /**
     * Toggle favorite status for an item
     * @param itemType - 'offer' or 'product'
     * @param itemId - UUID of the item
     * @returns true if favorited, false if unfavorited
     */
    async toggleFavorite(
        itemType: FavoriteItemType,
        itemId: string
    ): Promise<boolean> {
        try {
            const { data, error } = await supabase.rpc('toggle_favorite', {
                p_item_type: itemType,
                p_item_id: itemId
            });

            if (error) throw error;

            return data as boolean;
        } catch (error) {
            console.error('Error toggling favorite:', error);
            throw error;
        }
    }

    /**
     * Check if an item is favorited by the current user
     * @param itemType - 'offer' or 'product'
     * @param itemId - UUID of the item
     * @returns true if favorited, false otherwise
     */
    async isFavorited(
        itemType: FavoriteItemType,
        itemId: string
    ): Promise<boolean> {
        try {
            const {
                data: { user }
            } = await supabase.auth.getUser();

            if (!user) return false;

            const { data, error } = await supabase
                .from('user_favorites')
                .select('id')
                .eq('user_id', user.id)
                .eq('item_type', itemType)
                .eq('item_id', itemId)
                .maybeSingle();

            if (error) throw error;

            return !!data;
        } catch (error) {
            console.error('Error checking favorite status:', error);
            return false;
        }
    }

    /**
     * Get all favorited offers for the current user
     * @returns Array of favorited offers with full details
     */
    async getFavoriteOffers(): Promise<FavoriteOffer[]> {
        try {
            const {
                data: { user }
            } = await supabase.auth.getUser();

            if (!user) return [];

            const { data, error } = await supabase.rpc('get_user_favorite_offers', {
                p_user_id: user.id
            });

            if (error) throw error;

            return (data || []) as FavoriteOffer[];
        } catch (error) {
            console.error('Error fetching favorite offers:', error);
            return [];
        }
    }

    /**
     * Get all favorited products for the current user
     * @returns Array of favorited products with full details
     */
    async getFavoriteProducts(): Promise<FavoriteProduct[]> {
        try {
            const {
                data: { user }
            } = await supabase.auth.getUser();

            if (!user) return [];

            const { data, error } = await supabase.rpc('get_user_favorite_products', {
                p_user_id: user.id
            });

            if (error) throw error;

            return (data || []) as FavoriteProduct[];
        } catch (error) {
            console.error('Error fetching favorite products:', error);
            return [];
        }
    }

    /**
     * Remove a favorite
     * @param itemType - 'offer' or 'product'
     * @param itemId - UUID of the item
     */
    async removeFavorite(
        itemType: FavoriteItemType,
        itemId: string
    ): Promise<void> {
        try {
            const {
                data: { user }
            } = await supabase.auth.getUser();

            if (!user) throw new Error('User not authenticated');

            const { error } = await supabase
                .from('user_favorites')
                .delete()
                .eq('user_id', user.id)
                .eq('item_type', itemType)
                .eq('item_id', itemId);

            if (error) throw error;
        } catch (error) {
            console.error('Error removing favorite:', error);
            throw error;
        }
    }

    /**
     * Get favorite counts for the current user
     * @returns Object with counts for offers and products
     */
    async getFavoriteCounts(): Promise<{ offers: number; products: number }> {
        try {
            const {
                data: { user }
            } = await supabase.auth.getUser();

            if (!user) return { offers: 0, products: 0 };

            // Get offer count
            const { count: offerCount } = await supabase
                .from('user_favorites')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('item_type', 'offer');

            // Get product count
            const { count: productCount } = await supabase
                .from('user_favorites')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('item_type', 'product');

            return {
                offers: offerCount || 0,
                products: productCount || 0
            };
        } catch (error) {
            console.error('Error fetching favorite counts:', error);
            return { offers: 0, products: 0 };
        }
    }
}

export const favoritesService = new FavoritesService();
export default favoritesService;
