// enhancedFavoritesService.ts
// Enhanced favorites service with advanced filtering, categorization, sharing, and notifications

import { supabase } from '../lib/supabase';

export interface FavoriteCategory {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  created_at: string;
  updated_at: string;
}

export interface EnhancedFavorite {
  id: string;
  user_id: string;
  item_id: string;
  item_type: 'business' | 'coupon' | 'product';
  category_id?: string;
  category?: FavoriteCategory;
  tags: string[];
  notes?: string;
  priority: 'low' | 'medium' | 'high';
  is_wishlist: boolean;
  reminder_date?: string;
  shared_with: string[];
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface FavoriteShare {
  id: string;
  favorite_id: string;
  owner_id: string;
  shared_with_id: string;
  permission: 'view' | 'edit';
  message?: string;
  created_at: string;
  accepted_at?: string;
  status: 'pending' | 'accepted' | 'declined';
}

export interface FavoriteNotification {
  id: string;
  user_id: string;
  favorite_id: string;
  type: 'reminder' | 'share_received' | 'expiring_coupon' | 'price_drop' | 'back_in_stock';
  title: string;
  message: string;
  data: Record<string, any>;
  is_read: boolean;
  scheduled_for?: string;
  created_at: string;
}

export interface FavoriteFilter {
  categories?: string[];
  tags?: string[];
  itemTypes?: ('business' | 'coupon' | 'product')[];
  priority?: ('low' | 'medium' | 'high')[];
  isWishlist?: boolean;
  dateRange?: { start: Date; end: Date };
  searchQuery?: string;
}

export interface FavoriteStats {
  total_favorites: number;
  by_type: Record<string, number>;
  by_category: Record<string, number>;
  wishlist_count: number;
  shared_count: number;
  recent_activity: number;
}

class EnhancedFavoritesService {
  /**
   * Get user's favorite categories
   */
  async getCategories(): Promise<FavoriteCategory[]> {
    const { data, error } = await supabase
      .from('favorite_categories')
      .select('*')
      .order('name');

    if (error) throw error;
    return data || [];
  }

