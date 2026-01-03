/**
 * Network Service
 * 
 * Provides reliable network connectivity detection with:
 * - Platform-specific monitoring (web browser events, mobile native APIs)
 * - Heartbeat verification to prevent false positives (Slack/Discord pattern)
 * - App state monitoring (foreground/background)
 * - Subscription-based notifications
 * 
 * Industry Best Practices:
 * - Slack: Heartbeat with server ping (30s interval)
 * - Discord: WebSocket-style verification
 * - WhatsApp: Reliable connectivity detection
 */

import { Capacitor } from '@capacitor/core'
import { Network } from '@capacitor/network'
import { App } from '@capacitor/app'

type NetworkChangeCallback = (isOnline: boolean) => void
type AppStateCallback = (isActive: boolean) => void

class NetworkService {
  private networkCallbacks: Set<NetworkChangeCallback> = new Set()
  private appStateCallbacks: Set<AppStateCallback> = new Set()
  private isMobile: boolean
  private isInitialized = false

  // Heartbeat for accurate connectivity detection (Industry Best Practice: Slack/Discord)
  private heartbeatInterval: NodeJS.Timeout | null = null
  private readonly HEARTBEAT_INTERVAL = 30000 // 30 seconds
  private readonly HEARTBEAT_TIMEOUT = 10000 // 10 seconds
  private consecutiveFailures = 0
  private readonly MAX_FAILURES = 3 // 3 failed pings = offline

  constructor() {
    this.isMobile = Capacitor.isNativePlatform()
  }

  /**
   * Initialize network monitoring
   * Call this after user login
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('[NetworkService] Already initialized')
      return
    }

    if (this.isMobile) {
      await this.initMobileMonitoring()
    } else {
      this.initWebMonitoring()
    }

    this.isInitialized = true
    console.log('[NetworkService] Initialized')
  }

  /**
   * WEB ONLY: Monitor browser events with heartbeat verification
   */
  private initWebMonitoring(): void {
    window.addEventListener('online', async () => {
      console.log('[NetworkService] Browser reports online, verifying...')
      // Verify before notifying (navigator.onLine can be unreliable)
      const isConnected = await this.verifyConnectivity()
      if (isConnected) {
        this.consecutiveFailures = 0
        this.notifyNetworkChange(true)
      }
    })

    window.addEventListener('offline', () => {
      console.log('[NetworkService] Offline (web)')
      this.notifyNetworkChange(false)
      this.stopHeartbeat()
    })

    // Visibility change (tab focus)
    document.addEventListener('visibilitychange', async () => {
      if (!document.hidden) {
        console.log('[NetworkService] Tab visible, checking network...')
        this.notifyAppStateChange(true)
        
        // Verify connectivity when tab becomes visible
        if (navigator.onLine) {
          await this.verifyConnectivity()
        }
      }
    })

    // Start heartbeat for accurate detection (Industry Best Practice)
    this.startHeartbeat()
  }

  /**
   * MOBILE ONLY: Monitor native network and app state
   */
  private async initMobileMonitoring(): Promise<void> {
    // Network status changes
    Network.addListener('networkStatusChange', (status) => {
      console.log(
        `[NetworkService] Network ${status.connected ? 'connected' : 'disconnected'} (${status.connectionType})`
      )
      this.notifyNetworkChange(status.connected)
    })

    // App state changes (foreground/background)
    App.addListener('appStateChange', async ({ isActive }) => {
      console.log(`[NetworkService] App ${isActive ? 'active' : 'inactive'}`)
      this.notifyAppStateChange(isActive)

      // Check network when app comes to foreground
      if (isActive) {
        const status = await Network.getStatus()
        this.notifyNetworkChange(status.connected)
      }
    })
  }

  /**
   * Start heartbeat to verify connectivity (Industry Best Practice: Slack)
   * Prevents false positives from navigator.onLine
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      return // Already running
    }

    this.heartbeatInterval = setInterval(async () => {
      if (!navigator.onLine) {
        return // Skip if browser says offline
      }

      const isConnected = await this.verifyConnectivity()
      
      if (!isConnected) {
        this.consecutiveFailures++
        console.warn(`[NetworkService] Heartbeat failed (${this.consecutiveFailures}/${this.MAX_FAILURES})`)

        if (this.consecutiveFailures >= this.MAX_FAILURES) {
          console.error('[NetworkService] Max failures reached, marking as offline')
          this.notifyNetworkChange(false)
        }
      } else {
        if (this.consecutiveFailures > 0) {
          console.log('[NetworkService] Heartbeat recovered')
          this.consecutiveFailures = 0
          this.notifyNetworkChange(true)
        }
      }
    }, this.HEARTBEAT_INTERVAL)

    console.log('[NetworkService] Heartbeat started (30s interval)')
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
      console.log('[NetworkService] Heartbeat stopped')
    }
  }

  /**
   * Verify connectivity by pinging Supabase
   * Industry Best Practice: Slack/Discord pattern
   */
  private async verifyConnectivity(): Promise<boolean> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.HEARTBEAT_TIMEOUT)

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`,
        {
          method: 'HEAD',
          signal: controller.signal,
          cache: 'no-cache'
        }
      )

      clearTimeout(timeoutId)
      return response.ok || response.status === 401 // 401 is fine (auth required)
    } catch (error) {
      console.warn('[NetworkService] Connectivity check failed:', error)
      return false
    }
  }

  /**
   * Get current network status
   */
  async getStatus(): Promise<{ isOnline: boolean; connectionType?: string }> {
    if (this.isMobile) {
      const status = await Network.getStatus()
      return {
        isOnline: status.connected,
        connectionType: status.connectionType
      }
    } else {
      // Web: Verify with heartbeat
      const isOnline = navigator.onLine && await this.verifyConnectivity()
      return {
        isOnline,
        connectionType: isOnline ? 'unknown' : 'none'
      }
    }
  }

  /**
   * Subscribe to network changes
   */
  onNetworkChange(callback: NetworkChangeCallback): () => void {
    this.networkCallbacks.add(callback)

    // Return unsubscribe function
    return () => {
      this.networkCallbacks.delete(callback)
    }
  }

  /**
   * Subscribe to app state changes
   */
  onAppStateChange(callback: AppStateCallback): () => void {
    this.appStateCallbacks.add(callback)

    return () => {
      this.appStateCallbacks.delete(callback)
    }
  }

  /**
   * Notify all subscribers of network change
   */
  private notifyNetworkChange(isOnline: boolean): void {
    this.networkCallbacks.forEach(callback => {
      try {
        callback(isOnline)
      } catch (error) {
        console.error('[NetworkService] Error in network callback:', error)
      }
    })
  }

  /**
   * Notify all subscribers of app state change
   */
  private notifyAppStateChange(isActive: boolean): void {
    this.appStateCallbacks.forEach(callback => {
      try {
        callback(isActive)
      } catch (error) {
        console.error('[NetworkService] Error in app state callback:', error)
      }
    })
  }

  /**
   * Cleanup on logout (Industry Best Practice)
   */
  destroy(): void {
    this.stopHeartbeat()
    this.networkCallbacks.clear()
    this.appStateCallbacks.clear()
    this.isInitialized = false

    if (this.isMobile) {
      Network.removeAllListeners()
      App.removeAllListeners()
    }

    console.log('[NetworkService] Destroyed')
  }

  /**
   * Reinitialize after login
   */
  async reinitialize(): Promise<void> {
    this.destroy()
    await this.initialize()
  }
}

// Export singleton instance
export const networkService = new NetworkService()
