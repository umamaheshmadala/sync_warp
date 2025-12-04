/**
 * Offline Media Service Tests
 * 
 * Tests for platform-specific media upload handling.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { offlineMediaService } from '../offlineMediaService'

// Mock Capacitor
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => false // Test web by default
  }
}))

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn()
  }
}))

vi.mock('@capacitor/filesystem', () => ({
  Filesystem: {
    writeFile: vi.fn(),
    readFile: vi.fn(),
    deleteFile: vi.fn()
  },
  Directory: {
    Data: 'DATA'
  }
}))

// Mock Supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: {}, error: null }),
        getPublicUrl: vi.fn(() => ({
          data: { publicUrl: 'https://example.com/test.jpg' }
        }))
      }))
    }
  }
}))

describe('OfflineMediaService', () => {
  beforeEach(async () => {
    await offlineMediaService.clearQueue()
    vi.clearAllMocks()
  })

  describe('queueMediaUpload', () => {
    it('should queue an image file', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      
      const mediaId = await offlineMediaService.queueMediaUpload(
        file,
        'msg-123',
        'conv-123'
      )

      expect(mediaId).toBeDefined()
      expect(typeof mediaId).toBe('string')

      const pending = await offlineMediaService.getPendingMedia()
      expect(pending).toHaveLength(1)
      expect(pending[0].fileName).toBe('test.jpg')
      expect(pending[0].fileType).toBe('image')
    })

    it('should queue a video file', async () => {
      const file = new File(['test'], 'test.mp4', { type: 'video/mp4' })
      
      const mediaId = await offlineMediaService.queueMediaUpload(
        file,
        'msg-123',
        'conv-123'
      )

      const pending = await offlineMediaService.getPendingMedia()
      expect(pending[0].fileType).toBe('video')
    })

    it('should reject files larger than 100MB', async () => {
      // Create a 101MB file (mock)
      const largeFile = new File(['x'.repeat(101 * 1024 * 1024)], 'large.jpg', {
        type: 'image/jpeg'
      })

      await expect(
        offlineMediaService.queueMediaUpload(largeFile, 'msg-123', 'conv-123')
      ).rejects.toThrow('File too large')
    })
  })

  describe('getPendingMedia', () => {
    it('should return all pending media', async () => {
      const file1 = new File(['test1'], 'test1.jpg', { type: 'image/jpeg' })
      const file2 = new File(['test2'], 'test2.jpg', { type: 'image/jpeg' })

      await offlineMediaService.queueMediaUpload(file1, 'msg-1', 'conv-123')
      await offlineMediaService.queueMediaUpload(file2, 'msg-2', 'conv-123')

      const pending = await offlineMediaService.getPendingMedia()
      expect(pending).toHaveLength(2)
    })
  })

  describe('getPendingCount', () => {
    it('should return correct count', async () => {
      expect(await offlineMediaService.getPendingCount()).toBe(0)

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      await offlineMediaService.queueMediaUpload(file, 'msg-123', 'conv-123')

      expect(await offlineMediaService.getPendingCount()).toBe(1)
    })
  })

  describe('getUploadedUrl', () => {
    it('should return undefined for non-existent message', async () => {
      const result = await offlineMediaService.getUploadedUrl('non-existent')
      expect(result.url).toBeUndefined()
      expect(result.thumbnailUrl).toBeUndefined()
    })
  })

  describe('clearQueue', () => {
    it('should clear all media', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      await offlineMediaService.queueMediaUpload(file, 'msg-123', 'conv-123')

      expect(await offlineMediaService.getPendingCount()).toBe(1)

      await offlineMediaService.clearQueue()

      expect(await offlineMediaService.getPendingCount()).toBe(0)
    })
  })

  describe('clearUploadedMedia', () => {
    it('should clear media for specific message', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      await offlineMediaService.queueMediaUpload(file, 'msg-123', 'conv-123')

      await offlineMediaService.clearUploadedMedia('msg-123')

      const pending = await offlineMediaService.getPendingMedia()
      expect(pending).toHaveLength(0)
    })
  })
})
