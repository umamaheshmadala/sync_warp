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
  type: 'business' | 'coupon';
  timestamp: number;
  synced?: boolean; // Whether it's been synced to database
  itemData?: any; // Optional cached item data
}

interface FavoritesState {
  favorites: UnifiedFavorite[];
  counts: {
    businesses: number;
    coupons: number;
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
    
    // Get favorites from database
    const [businessResult, couponResult] = await Promise.all([
      supabase.rpc('get_user_favorite_businesses', { user_uuid: currentUserId }),
      supabase.rpc('get_user_favorite_coupons', { user_uuid: currentUserId })
    ]);

    const dbFavorites: UnifiedFavorite[] = [];

    // Process business favorites
    if (businessResult.data && !businessResult.error) {
      businessResult.data.forEach((business: any) => {
        dbFavorites.push({
          id: business.business_id,
          type: 'business',
          timestamp: new Date(business.favorited_at).getTime(),
          synced: true,
          itemData: {
            business_name: business.business_name,
            business_type: business.business_type,
            description: business.description,
            address: business.address,
            rating: business.rating
          }
        });
      });
    }

    // Process coupon favorites  
    if (couponResult.data && !couponResult.error) {
      couponResult.data.forEach((coupon: any) => {
        dbFavorites.push({
          id: coupon.coupon_id,
          type: 'coupon',
          timestamp: new Date(coupon.favorited_at).getTime(),
          synced: true,
          itemData: {
            title: coupon.title,
            description: coupon.description,
            discount_type: coupon.discount_type,
            discount_value: coupon.discount_value,
            business_name: coupon.business_name
          }
        });
      });
    }

    // Merge with localStorage favorites, prioritizing database data
    const localFavorites = loadFromStorage(currentUserId);
    const mergedFavorites: UnifiedFavorite[] = [];
    
    // Add all database favorites first
    mergedFavorites.push(...dbFavorites);
    
    // Add localStorage favorites that aren't in database
    localFavorites.forEach(localFav => {
      const existsInDb = dbFavorites.some(dbFav => 
        dbFav.id === localFav.id && dbFav.type === localFav.type
      );
      if (!existsInDb) {
        mergedFavorites.push(localFav);
      }
    });

    // Sort by timestamp (newest first)
    mergedFavorites.sort((a, b) => b.timestamp - a.timestamp);

    // Update global state
    globalFavorites = mergedFavorites;
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
      
      // Load from localStorage first for immediate UI
      globalFavorites = loadFromStorage(userId);
      notifyListeners();
      
      // Then sync from database if user is authenticated
      if (userId && userId !== 'guest' && userId !== oldUserId) {
        console.log('[UnifiedFavorites] User changed, syncing favorites from database...');
        syncFromDatabase(userId);
      }
    }
  }, [userId]); // Removed syncFromDatabase from dependencies since it's not a dependency anymore
  
  const [state, setState] = useState<FavoritesState>(() => {
    // Load initial state for current user
    const userFavorites = loadFromStorage(userId);
    globalFavorites = userFavorites;
    currentUserId = userId;
    
    const counts = userFavorites.reduce(
      (acc, fav) => {
        if (fav.type === 'business') acc.businesses++;
        else if (fav.type === 'coupon') acc.coupons++;
        acc.total++;
        return acc;
      },
      { businesses: 0, coupons: 0, total: 0 }
    );

    return {
      favorites: [...userFavorites],
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
          acc.total++;
          return acc;
        },
        { businesses: 0, coupons: 0, total: 0 }
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
  const isFavorited = useCallback((itemId: string, type: 'business' | 'coupon'): boolean => {
    return globalFavorites.some(fav => fav.id === itemId && fav.type === type);
  }, []);

  // Toggle favorite status with database sync
  const toggleFavorite = useCallback(async (itemId: string, type: 'business' | 'coupon', itemData?: any): Promise<boolean> => {
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
              const functionName = type === 'business' ? 'toggle_business_favorite' : 'toggle_coupon_favorite';
              const paramName = type === 'business' ? 'business_uuid' : 'coupon_uuid';
              
              const { error } = await supabase.rpc(functionName, {
                [paramName]: itemId
              });
              
              if (error) {
                console.warn('Database sync error (removal):', error);
              } else {
                console.log('Successfully removed from database');
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
              const functionName = type === 'business' ? 'toggle_business_favorite' : 'toggle_coupon_favorite';
              const paramName = type === 'business' ? 'business_uuid' : 'coupon_uuid';
              
              const { data, error } = await supabase.rpc(functionName, {
                [paramName]: itemId
              });
              
              if (error) {
                console.warn('Database sync error (addition):', error);
              } else {
                console.log('Successfully added to database:', data);
                
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
  const getFavoritesByType = useCallback((type: 'business' | 'coupon') => {
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
          await Promise.all([
            supabase.from('user_favorites_businesses').delete().eq('user_id', currentUserId),
            supabase.from('user_favorites_coupons').delete().eq('user_id', currentUserId)
          ]);
          console.log('[UnifiedFavorites] Cleared favorites from database');
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

  // Refresh favorites (reload from storage)
  const refresh = useCallback(() => {
    globalFavorites = loadFromStorage();
    notifyListeners();
  }, []);

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
      saveToStorage(globalFavorites);
      notifyListeners();
      toast.success(`Cleared ${oldFavorites.length} old favorites without data`);
      console.log('[UnifiedFavorites] Cleared old favorites:', oldFavorites);
    } else {
      toast.info('No old favorites to clear');
    }
  }, []);

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

    // Legacy compatibility for existing components
    isBusinessFavorited: (id: string) => isFavorited(id, 'business'),
    isCouponFavorited: (id: string) => isFavorited(id, 'coupon'),
    toggleBusinessFavorite: (id: string, itemData?: any) => toggleFavorite(id, 'business', itemData),
    toggleCouponFavorite: (id: string, itemData?: any) => toggleFavorite(id, 'coupon', itemData),
    loadFavorites: refresh // No-op for compatibility
  };
};

export default useUnifiedFavorites;