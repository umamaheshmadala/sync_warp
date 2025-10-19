// simpleFavoritesService.ts
// Simple favorites service using the existing 'favorites' table
// This replaces the enhanced favorites service that requires tables that don't exist

import { supabase } from '../lib/supabase';

export interface SimpleFavorite {
  id: string;
  user_id: string;
  entity_type: 'business' | 'product' | 'coupon';
  entity_id: string;
  created_at: string;
}

class SimpleFavoritesService {
  /**
   * Get all favorites for the current user
   */
  async getFavorites(entityType?: 'business' | 'product' | 'coupon'): Promise<SimpleFavorite[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Note: Products and coupons are not migrated to business_followers in Story 4.11
    // Business favorites should use business_followers table via useBusinessFollowing hook
    // For now, product/coupon favorites return empty until their own tables are created
    
    // Check if favorites table exists by attempting a query
    let query = supabase
      .from('favorites')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (entityType) {
      query = query.eq('entity_type', entityType);
    }

    const { data, error } = await query;
    
    // If table doesn't exist (PGRST205 = relation not found), return empty array
    if (error && (error.code === 'PGRST204' || error.code === 'PGRST205')) {
      console.warn('Favorites table does not exist yet. Products/coupons not yet migrated.');
      return [];
    }
    
    if (error) throw error;
    return data || [];
  }

  /**
   * Add item to favorites
   */
  async addToFavorites(entityType: 'business' | 'product' | 'coupon', entityId: string): Promise<SimpleFavorite> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Note: Business favorites should use business_followers table via useBusinessFollowing hook
    if (entityType === 'business') {
      throw new Error('Use useBusinessFollowing hook for business favorites. Story 4.11 migrated to business_followers table.');
    }

    // Check if already favorited
    const existing = await this.isFavorited(entityType, entityId);
    if (existing) {
      return existing;
    }

    const { data, error } = await supabase
      .from('favorites')
      .insert({
        user_id: user.id,
        entity_type: entityType,
        entity_id: entityId
      })
      .select()
      .single();

    // If table doesn't exist, throw informative error
    if (error && (error.code === 'PGRST204' || error.code === 'PGRST205')) {
      throw new Error('Product/coupon favorites not yet implemented. Coming soon!');
    }

    if (error) throw error;
    return data;
  }

  /**
   * Remove from favorites
   */
  async removeFromFavorites(favoriteId: string): Promise<void> {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('id', favoriteId);

    if (error) throw error;
  }

  /**
   * Remove by entity
   */
  async removeByEntity(entityType: 'business' | 'product' | 'coupon', entityId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId);

    if (error) throw error;
  }

  /**
   * Check if item is favorited
   */
  async isFavorited(entityType: 'business' | 'product' | 'coupon', entityId: string): Promise<SimpleFavorite | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', user.id)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .maybeSingle();

    // If table doesn't exist, return null (not favorited)
    if (error && (error.code === 'PGRST204' || error.code === 'PGRST205')) {
      return null;
    }

    if (error) throw error;
    return data;
  }

  /**
   * Toggle favorite status
   */
  async toggleFavorite(entityType: 'business' | 'product' | 'coupon', entityId: string): Promise<boolean> {
    const existing = await this.isFavorited(entityType, entityId);
    
    if (existing) {
      await this.removeFromFavorites(existing.id);
      return false; // removed
    } else {
      await this.addToFavorites(entityType, entityId);
      return true; // added
    }
  }

  /**
   * Get favorites count by type
   */
  async getCountByType(entityType?: 'business' | 'product' | 'coupon'): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    let query = supabase
      .from('favorites')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (entityType) {
      query = query.eq('entity_type', entityType);
    }

    const { count, error } = await query;
    if (error) throw error;
    return count || 0;
  }
}

export const simpleFavoritesService = new SimpleFavoritesService();
export default simpleFavoritesService;