  /**
   * Create a new category
   */
  async createCategory(category: Omit<FavoriteCategory, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<FavoriteCategory> {
    const { data, error } = await supabase
      .from('favorite_categories')
      .insert({
        ...category,
        user_id: (await supabase.auth.getUser()).data.user?.id
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update a category
   */
  async updateCategory(id: string, updates: Partial<FavoriteCategory>): Promise<FavoriteCategory> {
    const { data, error } = await supabase
      .from('favorite_categories')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete a category
   */
  async deleteCategory(id: string): Promise<void> {
    const { error } = await supabase
      .from('favorite_categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Get enhanced favorites with filters
   */
  async getFavorites(filters?: FavoriteFilter): Promise<EnhancedFavorite[]> {
    let query = supabase
      .from('enhanced_favorites')
      .select(`
        *,
        category:favorite_categories(*)
      `)
      .order('updated_at', { ascending: false });

    // Apply filters
    if (filters?.categories?.length) {
      query = query.in('category_id', filters.categories);
    }

    if (filters?.itemTypes?.length) {
      query = query.in('item_type', filters.itemTypes);
    }

    if (filters?.priority?.length) {
      query = query.in('priority', filters.priority);
    }

    if (filters?.isWishlist !== undefined) {
      query = query.eq('is_wishlist', filters.isWishlist);
    }

    if (filters?.dateRange) {
      query = query
        .gte('created_at', filters.dateRange.start.toISOString())
        .lte('created_at', filters.dateRange.end.toISOString());
    }

    if (filters?.searchQuery) {
      query = query.or(`
        notes.ilike.%${filters.searchQuery}%,
        tags.cs.{${filters.searchQuery}}
      `);
    }

    if (filters?.tags?.length) {
      query = query.overlaps('tags', filters.tags);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  /**
   * Add item to favorites with enhanced features
   */
  async addToFavorites(favorite: Omit<EnhancedFavorite, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<EnhancedFavorite> {
    const { data, error } = await supabase
      .from('enhanced_favorites')
      .insert({
        ...favorite,
        user_id: (await supabase.auth.getUser()).data.user?.id
      })
      .select(`
        *,
        category:favorite_categories(*)
      `)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update favorite
   */
  async updateFavorite(id: string, updates: Partial<EnhancedFavorite>): Promise<EnhancedFavorite> {
    const { data, error } = await supabase
      .from('enhanced_favorites')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        category:favorite_categories(*)
      `)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Remove from favorites
   */
  async removeFromFavorites(id: string): Promise<void> {
    const { error } = await supabase
      .from('enhanced_favorites')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Check if item is favorited
   */
  async isFavorited(itemId: string, itemType: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('enhanced_favorites')
      .select('id')
      .eq('item_id', itemId)
      .eq('item_type', itemType)
      .limit(1);

    if (error) return false;
    return (data?.length || 0) > 0;
  }

  /**
   * Get favorite stats
   */
  async getFavoriteStats(): Promise<FavoriteStats> {
    const { data, error } = await supabase
      .from('favorite_stats')
      .select('*')
      .single();

    if (error) {
      // Return default stats if view doesn't exist yet
      return {
        total_favorites: 0,
        by_type: {},
        by_category: {},
        wishlist_count: 0,
        shared_count: 0,
        recent_activity: 0
      };
    }

    return data;
  }

  /**
   * Share a favorite with another user
   */
  async shareFavorite(favoriteId: string, shareWithUserId: string, permission: 'view' | 'edit', message?: string): Promise<FavoriteShare> {
    const { data, error } = await supabase
      .from('favorite_shares')
      .insert({
        favorite_id: favoriteId,
        owner_id: (await supabase.auth.getUser()).data.user?.id,
        shared_with_id: shareWithUserId,
        permission,
        message,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;

    // Create notification for the recipient
    await this.createNotification(shareWithUserId, {
      type: 'share_received',
      favorite_id: favoriteId,
      title: 'Favorite Shared With You',
      message: message || 'Someone shared a favorite with you',
      data: { share_id: data.id, permission }
    });

    return data;
  }

  /**
   * Get shared favorites (received)
   */
  async getSharedFavorites(): Promise<FavoriteShare[]> {
    const { data, error } = await supabase
      .from('favorite_shares')
      .select(`
        *,
        favorite:enhanced_favorites(*),
        owner:profiles!owner_id(full_name, avatar_url)
      `)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Accept or decline a shared favorite
   */
  async respondToShare(shareId: string, response: 'accepted' | 'declined'): Promise<void> {
    const { error } = await supabase
      .from('favorite_shares')
      .update({
        status: response,
        accepted_at: response === 'accepted' ? new Date().toISOString() : null
      })
      .eq('id', shareId);

    if (error) throw error;
  }

  /**
   * Create a notification
   */
  async createNotification(userId: string, notification: Omit<FavoriteNotification, 'id' | 'user_id' | 'is_read' | 'created_at'>): Promise<FavoriteNotification> {
    const { data, error } = await supabase
      .from('favorite_notifications')
      .insert({
        ...notification,
        user_id: userId,
        is_read: false
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get user's notifications
   */
  async getNotifications(unreadOnly: boolean = false): Promise<FavoriteNotification[]> {
    let query = supabase
      .from('favorite_notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(id: string): Promise<void> {
    const { error } = await supabase
      .from('favorite_notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Set reminder for favorite
   */
  async setReminder(favoriteId: string, reminderDate: Date, message?: string): Promise<void> {
    // Update the favorite with reminder date
    await this.updateFavorite(favoriteId, {
      reminder_date: reminderDate.toISOString()
    });

    // Create scheduled notification
    await this.createNotification((await supabase.auth.getUser()).data.user?.id!, {
      type: 'reminder',
      favorite_id: favoriteId,
      title: 'Favorite Reminder',
      message: message || 'You have a reminder for one of your favorites',
      data: {},
      scheduled_for: reminderDate.toISOString()
    });
  }

  /**
   * Import favorites from external source
   */
  async importFavorites(favorites: Array<Partial<EnhancedFavorite>>): Promise<EnhancedFavorite[]> {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) throw new Error('User not authenticated');

    const favoritesToInsert = favorites.map(favorite => ({
      ...favorite,
      user_id: userId,
      tags: favorite.tags || [],
      metadata: favorite.metadata || {},
      priority: favorite.priority || 'medium',
      is_wishlist: favorite.is_wishlist || false,
      shared_with: favorite.shared_with || []
    }));

    const { data, error } = await supabase
      .from('enhanced_favorites')
      .insert(favoritesToInsert)
      .select(`
        *,
        category:favorite_categories(*)
      `);

    if (error) throw error;
    return data || [];
  }

  /**
   * Export favorites
   */
  async exportFavorites(format: 'json' | 'csv' = 'json'): Promise<string> {
    const favorites = await this.getFavorites();

    if (format === 'json') {
      return JSON.stringify(favorites, null, 2);
    } else {
      // Convert to CSV
      const headers = [
        'ID', 'Item ID', 'Item Type', 'Category', 'Tags', 
        'Notes', 'Priority', 'Is Wishlist', 'Created At'
      ];
      
      const rows = favorites.map(favorite => [
        favorite.id,
        favorite.item_id,
        favorite.item_type,
        favorite.category?.name || '',
        favorite.tags.join(';'),
        favorite.notes || '',
        favorite.priority,
        favorite.is_wishlist ? 'Yes' : 'No',
        favorite.created_at
      ]);

      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }
  }

  /**
   * Bulk operations
   */
  async bulkUpdateFavorites(favoriteIds: string[], updates: Partial<EnhancedFavorite>): Promise<void> {
    const { error } = await supabase
      .from('enhanced_favorites')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .in('id', favoriteIds);

    if (error) throw error;
  }

  async bulkDeleteFavorites(favoriteIds: string[]): Promise<void> {
    const { error } = await supabase
      .from('enhanced_favorites')
      .delete()
      .in('id', favoriteIds);

    if (error) throw error;
  }

  /**
   * Get suggestions based on user's favorites
   */
  async getFavoriteSuggestions(limit: number = 10): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_favorite_suggestions', { suggestion_limit: limit });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.warn('Failed to get suggestions:', error);
      return [];
    }
  }

  /**
   * Search favorites with advanced options
   */
  async searchFavorites(query: string, options?: {
    searchIn?: ('notes' | 'tags' | 'category')[];
    fuzzy?: boolean;
    limit?: number;
  }): Promise<EnhancedFavorite[]> {
    const searchIn = options?.searchIn || ['notes', 'tags', 'category'];
    const limit = options?.limit || 50;

    let searchQuery = '';
    const searchConditions = [];

    if (searchIn.includes('notes')) {
      searchConditions.push(`notes.ilike.%${query}%`);
    }
    if (searchIn.includes('tags')) {
      searchConditions.push(`tags.cs.{${query}}`);
    }
    if (searchIn.includes('category')) {
      searchConditions.push(`category.name.ilike.%${query}%`);
    }

    searchQuery = searchConditions.join(',');

    const { data, error } = await supabase
      .from('enhanced_favorites')
      .select(`
        *,
        category:favorite_categories(*)
      `)
      .or(searchQuery)
      .limit(limit)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get trending favorites (most popular items)
   */
  async getTrendingFavorites(timeframe: '24h' | '7d' | '30d' = '7d'): Promise<Array<{ item_id: string; item_type: string; count: number }>> {
    try {
      const { data, error } = await supabase
        .rpc('get_trending_favorites', { timeframe_days: timeframe === '24h' ? 1 : timeframe === '7d' ? 7 : 30 });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.warn('Failed to get trending favorites:', error);
      return [];
    }
  }
}

export const enhancedFavoritesService = new EnhancedFavoritesService();
export default enhancedFavoritesService;