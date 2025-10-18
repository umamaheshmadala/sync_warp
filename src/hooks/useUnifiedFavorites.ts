// useUnifiedFavorites.ts
// Unified favorites system that combines localStorage for instant UI feedback
// with optional database synchronization for persistence across devices

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';

// Local storage key factory - creates user-specific keys
const getStorageKey = (userId?: string) => {
  return userId ? `sync_unified_favorites_${userId}` : 'sync_unified_favorites_guest';
};

// Events for cross-component communication
const FAVORITES_UPDATED_EVENT = 'favoritesUpdated';

interface UnifiedFavorite {
  id: string;
  type: 'business' | 'coupon' | 'product';
  timestamp: number;
  synced?: boolean; // Whether it's been synced to database
  itemData?: any; // Optional cached item data
}

interface FavoritesState {
  favorites: UnifiedFavorite[];
  counts: {
    businesses: number;
    coupons: number;
    products: number;
    total: number;
  };
  isLoading: boolean;
  error: string | null;
}

// Global state for cross-component synchronization
let globalFavorites: UnifiedFavorite[] = [];
let globalListeners: Array<(favorites: UnifiedFavorite[]) => void> = [];

// Load favorites from localStorage for a specific user
const loadFromStorage = (userId?: string): UnifiedFavorite[] => {
  try {
    const stored = localStorage.getItem(getStorageKey(userId));
    if (stored) {
      const parsed = JSON.parse(stored) as UnifiedFavorite[];
      // Ensure all favorites have required fields and migrate old data
      return parsed.map(fav => {
        const migrated = {
          ...fav,
          synced: fav.synced ?? false,
          timestamp: fav.timestamp || Date.now()
        };
        
        // Migration: Handle old favorites without proper itemData
        if (!migrated.itemData && migrated.type === 'business') {
          migrated.itemData = {
            business_name: `Business ${migrated.id.substring(0, 8)}...`,
            business_type: 'Unknown',
            address: 'Location not available'
          };
        } else if (!migrated.itemData && migrated.type === 'coupon') {
          migrated.itemData = {
            title: `Coupon ${migrated.id.substring(0, 8)}...`,
            description: 'Details not available',
            business_name: 'Unknown Business'
          };
        } else if (!migrated.itemData && migrated.type === 'product') {
          migrated.itemData = {
            name: `Product ${migrated.id.substring(0, 8)}...`,
            description: 'Details not available',
            price: 'N/A'
          };
        }
        
        return migrated;
      });
    }
  } catch (error) {
    console.warn('Could not load favorites from localStorage:', error);
  }
  return [];
};

// Save favorites to localStorage for a specific user
const saveToStorage = (favorites: UnifiedFavorite[], userId?: string) => {
  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(favorites));
  } catch (error) {
    console.warn('Could not save favorites to localStorage:', error);
  }
};

// Initialize global state - will be loaded per user in hook
let currentUserId: string | undefined = undefined;

// Notify all components of favorites changes
const notifyListeners = () => {
  globalListeners.forEach(listener => listener([...globalFavorites]));
  
  // Also dispatch a custom event for components not using this hook
  window.dispatchEvent(new CustomEvent(FAVORITES_UPDATED_EVENT, {
    detail: { favorites: globalFavorites }
  }));
};

