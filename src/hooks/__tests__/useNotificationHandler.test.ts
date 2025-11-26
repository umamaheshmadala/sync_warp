import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useNotificationHandler } from '../useNotificationHandler';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { NotificationRouter } from '../../services/notificationRouter';
import { useNavigate } from 'react-router-dom';

// Mock dependencies
vi.mock('@capacitor/push-notifications', () => ({
    PushNotifications: {
        addListener: vi.fn(),
    },
}));

vi.mock('@capacitor/core', () => ({
    Capacitor: {
        isNativePlatform: vi.fn(),
    },
}));

vi.mock('../../services/notificationRouter', () => ({
    NotificationRouter: {
        isValid: vi.fn(),
        route: vi.fn(),
    },
}));

vi.mock('react-router-dom', () => ({
    useNavigate: vi.fn(),
}));

describe('useNotificationHandler', () => {
    const mockNavigate = vi.fn();
    const mockListener = {
        remove: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();

        // Mock console methods
        vi.spyOn(console, 'log').mockImplementation(() => { });
        vi.spyOn(console, 'error').mockImplementation(() => { });
        vi.spyOn(console, 'warn').mockImplementation(() => { });

        // Setup default mocks
        (Capacitor.isNativePlatform as any).mockReturnValue(true);
        (useNavigate as any).mockReturnValue(mockNavigate);
        (PushNotifications.addListener as any).mockReturnValue(mockListener);
        (NotificationRouter.isValid as any).mockReturnValue(true);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should not set up listeners on non-native platforms', () => {
        (Capacitor.isNativePlatform as any).mockReturnValue(false);

        renderHook(() => useNotificationHandler());

        expect(PushNotifications.addListener).not.toHaveBeenCalled();
    });

    it('should set up foreground notification listener', () => {
        renderHook(() => useNotificationHandler());

        expect(PushNotifications.addListener).toHaveBeenCalledWith(
            'pushNotificationReceived',
            expect.any(Function)
        );
    });

    it('should set up notification tap listener', () => {
        renderHook(() => useNotificationHandler());

        expect(PushNotifications.addListener).toHaveBeenCalledWith(
            'pushNotificationActionPerformed',
            expect.any(Function)
        );
    });

    it('should display foreground notification when received', () => {
        let foregroundCallback: any;
        (PushNotifications.addListener as any).mockImplementation((event: string, callback: any) => {
            if (event === 'pushNotificationReceived') {
                foregroundCallback = callback;
            }
            return mockListener;
        });

        const { result } = renderHook(() => useNotificationHandler());

        expect(result.current.foregroundNotification).toBeNull();

        // Simulate foreground notification
        const mockNotification = {
            title: 'New Friend Request',
            body: 'John Doe sent you a friend request',
            data: {
                type: 'friend_request',
                id: 'req-123',
            },
        };

        act(() => {
            foregroundCallback(mockNotification);
        });

        expect(result.current.foregroundNotification).toEqual({
            title: 'New Friend Request',
            body: 'John Doe sent you a friend request',
            data: mockNotification.data,
        });
    });

    it('should not display foreground notification with invalid data', () => {
        let foregroundCallback: any;
        (PushNotifications.addListener as any).mockImplementation((event: string, callback: any) => {
            if (event === 'pushNotificationReceived') {
                foregroundCallback = callback;
            }
            return mockListener;
        });

        (NotificationRouter.isValid as any).mockReturnValue(false);

        const { result } = renderHook(() => useNotificationHandler());

        const mockNotification = {
            title: 'Invalid',
            body: 'Invalid notification',
            data: {},
        };

        act(() => {
            foregroundCallback(mockNotification);
        });

        expect(result.current.foregroundNotification).toBeNull();
    });

    it('should route to correct screen when notification is tapped', () => {
        let tapCallback: any;
        (PushNotifications.addListener as any).mockImplementation((event: string, callback: any) => {
            if (event === 'pushNotificationActionPerformed') {
                tapCallback = callback;
            }
            return mockListener;
        });

        renderHook(() => useNotificationHandler());

        const mockAction = {
            notification: {
                data: {
                    type: 'friend_request',
                    id: 'req-123',
                },
            },
        };

        act(() => {
            tapCallback(mockAction);
        });

        expect(NotificationRouter.route).toHaveBeenCalledWith(
            mockAction.notification.data,
            mockNavigate
        );
    });

    it('should not route with invalid notification data on tap', () => {
        let tapCallback: any;
        (PushNotifications.addListener as any).mockImplementation((event: string, callback: any) => {
            if (event === 'pushNotificationActionPerformed') {
                tapCallback = callback;
            }
            return mockListener;
        });

        (NotificationRouter.isValid as any).mockReturnValue(false);

        renderHook(() => useNotificationHandler());

        const mockAction = {
            notification: {
                data: {},
            },
        };

        act(() => {
            tapCallback(mockAction);
        });

        expect(NotificationRouter.route).not.toHaveBeenCalled();
    });

    it('should handle toast tap and route', () => {
        let foregroundCallback: any;
        (PushNotifications.addListener as any).mockImplementation((event: string, callback: any) => {
            if (event === 'pushNotificationReceived') {
                foregroundCallback = callback;
            }
            return mockListener;
        });

        const { result } = renderHook(() => useNotificationHandler());

        // Simulate foreground notification
        const mockNotification = {
            title: 'New Friend Request',
            body: 'John Doe sent you a friend request',
            data: {
                type: 'friend_request',
                id: 'req-123',
            },
        };

        act(() => {
            foregroundCallback(mockNotification);
        });

        expect(result.current.foregroundNotification).not.toBeNull();

        // Tap the toast
        act(() => {
            result.current.handleToastTap();
        });

        expect(NotificationRouter.route).toHaveBeenCalledWith(
            mockNotification.data,
            mockNavigate
        );
    });

    it('should dismiss foreground notification', () => {
        let foregroundCallback: any;
        (PushNotifications.addListener as any).mockImplementation((event: string, callback: any) => {
            if (event === 'pushNotificationReceived') {
                foregroundCallback = callback;
            }
            return mockListener;
        });

        const { result } = renderHook(() => useNotificationHandler());

        // Simulate foreground notification
        const mockNotification = {
            title: 'Test',
            body: 'Test notification',
            data: { type: 'test', id: '123' },
        };

        act(() => {
            foregroundCallback(mockNotification);
        });

        expect(result.current.foregroundNotification).not.toBeNull();

        // Dismiss the toast
        act(() => {
            result.current.handleToastDismiss();
        });

        expect(result.current.foregroundNotification).toBeNull();
    });

    it('should remove listeners on unmount', () => {
        const { unmount } = renderHook(() => useNotificationHandler());

        unmount();

        expect(mockListener.remove).toHaveBeenCalledTimes(2); // Two listeners
    });

    it('should handle errors in foreground notification processing', () => {
        let foregroundCallback: any;
        (PushNotifications.addListener as any).mockImplementation((event: string, callback: any) => {
            if (event === 'pushNotificationReceived') {
                foregroundCallback = callback;
            }
            return mockListener;
        });

        (NotificationRouter.isValid as any).mockImplementation(() => {
            throw new Error('Validation error');
        });

        const { result } = renderHook(() => useNotificationHandler());

        const mockNotification = {
            title: 'Test',
            body: 'Test',
            data: {},
        };

        // Should not throw
        expect(() => {
            act(() => {
                foregroundCallback(mockNotification);
            });
        }).not.toThrow();

        expect(result.current.foregroundNotification).toBeNull();
    });

    it('should handle errors in notification tap processing', () => {
        let tapCallback: any;
        (PushNotifications.addListener as any).mockImplementation((event: string, callback: any) => {
            if (event === 'pushNotificationActionPerformed') {
                tapCallback = callback;
            }
            return mockListener;
        });

        (NotificationRouter.route as any).mockImplementation(() => {
            throw new Error('Routing error');
        });

        renderHook(() => useNotificationHandler());

        const mockAction = {
            notification: {
                data: { type: 'test', id: '123' },
            },
        };

        // Should not throw
        expect(() => {
            act(() => {
                tapCallback(mockAction);
            });
        }).not.toThrow();
    });
});
