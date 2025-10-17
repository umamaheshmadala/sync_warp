// useSimpleFavorites.ts
// Simple, reliable favorites implementation without complex caching or race conditions

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { toast } from 'react-hot-toast';

export interface FavoriteItem {
  id: string;
  type: 'business' | 'coupon';
  item_id: string;
  created_at: string;
  item_data?: any; // Full business or coupon data when available
}

interface FavoritesState {
  favorites: FavoriteItem[];
  isLoading: boolean;
  error: string | null;
}

export const useSimpleFavorites = () => {
  const { user } = useAuthStore();
  const [state, setState] = useState<FavoritesState>({
    favorites: [],
    isLoading: false,
    error: null
  });

  // Ensure user profile exists (needed for foreign key constraints)
  const ensureUserProfile = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .insert({ id: user.id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .select()
        .single();
      
      // Ignore conflict errors - profile already exists
      if (error && error.code !== '23505') {
        console.warn('Could not ensure profile exists:', error);
      }
    } catch (error) {
      // Ignore errors - profile might already exist
      console.warn('Profile check/creation error:', error);
    }
  }, [user?.id]);

  // Simple check if item is favorited
  const isFavorited = useCallback((itemId: string, type: 'business' | 'coupon'): boolean => {
    return state.favorites.some(fav => fav.item_id === itemId && fav.type === type);
  }, [state.favorites]);

  // Get counts by type
  const getCounts = useCallback(() => {
    const businesses = state.favorites.filter(f => f.type === 'business').length;
    const coupons = state.favorites.filter(f => f.type === 'coupon').length;
    return { businesses, coupons, total: businesses + coupons };
  }, [state.favorites]);

  // Load all favorites from database
  const loadFavorites = useCallback(async () => {
    if (!user?.id) {
      setState({ favorites: [], isLoading: false, error: null });
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Load all favorites from unified table
      const { data: businessFavs, error: businessError } = await supabase
        .from('favorites')
        .select('id, entity_id, created_at')
        .eq('user_id', user.id)
        .eq('entity_type', 'business')
        .order('created_at', { ascending: false });

      const { data: couponFavs, error: couponError } = await supabase
        .from('favorites')
        .select('id, entity_id, created_at')
        .eq('user_id', user.id)
        .eq('entity_type', 'coupon')
        .order('created_at', { ascending: false });

      // Handle foreign key constraint errors gracefully
      if (businessError) {
        console.warn('Business favorites error:', businessError);
        if (businessError.code === '23503') {
          console.log('User profile missing, creating one...');
          try {
            await supabase
              .from('profiles')
              .insert({ id: user.id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
              .select()
              .single();
            console.log('Profile created for favorites loading');
          } catch (profileError) {
            console.warn('Could not create profile:', profileError);
          }
        }
      }
      if (couponError) {
        console.warn('Coupon favorites error:', couponError);
      }

      // Combine and format favorites
      const allFavorites: FavoriteItem[] = [
        ...(businessFavs || []).map(item => ({
          id: item.id,
          type: 'business' as const,
          item_id: item.entity_id,
          created_at: item.created_at,
          item_data: null
        })),
        ...(couponFavs || []).map(item => ({
          id: item.id,
          type: 'coupon' as const,
          item_id: item.entity_id,
          created_at: item.created_at,
          item_data: null
        }))
      ];

      // Sort by created_at
      allFavorites.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setState({
        favorites: allFavorites,
        isLoading: false,
        error: null
      });

    } catch (error) {
      console.error('Error loading favorites:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load favorites'
      }));
    }
  }, [user?.id]);

  // Toggle favorite status
  const toggleFavorite = useCallback(async (itemId: string, type: 'business' | 'coupon'): Promise<boolean> => {
    if (!user?.id) {
      toast.error('Please sign in to save favorites');
      return false;
    }

    const isCurrentlyFavorited = isFavorited(itemId, type);
    
    try {
      if (type === 'business') {
        // Check if table exists first
        console.log('Attempting business favorites operation:', { isCurrentlyFavorited, itemId, userId: user.id });
        
        if (isCurrentlyFavorited) {
          // Remove from favorites
          const { error } = await supabase
            .from('favorites')
            .delete()
            .eq('user_id', user.id)
            .eq('entity_type', 'business')
            .eq('entity_id', itemId);
          
          if (error) {
            console.error('Business favorites delete error:', error);
            throw error;
          }
          
          // Update local state immediately
          setState(prev => ({
            ...prev,
            favorites: prev.favorites.filter(f => !(f.item_id === itemId && f.type === 'business'))
          }));
          
          toast.success('Removed from favorites');
          return false;
        } else {
          // Add to favorites
          const { error } = await supabase
            .from('favorites')
            .insert({ user_id: user.id, entity_type: 'business', entity_id: itemId });
          
          if (error) {
            console.error('Business favorites insert error:', error);
            // Try to provide more helpful error message
            if (error.code === '23503') {
              // Foreign key constraint failed - try to create profile and retry
              console.log('Attempting to create user profile...');
              try {
                await supabase
                  .from('profiles')
                  .insert({ id: user.id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
                  .select()
                  .single();
                
                console.log('Profile created, retrying favorites insert...');
                // Retry the favorites insert
                const { error: retryError } = await supabase
                  .from('favorites')
                  .insert({ user_id: user.id, entity_type: 'business', entity_id: itemId });
                
                if (retryError) {
                  throw new Error(`Failed even after creating profile: ${retryError.message}`);
                }
                
                console.log('Favorites insert succeeded after profile creation');
              } catch (profileError) {
                throw new Error(`Profile creation failed: ${profileError}`);
              }
            } else {
              throw new Error(`Database error: ${error.message}`);
            }
            throw error;
          }
          
          // Update local state immediately
          const newFavorite: FavoriteItem = {
            id: `temp-${Date.now()}`, // Temporary ID until reload
            type: 'business',
            item_id: itemId,
            created_at: new Date().toISOString()
          };
          
          setState(prev => ({
            ...prev,
            favorites: [newFavorite, ...prev.favorites]
          }));
          
          toast.success('Added to favorites');
          return true;
        }
      } else if (type === 'coupon') {
        if (isCurrentlyFavorited) {
          // Remove from favorites
          const { error } = await supabase
            .from('favorites')
            .delete()
            .eq('user_id', user.id)
            .eq('entity_type', 'coupon')
            .eq('entity_id', itemId);
          
          if (error) throw error;
          
          // Update local state immediately
          setState(prev => ({
            ...prev,
            favorites: prev.favorites.filter(f => !(f.item_id === itemId && f.type === 'coupon'))
          }));
          
          toast.success('Removed from favorites');
          return false;
        } else {
          // Add to favorites
          const { error } = await supabase
            .from('favorites')
            .insert({ user_id: user.id, entity_type: 'coupon', entity_id: itemId });
          
          if (error) throw error;
          
          // Update local state immediately
          const newFavorite: FavoriteItem = {
            id: `temp-${Date.now()}`, // Temporary ID until reload
            type: 'coupon',
            item_id: itemId,
            created_at: new Date().toISOString()
          };
          
          setState(prev => ({
            ...prev,
            favorites: [newFavorite, ...prev.favorites]
          }));
          
          toast.success('Added to favorites');
          return true;
        }
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      console.error('Error details:', {
        itemId,
        type,
        isCurrentlyFavorited,
        userId: user?.id,
        error: error
      });
      const errorMessage = error instanceof Error ? error.message : 'Failed to update favorites';
      toast.error(`Failed to update favorites: ${errorMessage}`);
      return isCurrentlyFavorited; // Return current state on error
    }

    return false;
  }, [user?.id, isFavorited]);

  // Ensure profile exists and load favorites when user changes
  useEffect(() => {
    if (user?.id) {
      ensureUserProfile().then(() => {
        loadFavorites();
      });
    } else {
      loadFavorites();
    }
  }, [user?.id, ensureUserProfile, loadFavorites]);

  // Get favorites by type
  const getFavoritesByType = useCallback((type: 'business' | 'coupon') => {
    return state.favorites.filter(f => f.type === type);
  }, [state.favorites]);

  return {
    // State
    favorites: state.favorites,
    isLoading: state.isLoading,
    error: state.error,
    isAuthenticated: !!user?.id,
    
    // Computed values
    counts: getCounts(),
    
    // Actions
    toggleFavorite,
    loadFavorites,
    isFavorited,
    getFavoritesByType,
    
    // Legacy compatibility
    isBusinessFavorited: (id: string) => isFavorited(id, 'business'),
    isCouponFavorited: (id: string) => isFavorited(id, 'coupon'),
    toggleBusinessFavorite: (id: string) => toggleFavorite(id, 'business'),
    toggleCouponFavorite: (id: string) => toggleFavorite(id, 'coupon'),
    refresh: loadFavorites
  };
};

export default useSimpleFavorites;