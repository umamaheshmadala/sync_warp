import { registerSW } from 'virtual:pwa-register'

export interface ServiceWorkerUpdateInfo {
  updateAvailable: boolean
  skipWaiting: () => Promise<void>
  offlineReady: boolean
}

export const registerServiceWorker = (
  onUpdate?: (info: ServiceWorkerUpdateInfo) => void,
  onOfflineReady?: () => void
) => {
  const updateSW = registerSW({
    onNeedRefresh() {
      console.log('[SW] New version available - update ready')
      
      if (onUpdate) {
        onUpdate({
          updateAvailable: true,
          skipWaiting: async () => {
            await updateSW(true)
            window.location.reload()
          },
          offlineReady: false
        })
      }
    },
    
    onOfflineReady() {
      console.log('[SW] App ready to work offline')
      
      if (onOfflineReady) {
        onOfflineReady()
      }
    },
    
    onRegistered(registration) {
      console.log('[SW] Service Worker registered:', registration)
      
      // Check for updates every hour
      setInterval(() => {
        console.log('[SW] Checking for updates...')
        registration?.update()
      }, 60 * 60 * 1000) // 1 hour
    },
    
    onRegisterError(error) {
      console.error('[SW] Service Worker registration error:', error)
    }
  })

  return updateSW
}

// Utility to unregister service worker (for development)
export const unregisterServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations()
    
    for (const registration of registrations) {
      const success = await registration.unregister()
      console.log(`[SW] Unregistered: ${success}`)
    }
    
    console.log('[SW] All service workers unregistered')
    
    // Clear caches
    const cacheNames = await caches.keys()
    await Promise.all(cacheNames.map(name => caches.delete(name)))
    console.log('[SW] All caches cleared')
  }
}

// Get current service worker status
export const getServiceWorkerStatus = async () => {
  if (!('serviceWorker' in navigator)) {
    return { supported: false }
  }

  const registration = await navigator.serviceWorker.getRegistration()
  
  return {
    supported: true,
    registered: !!registration,
    active: !!registration?.active,
    waiting: !!registration?.waiting,
    installing: !!registration?.installing,
    controller: !!navigator.serviceWorker.controller
  }
}
