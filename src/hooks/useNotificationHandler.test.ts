import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useNotificationHandler } from './useNotificationHandler'
import { PushNotifications } from '@capacitor/push-notifications'
import { Capacitor } from '@capacitor/core'
import * as ReactRouter from 'react-router-dom'

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(),
}))

describe('useNotificationHandler', () => {
  let mockNavigate: ReturnType<typeof vi.fn>
  let notificationReceivedCallback: any
  let notificationTappedCallback: any

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks()
    
    // Setup navigate mock
    mockNavigate = vi.fn()
    vi.mocked(ReactRouter.useNavigate).mockReturnValue(mockNavigate)

    // Capture listener callbacks
    vi.mocked(PushNotifications.addListener).mockImplementation((eventName, callback) => {
      if (eventName === 'pushNotificationReceived') {
        notificationReceivedCallback = callback
      } else if (eventName === 'pushNotificationActionPerformed') {
        notificationTappedCallback = callback
      }
      return {
        remove: vi.fn(),
      } as any
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Initialization', () => {
    it('should not set up listeners on web platform', () => {
      // Mock web platform
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false)

      renderHook(() => useNotificationHandler())

      expect(PushNotifications.addListener).not.toHaveBeenCalled()
    })

    it('should set up listeners on native platform', () => {
      // Mock native platform
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)

      renderHook(() => useNotificationHandler())

      expect(PushNotifications.addListener).toHaveBeenCalledTimes(2)
      expect(PushNotifications.addListener).toHaveBeenCalledWith(
        'pushNotificationReceived',
        expect.any(Function)
      )
      expect(PushNotifications.addListener).toHaveBeenCalledWith(
        'pushNotificationActionPerformed',
        expect.any(Function)
      )
    })

    it('should cleanup listeners on unmount', () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)

      const removeFn1 = vi.fn()
      const removeFn2 = vi.fn()

      vi.mocked(PushNotifications.addListener)
        .mockReturnValueOnce({ remove: removeFn1 } as any)
        .mockReturnValueOnce({ remove: removeFn2 } as any)

      const { unmount } = renderHook(() => useNotificationHandler())

      unmount()

      expect(removeFn1).toHaveBeenCalled()
      expect(removeFn2).toHaveBeenCalled()
    })
  })

  describe('Foreground Notifications', () => {
    beforeEach(() => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)
    })

    it('should display foreground notification with valid data', async () => {
      const { result } = renderHook(() => useNotificationHandler())

      expect(result.current.foregroundNotification).toBeNull()

      // Simulate receiving a notification
      act(() => {
        notificationReceivedCallback({
          title: 'New Review',
          body: 'Someone reviewed your business',
          data: {
            type: 'review',
            businessId: 'business-123',
            reviewId: 'review-456',
          },
        })
      })

      await waitFor(() => {
        expect(result.current.foregroundNotification).toEqual({
          title: 'New Review',
          body: 'Someone reviewed your business',
          data: {
            type: 'review',
            businessId: 'business-123',
            reviewId: 'review-456',
          },
        })
      })
    })

    it('should not display notification with invalid data', async () => {
      const { result } = renderHook(() => useNotificationHandler())

      // Simulate notification with invalid type
      act(() => {
        notificationReceivedCallback({
          title: 'Invalid Notification',
          body: 'This should be ignored',
          data: {
            type: 'invalid-type', // Not a valid notification type
            someOtherField: 'value',
          },
        })
      })

      expect(result.current.foregroundNotification).toBeNull()
    })

    it('should handle missing title and body gracefully', async () => {
      const { result } = renderHook(() => useNotificationHandler())

      act(() => {
        notificationReceivedCallback({
          data: {
            type: 'business',
            businessId: 'business-789',
          },
        })
      })

      await waitFor(() => {
        expect(result.current.foregroundNotification).toEqual({
          title: 'Notification',
          body: '',
          data: {
            type: 'business',
            businessId: 'business-789',
          },
        })
      })
    })
  })

  describe('Toast Interactions', () => {
    beforeEach(() => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)
    })

    it('should route to correct screen when toast is tapped', async () => {
      const { result } = renderHook(() => useNotificationHandler())

      // Show a foreground notification
      act(() => {
        notificationReceivedCallback({
          title: 'New Offer',
          body: 'Check out this offer',
          data: {
            type: 'offer',
            businessId: 'business-123',
            offerId: 'offer-456',
          },
        })
      })

      await waitFor(() => {
        expect(result.current.foregroundNotification).not.toBeNull()
      })

      // Tap the toast
      act(() => {
        result.current.handleToastTap()
      })

      expect(mockNavigate).toHaveBeenCalledWith('/business/business-123/offers/offer-456')
    })

    it('should dismiss toast when handleToastDismiss is called', async () => {
      const { result } = renderHook(() => useNotificationHandler())

      // Show notification
      act(() => {
        notificationReceivedCallback({
          title: 'Test',
          body: 'Test body',
          data: {
            type: 'test',
          },
        })
      })

      await waitFor(() => {
        expect(result.current.foregroundNotification).not.toBeNull()
      })

      // Dismiss toast
      act(() => {
        result.current.handleToastDismiss()
      })

      expect(result.current.foregroundNotification).toBeNull()
    })

    it('should not route if no foreground notification exists', () => {
      const { result } = renderHook(() => useNotificationHandler())

      act(() => {
        result.current.handleToastTap()
      })

      expect(mockNavigate).not.toHaveBeenCalled()
    })
  })

  describe('Background/Killed State Notifications', () => {
    beforeEach(() => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)
    })

    it('should route when notification is tapped from background', () => {
      renderHook(() => useNotificationHandler())

      act(() => {
        notificationTappedCallback({
          notification: {
            data: {
              type: 'follower',
              userId: 'user-123',
            },
          },
        })
      })

      expect(mockNavigate).toHaveBeenCalledWith('/profile/user-123')
    })

    it('should route to messages when message notification is tapped', () => {
      renderHook(() => useNotificationHandler())

      act(() => {
        notificationTappedCallback({
          notification: {
            data: {
              type: 'message',
              messageId: 'msg-999',
            },
          },
        })
      })

      expect(mockNavigate).toHaveBeenCalledWith('/messages/msg-999')
    })

    it('should not route with invalid notification data', () => {
      renderHook(() => useNotificationHandler())

      act(() => {
        notificationTappedCallback({
          notification: {
            data: {
              type: 'unknown-type',
              someField: 'value',
            },
          },
        })
      })

      expect(mockNavigate).not.toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)
    })

    it('should handle errors in foreground notification processing', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      const { result } = renderHook(() => useNotificationHandler())

      // Pass malformed data that causes an error
      act(() => {
        notificationReceivedCallback({
          title: 'Test',
          body: 'Test',
          data: null, // This should cause an error
        })
      })

      expect(result.current.foregroundNotification).toBeNull()
      expect(consoleErrorSpy).toHaveBeenCalled()
      
      consoleErrorSpy.mockRestore()
    })

    it('should handle errors in notification tap processing', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      renderHook(() => useNotificationHandler())

      // Pass malformed data
      act(() => {
        notificationTappedCallback({
          notification: {
            data: null,
          },
        })
      })

      expect(mockNavigate).not.toHaveBeenCalled()
      expect(consoleErrorSpy).toHaveBeenCalled()
      
      consoleErrorSpy.mockRestore()
    })
  })

  describe('All Notification Types', () => {
    beforeEach(() => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)
    })

    const notificationTypes = [
      {
        type: 'review',
        data: { type: 'review', businessId: 'b1', reviewId: 'r1' },
        expectedRoute: '/business/b1/reviews/r1',
      },
      {
        type: 'offer',
        data: { type: 'offer', businessId: 'b2', offerId: 'o1' },
        expectedRoute: '/business/b2/offers/o1',
      },
      {
        type: 'business',
        data: { type: 'business', businessId: 'b3' },
        expectedRoute: '/business/b3',
      },
      {
        type: 'follower',
        data: { type: 'follower', userId: 'u1' },
        expectedRoute: '/profile/u1',
      },
      {
        type: 'message',
        data: { type: 'message', messageId: 'm1' },
        expectedRoute: '/messages/m1',
      },
      {
        type: 'test',
        data: { type: 'test' },
        expectedRoute: '/',
      },
    ]

    notificationTypes.forEach(({ type, data, expectedRoute }) => {
      it(`should route correctly for ${type} notification type`, () => {
        renderHook(() => useNotificationHandler())

        act(() => {
          notificationTappedCallback({
            notification: { data },
          })
        })

        expect(mockNavigate).toHaveBeenCalledWith(expectedRoute)
      })
    })
  })
})
