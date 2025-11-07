import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { supabase } from '../lib/supabase'
import localforage from '../lib/storage'

interface Business {
  id: string
  business_name: string
  description: string
  logo_url?: string
  cover_image_url?: string
  city: string
  category: string
  is_verified: boolean
  created_at: string
  updated_at?: string
}

interface OfflineBusinessState {
  businesses: Business[]
  lastSyncTimestamp: number | null
  isSyncing: boolean
  isOfflineMode: boolean
  syncError: string | null
  
  // Actions
  fetchBusinesses: (forceRefresh?: boolean) => Promise<void>
  syncWithServer: () => Promise<void>
  getBusinessById: (id: string) => Business | undefined
  clearCache: () => Promise<void>
  setOfflineMode: (isOffline: boolean) => void
}

// Helper function to check cache expiration
const isCacheExpired = (lastSync: number | null): boolean => {
  if (!lastSync) return true
  
  const CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000 // 7 days
  return (Date.now() - lastSync) > CACHE_MAX_AGE
}

export const useOfflineBusinessStore = create<OfflineBusinessState>()(
  persist(
    (set, get) => ({
      // State
      businesses: [],
      lastSyncTimestamp: null,
      isSyncing: false,
      isOfflineMode: false,
      syncError: null,

      // Fetch businesses (from cache or server)
      fetchBusinesses: async (forceRefresh = false) => {
        const { lastSyncTimestamp, businesses, isOfflineMode } = get()
        
        // Check if cache is expired
        if (isCacheExpired(lastSyncTimestamp)) {
          console.log('[OfflineStore] Cache expired')
          if (!isOfflineMode) {
            await get().syncWithServer()
            return
          }
        }
        
        // Check if cache is fresh (within 24 hours)
        const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours
        const isCacheFresh = lastSyncTimestamp && 
          (Date.now() - lastSyncTimestamp < CACHE_DURATION)

        // Use cache if fresh and not forcing refresh
        if (!forceRefresh && isCacheFresh && businesses.length > 0) {
          console.log('[OfflineStore] Using cached businesses')
          return
        }

        // If offline, use cache regardless of freshness
        if (isOfflineMode) {
          console.log('[OfflineStore] Offline mode - using cache')
          return
        }

        // Fetch from server
        await get().syncWithServer()
      },

      // Sync with Supabase server
      syncWithServer: async () => {
        set({ isSyncing: true, syncError: null })

        try {
          console.log('[OfflineStore] Syncing with server...')

          const { data, error } = await supabase
            .from('businesses')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100) // Limit to recent businesses

          if (error) throw error

          set({
            businesses: data || [],
            lastSyncTimestamp: Date.now(),
            isSyncing: false,
            syncError: null,
            isOfflineMode: false
          })

          console.log(`[OfflineStore] Synced ${data?.length || 0} businesses`)
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Sync failed'
          console.error('[OfflineStore] Sync error:', errorMsg)
          
          set({
            isSyncing: false,
            syncError: errorMsg,
            isOfflineMode: true // Assume offline if sync fails
          })
        }
      },

      // Get specific business by ID
      getBusinessById: (id: string) => {
        return get().businesses.find(b => b.id === id)
      },

      // Clear all cached data
      clearCache: async () => {
        set({
          businesses: [],
          lastSyncTimestamp: null,
          syncError: null
        })
        console.log('[OfflineStore] Cache cleared')
      },

      // Set offline mode
      setOfflineMode: (isOffline: boolean) => {
        set({ isOfflineMode: isOffline })
        console.log(`[OfflineStore] Offline mode: ${isOffline}`)
      }
    }),
    {
      name: 'offline-business-storage',
      storage: createJSONStorage(() => localforage),
      partialize: (state) => ({
        businesses: state.businesses,
        lastSyncTimestamp: state.lastSyncTimestamp
        // Don't persist: isSyncing, isOfflineMode, syncError (temporary state)
      }),
      version: 1
    }
  )
)

// Auto-sync when app comes online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[OfflineStore] Network online - auto-syncing')
    useOfflineBusinessStore.getState().setOfflineMode(false)
    useOfflineBusinessStore.getState().syncWithServer()
  })

  window.addEventListener('offline', () => {
    console.log('[OfflineStore] Network offline')
    useOfflineBusinessStore.getState().setOfflineMode(true)
  })
}
