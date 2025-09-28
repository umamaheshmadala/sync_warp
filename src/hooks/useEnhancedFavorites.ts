// useEnhancedFavorites.ts
// Enhanced favorites management hook with categories, sharing, and notifications

import { useState, useEffect, useCallback } from 'react';
import enhancedFavoritesService, {
  EnhancedFavorite,
  FavoriteCategory,
  FavoriteShare,
  FavoriteNotification,
  FavoriteFilter,
  FavoriteStats
} from '../services/enhancedFavoritesService';
import { useAuthStore } from '../store/authStore';

interface EnhancedFavoritesState {
  favorites: EnhancedFavorite[];
  categories: FavoriteCategory[];
  sharedFavorites: FavoriteShare[];
  notifications: FavoriteNotification[];
  stats: FavoriteStats;
  isLoading: boolean;
  error: string | null;
}

interface UseEnhancedFavoritesReturn extends EnhancedFavoritesState {
  // Categories management
  createCategory: (category: Omit<FavoriteCategory, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<FavoriteCategory>;
  updateCategory: (id: string, updates: Partial<FavoriteCategory>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  
  // Favorites management
  addToFavorites: (favorite: Omit<EnhancedFavorite, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  removeFromFavorites: (id: string) => Promise<void>;
  updateFavorite: (id: string, updates: Partial<EnhancedFavorite>) => Promise<void>;
  isFavorited: (itemId: string, itemType: string) => boolean;
  toggleFavorite: (itemId: string, itemType: string, itemData?: any) => Promise<void>;
  
  // Filtering and searching
  applyFilters: (filters: FavoriteFilter) => void;
  searchFavorites: (query: string, options?: { searchIn?: ('notes' | 'tags' | 'category')[] }) => Promise<EnhancedFavorite[]>;
  clearFilters: () => void;
  
  // Sharing
  shareFavorite: (favoriteId: string, shareWithUserId: string, permission: 'view' | 'edit', message?: string) => Promise<void>;
  respondToShare: (shareId: string, response: 'accepted' | 'declined') => Promise<void>;
  
  // Notifications
  markNotificationAsRead: (id: string) => Promise<void>;
  getUnreadNotificationsCount: () => number;
  
  // Bulk operations
  bulkUpdateFavorites: (favoriteIds: string[], updates: Partial<EnhancedFavorite>) => Promise<void>;
  bulkDeleteFavorites: (favoriteIds: string[]) => Promise<void>;
  
  // Import/Export
  importFavorites: (favorites: Array<Partial<EnhancedFavorite>>) => Promise<void>;
  exportFavorites: (format?: 'json' | 'csv') => Promise<string>;
  
  // Suggestions and trends
  getFavoriteSuggestions: () => Promise<any[]>;
  getTrendingFavorites: (timeframe?: '24h' | '7d' | '30d') => Promise<Array<{ item_id: string; item_type: string; count: number }>>;
  
  // Data refresh
  refreshData: () => Promise<void>;
}

export const useEnhancedFavorites = (): UseEnhancedFavoritesReturn => {
  const user = useAuthStore((state) => state.user);
  
  const [state, setState] = useState<EnhancedFavoritesState>({
    favorites: [],
    categories: [],
    sharedFavorites: [],
    notifications: [],
    stats: {
      total_favorites: 0,
      by_type: {},
      by_category: {},
      wishlist_count: 0,
      shared_count: 0,
      recent_activity: 0
    },
    isLoading: false,
    error: null
  });

  const [currentFilters, setCurrentFilters] = useState<FavoriteFilter>({});

  // Load initial data when user changes
  useEffect(() => {
    if (user) {
      loadAllData();
    } else {
      setState(prev => ({
        ...prev,
        favorites: [],
        categories: [],
        sharedFavorites: [],
        notifications: [],
        stats: {
          total_favorites: 0,
          by_type: {},
          by_category: {},
          wishlist_count: 0,
          shared_count: 0,
          recent_activity: 0
        }
      }));
    }
  }, [user]);

  // Reload favorites when filters change
  useEffect(() => {
    if (user && Object.keys(currentFilters).length > 0) {
      loadFavorites(currentFilters);
    }
  }, [currentFilters, user]);

  const loadAllData = useCallback(async () => {
    if (!user) return;
    
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const [favorites, categories, sharedFavorites, notifications, stats] = await Promise.all([
        enhancedFavoritesService.getFavorites(),
        enhancedFavoritesService.getCategories(),
        enhancedFavoritesService.getSharedFavorites(),
        enhancedFavoritesService.getNotifications(),
        enhancedFavoritesService.getFavoriteStats()
      ]);

      setState(prev => ({
        ...prev,
        favorites,
        categories,
        sharedFavorites,
        notifications,
        stats,
        isLoading: false
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load favorites data';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false
      }));
    }
  }, [user]);

  const loadFavorites = useCallback(async (filters?: FavoriteFilter) => {
    try {
      const favorites = await enhancedFavoritesService.getFavorites(filters);
      setState(prev => ({ ...prev, favorites }));
    } catch (error) {
      console.error('Failed to load favorites:', error);
    }
  }, []);

  // Categories management
  const createCategory = useCallback(async (category: Omit<FavoriteCategory, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<FavoriteCategory> => {
    try {
      const newCategory = await enhancedFavoritesService.createCategory(category);
      setState(prev => ({
        ...prev,
        categories: [...prev.categories, newCategory]
      }));
      return newCategory;
    } catch (error) {
      console.error('Failed to create category:', error);
      throw error;
    }
  }, []);

  const updateCategory = useCallback(async (id: string, updates: Partial<FavoriteCategory>): Promise<void> => {
    try {
      const updatedCategory = await enhancedFavoritesService.updateCategory(id, updates);
      setState(prev => ({
        ...prev,
        categories: prev.categories.map(cat => cat.id === id ? updatedCategory : cat)
      }));
    } catch (error) {
      console.error('Failed to update category:', error);
      throw error;
    }
  }, []);

  const deleteCategory = useCallback(async (id: string): Promise<void> => {
    try {
      await enhancedFavoritesService.deleteCategory(id);
      setState(prev => ({
        ...prev,
        categories: prev.categories.filter(cat => cat.id !== id)
      }));
    } catch (error) {
      console.error('Failed to delete category:', error);
      throw error;
    }
  }, []);

  // Favorites management
  const addToFavorites = useCallback(async (favorite: Omit<EnhancedFavorite, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<void> => {
    try {
      const newFavorite = await enhancedFavoritesService.addToFavorites(favorite);
      setState(prev => ({
        ...prev,
        favorites: [newFavorite, ...prev.favorites]
      }));
    } catch (error) {
      console.error('Failed to add to favorites:', error);
      throw error;
    }
  }, []);

  const removeFromFavorites = useCallback(async (id: string): Promise<void> => {
    try {
      await enhancedFavoritesService.removeFromFavorites(id);
      setState(prev => ({
        ...prev,
        favorites: prev.favorites.filter(fav => fav.id !== id)
      }));
    } catch (error) {
      console.error('Failed to remove from favorites:', error);
      throw error;
    }
  }, []);

  const updateFavorite = useCallback(async (id: string, updates: Partial<EnhancedFavorite>): Promise<void> => {
    try {
      const updatedFavorite = await enhancedFavoritesService.updateFavorite(id, updates);
      setState(prev => ({
        ...prev,
        favorites: prev.favorites.map(fav => fav.id === id ? updatedFavorite : fav)
      }));
    } catch (error) {
      console.error('Failed to update favorite:', error);
      throw error;
    }
  }, []);

  const isFavorited = useCallback((itemId: string, itemType: string): boolean => {
    return state.favorites.some(fav => fav.item_id === itemId && fav.item_type === itemType);
  }, [state.favorites]);

  const toggleFavorite = useCallback(async (itemId: string, itemType: string, itemData?: any): Promise<void> => {
    const existing = state.favorites.find(fav => fav.item_id === itemId && fav.item_type === itemType);
    
    if (existing) {
      await removeFromFavorites(existing.id);
    } else {
      await addToFavorites({
        item_id: itemId,
        item_type: itemType as 'business' | 'coupon' | 'product',
        tags: [],
        priority: 'medium',
        is_wishlist: false,
        shared_with: [],
        metadata: itemData || {}
      });
    }
  }, [state.favorites, addToFavorites, removeFromFavorites]);

  // Filtering and searching
  const applyFilters = useCallback((filters: FavoriteFilter) => {
    setCurrentFilters(filters);
  }, []);

  const searchFavorites = useCallback(async (query: string, options?: { searchIn?: ('notes' | 'tags' | 'category')[] }): Promise<EnhancedFavorite[]> => {
    try {
      return await enhancedFavoritesService.searchFavorites(query, options);
    } catch (error) {
      console.error('Failed to search favorites:', error);
      return [];
    }
  }, []);

  const clearFilters = useCallback(() => {
    setCurrentFilters({});
    loadFavorites(); // Load all favorites without filters
  }, [loadFavorites]);

  // Sharing
  const shareFavorite = useCallback(async (favoriteId: string, shareWithUserId: string, permission: 'view' | 'edit', message?: string): Promise<void> => {
    try {
      await enhancedFavoritesService.shareFavorite(favoriteId, shareWithUserId, permission, message);
      // Refresh shared favorites
      const sharedFavorites = await enhancedFavoritesService.getSharedFavorites();
      setState(prev => ({ ...prev, sharedFavorites }));
    } catch (error) {
      console.error('Failed to share favorite:', error);
      throw error;
    }
  }, []);

  const respondToShare = useCallback(async (shareId: string, response: 'accepted' | 'declined'): Promise<void> => {
    try {
      await enhancedFavoritesService.respondToShare(shareId, response);
      // Refresh shared favorites and notifications
      const [sharedFavorites, notifications] = await Promise.all([
        enhancedFavoritesService.getSharedFavorites(),
        enhancedFavoritesService.getNotifications()
      ]);
      setState(prev => ({ ...prev, sharedFavorites, notifications }));
    } catch (error) {
      console.error('Failed to respond to share:', error);
      throw error;
    }
  }, []);

  // Notifications
  const markNotificationAsRead = useCallback(async (id: string): Promise<void> => {
    try {
      await enhancedFavoritesService.markNotificationAsRead(id);
      setState(prev => ({
        ...prev,
        notifications: prev.notifications.map(notif => 
          notif.id === id ? { ...notif, is_read: true } : notif
        )
      }));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      throw error;
    }
  }, []);

  const getUnreadNotificationsCount = useCallback((): number => {
    return state.notifications.filter(notif => !notif.is_read).length;
  }, [state.notifications]);

  // Bulk operations
  const bulkUpdateFavorites = useCallback(async (favoriteIds: string[], updates: Partial<EnhancedFavorite>): Promise<void> => {
    try {
      await enhancedFavoritesService.bulkUpdateFavorites(favoriteIds, updates);
      // Refresh favorites
      await loadFavorites(currentFilters);
    } catch (error) {
      console.error('Failed to bulk update favorites:', error);
      throw error;
    }
  }, [loadFavorites, currentFilters]);

  const bulkDeleteFavorites = useCallback(async (favoriteIds: string[]): Promise<void> => {
    try {
      await enhancedFavoritesService.bulkDeleteFavorites(favoriteIds);
      setState(prev => ({
        ...prev,
        favorites: prev.favorites.filter(fav => !favoriteIds.includes(fav.id))
      }));
    } catch (error) {
      console.error('Failed to bulk delete favorites:', error);
      throw error;
    }
  }, []);

  // Import/Export
  const importFavorites = useCallback(async (favorites: Array<Partial<EnhancedFavorite>>): Promise<void> => {
    try {
      await enhancedFavoritesService.importFavorites(favorites);
      // Refresh all data
      await loadAllData();
    } catch (error) {
      console.error('Failed to import favorites:', error);
      throw error;
    }
  }, [loadAllData]);

  const exportFavorites = useCallback(async (format: 'json' | 'csv' = 'json'): Promise<string> => {
    try {
      return await enhancedFavoritesService.exportFavorites(format);
    } catch (error) {
      console.error('Failed to export favorites:', error);
      throw error;
    }
  }, []);

  // Suggestions and trends
  const getFavoriteSuggestions = useCallback(async (): Promise<any[]> => {
    try {
      return await enhancedFavoritesService.getFavoriteSuggestions();
    } catch (error) {
      console.error('Failed to get suggestions:', error);
      return [];
    }
  }, []);

  const getTrendingFavorites = useCallback(async (timeframe: '24h' | '7d' | '30d' = '7d'): Promise<Array<{ item_id: string; item_type: string; count: number }>> => {
    try {
      return await enhancedFavoritesService.getTrendingFavorites(timeframe);
    } catch (error) {
      console.error('Failed to get trending favorites:', error);
      return [];
    }
  }, []);

  // Data refresh
  const refreshData = useCallback(async (): Promise<void> => {
    await loadAllData();
  }, [loadAllData]);

  return {
    ...state,
    createCategory,
    updateCategory,
    deleteCategory,
    addToFavorites,
    removeFromFavorites,
    updateFavorite,
    isFavorited,
    toggleFavorite,
    applyFilters,
    searchFavorites,
    clearFilters,
    shareFavorite,
    respondToShare,
    markNotificationAsRead,
    getUnreadNotificationsCount,
    bulkUpdateFavorites,
    bulkDeleteFavorites,
    importFavorites,
    exportFavorites,
    getFavoriteSuggestions,
    getTrendingFavorites,
    refreshData
  };
};

// Specialized hook for just checking if items are favorited (lightweight)
export const useFavoriteChecker = () => {
  const [favoritedItems, setFavoritedItems] = useState<Set<string>>(new Set());
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (user) {
      loadFavoritedItems();
    } else {
      setFavoritedItems(new Set());
    }
  }, [user]);

  const loadFavoritedItems = async () => {
    try {
      const favorites = await enhancedFavoritesService.getFavorites();
      const itemKeys = favorites.map(fav => `${fav.item_id}-${fav.item_type}`);
      setFavoritedItems(new Set(itemKeys));
    } catch (error) {
      console.error('Failed to load favorited items:', error);
    }
  };

  const isFavorited = (itemId: string, itemType: string): boolean => {
    return favoritedItems.has(`${itemId}-${itemType}`);
  };

  const toggleFavorite = async (itemId: string, itemType: string, itemData?: any): Promise<void> => {
    const key = `${itemId}-${itemType}`;
    const isCurrentlyFavorited = favoritedItems.has(key);

    try {
      if (isCurrentlyFavorited) {
        // Remove from favorites
        const favorites = await enhancedFavoritesService.getFavorites();
        const existing = favorites.find(fav => fav.item_id === itemId && fav.item_type === itemType);
        if (existing) {
          await enhancedFavoritesService.removeFromFavorites(existing.id);
          setFavoritedItems(prev => {
            const newSet = new Set(prev);
            newSet.delete(key);
            return newSet;
          });
        }
      } else {
        // Add to favorites
        await enhancedFavoritesService.addToFavorites({
          item_id: itemId,
          item_type: itemType as 'business' | 'coupon' | 'product',
          tags: [],
          priority: 'medium',
          is_wishlist: false,
          shared_with: [],
          metadata: itemData || {}
        });
        setFavoritedItems(prev => new Set([...prev, key]));
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      throw error;
    }
  };

  return { isFavorited, toggleFavorite };
};

export default useEnhancedFavorites;