// Sync favorites from database (defined here to avoid hoisting issues)
const syncFromDatabase = async (currentUserId?: string) => {
  if (!currentUserId || currentUserId === 'guest') {
    return;
  }

  try {
    console.log('[UnifiedFavorites] Syncing from database for user:', currentUserId);
    
    // Get ALL favorites at once from the unified favorites table
    // EXCLUDE products - they are handled by useFavoriteProducts hook
    const { data: favorites, error } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', currentUserId)
      .in('entity_type', ['business', 'coupon']) // Only businesses and coupons
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[UnifiedFavorites] Database error:', error);
      throw error;
    }

    const dbFavorites: UnifiedFavorite[] = [];

    // Process each favorite and fetch related data
    if (favorites && favorites.length > 0) {
      // Group by type for efficient batch fetching
      const businessIds = favorites.filter(f => f.entity_type === 'business').map(f => f.entity_id);
      const couponIds = favorites.filter(f => f.entity_type === 'coupon').map(f => f.entity_id);

      // Fetch related data in parallel (products excluded - handled by useFavoriteProducts)
      const [businessesData, couponsData] = await Promise.all([
        businessIds.length > 0 
          ? supabase.from('businesses').select('id, business_name, business_type, description, address, average_rating').in('id', businessIds)
          : Promise.resolve({ data: [] }),
        couponIds.length > 0
          ? supabase.from('business_coupons').select('id, title, description, discount_type, discount_value, valid_until, business_id').in('id', couponIds)
          : Promise.resolve({ data: [] })
      ]);

      // Create lookup maps
      const businessMap = new Map((businessesData.data || []).map(b => [b.id, b]));
      const couponMap = new Map((couponsData.data || []).map(c => [c.id, c]));

      // Build favorites with itemData
      for (const fav of favorites) {
        if (fav.entity_type === 'business') {
          const business = businessMap.get(fav.entity_id);
          if (business) {
            dbFavorites.push({
              id: fav.entity_id,
              type: 'business',
              timestamp: new Date(fav.created_at).getTime(),
              synced: true,
              itemData: {
                business_name: business.business_name || 'Unknown Business',
                business_type: business.business_type || 'Unknown',
                description: business.description || '',
                address: business.address || '',
                rating: business.average_rating || 0
              }
            });
          }
        } else if (fav.entity_type === 'coupon') {
          const coupon = couponMap.get(fav.entity_id);
          if (coupon) {
            dbFavorites.push({
              id: fav.entity_id,
              type: 'coupon',
              timestamp: new Date(fav.created_at).getTime(),
              synced: true,
              itemData: {
                title: coupon.title || 'Unknown Coupon',
                description: coupon.description || '',
                discount_type: coupon.discount_type || 'percentage',
                discount_value: coupon.discount_value || 0,
                business_name: 'Business'  // Could fetch from business_id if needed
              }
            });
          }
        }
        // Products are excluded - handled by useFavoriteProducts hook
      }
    }

    // DATABASE IS NOW THE SOURCE OF TRUTH
    // Only use database data, ignore localStorage to avoid cache issues
    const mergedFavorites: UnifiedFavorite[] = [...dbFavorites];
    
    // Sort by timestamp (newest first)
    mergedFavorites.sort((a, b) => b.timestamp - a.timestamp);
    
    // Update global state
    globalFavorites = mergedFavorites;
    
    // Update localStorage to match database (for offline fallback only)
    saveToStorage(globalFavorites, currentUserId);
    
    notifyListeners();

    console.log(`[UnifiedFavorites] Synced ${dbFavorites.length} favorites from database, ${mergedFavorites.length} total`);
  } catch (error) {
    console.warn('[UnifiedFavorites] Failed to sync favorites from database:', error);
  }
};

