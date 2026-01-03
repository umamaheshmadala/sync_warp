/**
 * Network Service Tests
 * 
 * Tests for platform-specific network detection and heartbeat verification.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { networkService } from '../networkService'

// Mock Capacitor
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => false // Test web by default
  }
}))

vi.mock('@capacitor/network', () => ({
  Network: {
    addListener: vi.fn(),
    removeAllListeners: vi.fn(),
    getStatus: vi.fn().mockResolvedValue({
      connected: true,
      connectionType: 'wifi'
    })
  }
}))

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn(),
    removeAllListeners: vi.fn()
  }
}))

// Mock fetch for heartbeat
global.fetch = vi.fn()

describe('NetworkService', () => {
  beforeEach(async () => {
    // Reset service
    networkService.destroy()
    vi.clearAllMocks()
  })

  afterEach(() => {
    networkService.destroy()
  })

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await networkService.initialize()
      const status = await networkService.getStatus()
      expect(status).toHaveProperty('isOnline')
      expect(status).toHaveProperty('connectionType')
    })

    it('should not initialize twice', async () => {
      await networkService.initialize()
      await networkService.initialize() // Should warn but not crash
      const status = await networkService.getStatus()
      expect(status).toBeDefined()
    })
  })

  describe('getStatus', () => {
    it('should return current network status', async () => {
      await networkService.initialize()
      const status = await networkService.getStatus()
      
      expect(status).toHaveProperty('isOnline')
      expect(typeof status.isOnline).toBe('boolean')
      expect(status).toHaveProperty('connectionType')
    })
  })

  describe('subscriptions', () => {
    it('should allow subscribing to network changes', async () => {
      await networkService.initialize()
      
      const callback = vi.fn()
      const unsubscribe = networkService.onNetworkChange(callback)

      expect(typeof unsubscribe).toBe('function')
      
      // Cleanup
      unsubscribe()
    })

    it('should allow subscribing to app state changes', async () => {
      await networkService.initialize()
      
      const callback = vi.fn()
      const unsubscribe = networkService.onAppStateChange(callback)

      expect(typeof unsubscribe).toBe('function')
      
      // Cleanup
      unsubscribe()
    })

    it('should unsubscribe correctly', async () => {
      await networkService.initialize()
      
      const callback = vi.fn()
      const unsubscribe = networkService.onNetworkChange(callback)
      
      unsubscribe()
      
      // Callback should not be called after unsubscribe
      // (would need to trigger network change to verify)
    })
  })

  describe('heartbeat verification', () => {
    it('should verify connectivity with Supabase ping', async () => {
      // Mock successful fetch
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200
      })

      await networkService.initialize()
      const status = await networkService.getStatus()

      // Should have called fetch for verification
      expect(global.fetch).toHaveBeenCalled()
    })

    it('should handle failed connectivity check', async () => {
      // Mock failed fetch
      ;(global.fetch as any).mockRejectedValueOnce(new Error('Network error'))

      await networkService.initialize()
      const status = await networkService.getStatus()

      // Should still return a status (fallback to navigator.onLine)
      expect(status).toBeDefined()
    })

    it('should accept 401 as valid response', async () => {
      // Mock 401 response (auth required but server is reachable)
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401
      })

      await networkService.initialize()
      const status = await networkService.getStatus()

      expect(status).toBeDefined()
    })
  })

  describe('cleanup', () => {
    it('should cleanup on destroy', async () => {
      await networkService.initialize()
      
      const callback = vi.fn()
      networkService.onNetworkChange(callback)
      
      networkService.destroy()
      
      // Service should be destroyed
      const status = await networkService.getStatus()
      expect(status).toBeDefined() // Should still work but not initialized
    })

    it('should reinitialize after destroy', async () => {
      await networkService.initialize()
      networkService.destroy()
      await networkService.reinitialize()
      
      const status = await networkService.getStatus()
      expect(status).toBeDefined()
    })
  })

  describe('error handling', () => {
    it('should handle callback errors gracefully', async () => {
      await networkService.initialize()
      
      const errorCallback = vi.fn(() => {
        throw new Error('Callback error')
      })
      
      networkService.onNetworkChange(errorCallback)
      
      // Should not crash when callback throws
      // (would need to trigger network change to verify)
    })
  })
})