export const useUnifiedFavorites = () => {
  const { user } = useAuthStore();
  const userId = user?.id;
  
  // Load user-specific favorites when user changes
  useEffect(() => {
    if (currentUserId !== userId) {
      const oldUserId = currentUserId;
      currentUserId = userId;
      
      // For authenticated users, ALWAYS fetch from database first
      if (userId && userId !== 'guest') {
        console.log('[UnifiedFavorites] User changed, fetching favorites from database...');
        // Show loading state
        setState(prev => ({ ...prev, isLoading: true }));
        
        // Fetch from database (this is now the SOURCE OF TRUTH)
        syncFromDatabase(userId).then(() => {
          setState(prev => ({ ...prev, isLoading: false }));
        });
      } else {
        // For guest users, use localStorage only
        globalFavorites = loadFromStorage(userId);
        notifyListeners();
      }
    }
  }, [userId]);

  // Set up realtime subscription for database changes
  useEffect(() => {
    if (!userId || userId === 'guest') return;

    console.log('[UnifiedFavorites] Setting up realtime subscription for user:', userId);

    // Subscribe to changes in favorites table for this user
    const channel = supabase
      .channel(`favorites_${userId}`, {
        config: {
          broadcast: { self: false }, // Don't receive our own changes
        },
      })
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'favorites',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('[UnifiedFavorites] Realtime database change:', payload.eventType, payload);
          // Immediately refresh favorites from database
          syncFromDatabase(userId);
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('[UnifiedFavorites] ✅ Realtime subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[UnifiedFavorites] ❌ Realtime subscription error:', err);
        } else if (status === 'TIMED_OUT') {
          console.error('[UnifiedFavorites] ⏱️ Realtime subscription timed out');
        }
      });

    return () => {
      console.log('[UnifiedFavorites] Cleaning up realtime subscription');
      channel.unsubscribe();
    };
  }, [userId]);

  // Note: Removed visibility change listener to prevent excessive refreshes
  // Realtime subscriptions handle all updates automatically
  
  const [state, setState] = useState<FavoritesState>(() => {
    // Initialize with empty state - will be populated from database
    // DO NOT load from localStorage to avoid stale cache
    const initialFavorites = userId && userId !== 'guest' ? [] : loadFromStorage(userId);
    globalFavorites = initialFavorites;
    currentUserId = userId;
    
    const counts = initialFavorites.reduce(
      (acc, fav) => {
        if (fav.type === 'business') acc.businesses++;
        else if (fav.type === 'coupon') acc.coupons++;
        else if (fav.type === 'product') acc.products++;
        acc.total++;
        return acc;
      },
      { businesses: 0, coupons: 0, products: 0, total: 0 }
    );

    return {
      favorites: [...initialFavorites],
      counts,
      isLoading: false,
      error: null
    };
  });

  // Listen for global favorites changes
  useEffect(() => {
    const listener = (favorites: UnifiedFavorite[]) => {
      const counts = favorites.reduce(
        (acc, fav) => {
          if (fav.type === 'business') acc.businesses++;
          else if (fav.type === 'coupon') acc.coupons++;
          else if (fav.type === 'product') acc.products++;
          acc.total++;
          return acc;
        },
        { businesses: 0, coupons: 0, products: 0, total: 0 }
      );

      console.log('[UnifiedFavorites] State update - favorites:', favorites.length, 'counts:', counts);

      setState(prev => ({
        ...prev,
        favorites: [...favorites], // Ensure new array reference
        counts
      }));
    };

    globalListeners.push(listener);

    return () => {
      globalListeners = globalListeners.filter(l => l !== listener);
    };
  }, []);

  // Check if item is favorited
  const isFavorited = useCallback((itemId: string, type: 'business' | 'coupon' | 'product'): boolean => {
    return globalFavorites.some(fav => fav.id === itemId && fav.type === type);
  }, []);

  // Toggle favorite status with database sync
  const toggleFavorite = useCallback(async (itemId: string, type: 'business' | 'coupon' | 'product', itemData?: any): Promise<boolean> => {
    const isCurrentlyFavorited = isFavorited(itemId, type);
    const currentUserId = userId;

    try {
      if (isCurrentlyFavorited) {
        // Remove from favorites - update localStorage immediately
        globalFavorites = globalFavorites.filter(fav => !(fav.id === itemId && fav.type === type));
        saveToStorage(globalFavorites, currentUserId);
        notifyListeners();
        
        toast.success('Removed from favorites');
        
        // Sync removal to database if user is authenticated (async)
        if (currentUserId && currentUserId !== 'guest') {
          setTimeout(async () => {
            try {
              // All types use the unified favorites table
              const { error } = await supabase
                .from('favorites')
                .delete()
                .eq('user_id', currentUserId)
                .eq('entity_type', type)
                .eq('entity_id', itemId);
              
              if (error) {
                console.warn('Database sync error (removal):', error);
              } else {
                console.log(`Successfully removed ${type} from database`);
              }
            } catch (dbError) {
              console.warn('Failed to sync removal to database:', dbError);
            }
          }, 100); // Small delay to ensure UI responds immediately
        }
        
        return false;
      } else {
        // Add to favorites - update localStorage immediately  
        const newFavorite: UnifiedFavorite = {
          id: itemId,
          type,
          timestamp: Date.now(),
          synced: false,
          itemData
        };
        
        globalFavorites = [newFavorite, ...globalFavorites];
        saveToStorage(globalFavorites, currentUserId);
        notifyListeners();
        
        toast.success('Added to favorites');
        
        // Sync addition to database if user is authenticated (async)
        if (currentUserId && currentUserId !== 'guest') {
          setTimeout(async () => {
            try {
              // All types use the unified favorites table
              const { data, error } = await supabase
                .from('favorites')
                .insert({
                  user_id: currentUserId,
                  entity_type: type,
                  entity_id: itemId
                })
                .select()
                .single();
              
              if (error) {
                console.warn('Database sync error (addition):', error);
              } else {
                console.log(`Successfully added ${type} to database:`, data);
                
                // Update the favorite as synced
                const favoriteIndex = globalFavorites.findIndex(fav => fav.id === itemId && fav.type === type);
                if (favoriteIndex !== -1) {
                  globalFavorites[favoriteIndex].synced = true;
                  saveToStorage(globalFavorites, currentUserId);
                  notifyListeners();
                }
              }
            } catch (dbError) {
              console.warn('Failed to sync addition to database:', dbError);
            }
          }, 100); // Small delay to ensure UI responds immediately
        }
        
        return true;
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorites');
      return isCurrentlyFavorited;
    }
  }, [isFavorited, userId]);

  // Get favorites by type
  const getFavoritesByType = useCallback((type: 'business' | 'coupon' | 'product') => {
    return globalFavorites.filter(f => f.type === type);
  }, []);


  // Clear all favorites
  const clearAllFavorites = useCallback(async () => {
    const currentUserId = userId;
    
    // Clear localStorage immediately
    globalFavorites = [];
    saveToStorage(globalFavorites, currentUserId);
    notifyListeners();
    
    toast.success('All favorites cleared');
    
    // Clear database if authenticated (async)
    if (currentUserId && currentUserId !== 'guest') {
      setTimeout(async () => {
        try {
          // Only clear businesses and coupons (products handled by useFavoriteProducts)
          await Promise.all([
            supabase.from('favorites').delete().eq('user_id', currentUserId).eq('entity_type', 'business'),
            supabase.from('favorites').delete().eq('user_id', currentUserId).eq('entity_type', 'coupon')
          ]);
          console.log('[UnifiedFavorites] Cleared businesses and coupons from database');
        } catch (error) {
          console.warn('[UnifiedFavorites] Failed to clear database favorites:', error);
        }
      }, 100);
    }
  }, [userId]);

  // Seed test data for development
  const seedTestData = useCallback(() => {
    const testFavorites: UnifiedFavorite[] = [
      {
        id: 'test-business-1',
        type: 'business',
        timestamp: Date.now() - 86400000,
        synced: false,
        itemData: {
          business_name: "Joe's Pizza",
          business_type: 'Restaurant',
          address: '123 Main St'
        }
      },
      {
        id: 'test-business-2',
        type: 'business',
        timestamp: Date.now() - 172800000,
        synced: false,
        itemData: {
          business_name: "Tech Store",
          business_type: 'Electronics',
          address: '456 Tech Ave'
        }
      },
      {
        id: 'test-coupon-1',
        type: 'coupon',
        timestamp: Date.now() - 259200000,
        synced: false,
        itemData: {
          title: '50% Off Pizza',
          description: 'Great deal on all pizzas',
          business_name: "Joe's Pizza"
        }
      },
      {
        id: 'test-coupon-2',
        type: 'coupon',
        timestamp: Date.now() - 345600000,
        synced: false,
        itemData: {
          title: '20% Off Electronics',
          description: 'Save on all tech items',
          business_name: 'Tech Store'
        }
      }
    ];

    globalFavorites = testFavorites;
    saveToStorage(globalFavorites);
    notifyListeners();
    
    console.log('[UnifiedFavorites] Test data seeded:', testFavorites);
    toast.success('Test favorites added');
  }, []);

  // Refresh favorites (reload from database)
  const refresh = useCallback(async () => {
    if (userId && userId !== 'guest') {
      console.log('[UnifiedFavorites] Refreshing favorites from database...');
      setState(prev => ({ ...prev, isLoading: true }));
      await syncFromDatabase(userId);
      setState(prev => ({ ...prev, isLoading: false }));
    } else {
      // For guests, reload from localStorage
      globalFavorites = loadFromStorage(userId);
      notifyListeners();
    }
  }, [userId]);

  // Clear old favorites without itemData (migration helper)
  const clearOldFavorites = useCallback(() => {
    const oldFavorites = globalFavorites.filter(fav => 
      !fav.itemData || 
      (fav.type === 'business' && !fav.itemData.business_name) || 
      (fav.type === 'coupon' && !fav.itemData.title)
    );
    
    if (oldFavorites.length > 0) {
      globalFavorites = globalFavorites.filter(fav => 
        fav.itemData && 
        ((fav.type === 'business' && fav.itemData.business_name) || 
         (fav.type === 'coupon' && fav.itemData.title))
      );
      saveToStorage(globalFavorites, userId);
      notifyListeners();
      toast.success(`Cleared ${oldFavorites.length} old favorites without data`);
      console.log('[UnifiedFavorites] Cleared old favorites:', oldFavorites);
    } else {
      toast.info('No old favorites to clear');
    }
  }, [userId]);

  // Clear localStorage cache and force reload from database
  const clearLocalStorageCache = useCallback(async () => {
    try {
      // Clear localStorage
      localStorage.removeItem(getStorageKey(userId));
      console.log('[UnifiedFavorites] Cleared localStorage cache');
      
      // Reload from database
      if (userId && userId !== 'guest') {
        setState(prev => ({ ...prev, isLoading: true }));
        await syncFromDatabase(userId);
        setState(prev => ({ ...prev, isLoading: false }));
        toast.success('Cache cleared, favorites reloaded from database');
      } else {
        globalFavorites = [];
        notifyListeners();
        toast.success('Cache cleared');
      }
    } catch (error) {
      console.error('[UnifiedFavorites] Error clearing cache:', error);
      toast.error('Failed to clear cache');
    }
  }, [userId]);

  return {
    // State
    favorites: state.favorites,
    counts: state.counts,
    isLoading: state.isLoading,
    error: state.error,
    isAuthenticated: !!user?.id,

    // Actions
    isFavorited,
    toggleFavorite,
    getFavoritesByType,
    clearAllFavorites,
    refresh,
    syncFromDatabase: () => syncFromDatabase(userId),
    
    // Debug helpers
    seedTestData,
    clearOldFavorites,
    clearLocalStorageCache,

    // Legacy compatibility for existing components
    isBusinessFavorited: (id: string) => isFavorited(id, 'business'),
    isCouponFavorited: (id: string) => isFavorited(id, 'coupon'),
    isProductFavorited: (id: string) => isFavorited(id, 'product'),
    toggleBusinessFavorite: (id: string, itemData?: any) => toggleFavorite(id, 'business', itemData),
    toggleCouponFavorite: (id: string, itemData?: any) => toggleFavorite(id, 'coupon', itemData),
    toggleProductFavorite: (id: string, itemData?: any) => toggleFavorite(id, 'product', itemData),
    loadFavorites: refresh // No-op for compatibility
  };
};

export default useUnifiedFavorites;