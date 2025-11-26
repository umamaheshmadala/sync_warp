import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { usePushNotifications } from '../usePushNotifications';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import SecureStorage from '../../lib/secureStorage';
import { supabase } from '../../lib/supabase';

// Mock dependencies
vi.mock('@capacitor/push-notifications', () => ({
    PushNotifications: {
        addListener: vi.fn(),
        removeAllListeners: vi.fn(),
        checkPermissions: vi.fn(),
        requestPermissions: vi.fn(),
        register: vi.fn(),
        createChannel: vi.fn(),
    },
}));

vi.mock('@capacitor/core', () => ({
    Capacitor: {
        isNativePlatform: vi.fn(),
        getPlatform: vi.fn(),
    },
}));

vi.mock('../../lib/secureStorage', () => ({
    default: {
        setPushToken: vi.fn(),
    },
}));

vi.mock('../../lib/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            upsert: vi.fn(() => ({
                error: null,
            })),
            delete: vi.fn(() => ({
                eq: vi.fn(() => ({
                    error: null,
                })),
            })),
        })),
    },
}));

describe('usePushNotifications', () => {
    const mockUserId = 'user-123';
    const mockToken = 'fcm-token-abc123';

    beforeEach(() => {
        vi.clearAllMocks();
        // Default to native platform
        (Capacitor.isNativePlatform as any).mockReturnValue(true);
        (Capacitor.getPlatform as any).mockReturnValue('android');

        // Mock console methods to reduce noise
        vi.spyOn(console, 'log').mockImplementation(() => { });
        vi.spyOn(console, 'error').mockImplementation(() => { });
        vi.spyOn(console, 'warn').mockImplementation(() => { });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should not register on non-native platforms', () => {
        (Capacitor.isNativePlatform as any).mockReturnValue(false);

        const { result } = renderHook(() => usePushNotifications(mockUserId));

        expect(result.current.isRegistered).toBe(false);
        expect(PushNotifications.register).not.toHaveBeenCalled();
    });

    it('should not register without userId', () => {
        const { result } = renderHook(() => usePushNotifications(null));

        expect(result.current.isRegistered).toBe(false);
        expect(PushNotifications.register).not.toHaveBeenCalled();
    });

    it('should request permissions when status is prompt', async () => {
        (PushNotifications.checkPermissions as any).mockResolvedValue({
            receive: 'prompt',
        });
        (PushNotifications.requestPermissions as any).mockResolvedValue({
            receive: 'granted',
        });

        renderHook(() => usePushNotifications(mockUserId));

        await waitFor(() => {
            expect(PushNotifications.requestPermissions).toHaveBeenCalled();
            expect(PushNotifications.register).toHaveBeenCalled();
        });
    });

    it('should register when permissions are already granted', async () => {
        (PushNotifications.checkPermissions as any).mockResolvedValue({
            receive: 'granted',
        });

        renderHook(() => usePushNotifications(mockUserId));

        await waitFor(() => {
            expect(PushNotifications.register).toHaveBeenCalled();
        });
    });

    it('should handle permission denial', async () => {
        (PushNotifications.checkPermissions as any).mockResolvedValue({
            receive: 'prompt',
        });
        (PushNotifications.requestPermissions as any).mockResolvedValue({
            receive: 'denied',
        });

        const { result } = renderHook(() => usePushNotifications(mockUserId));

        await waitFor(() => {
            expect(result.current.permissionGranted).toBe(false);
            expect(result.current.error).toContain('denied');
            expect(PushNotifications.register).not.toHaveBeenCalled();
        });
    });

    it('should create notification channel on Android', async () => {
        (Capacitor.getPlatform as any).mockReturnValue('android');
        (PushNotifications.checkPermissions as any).mockResolvedValue({
            receive: 'granted',
        });

        renderHook(() => usePushNotifications(mockUserId));

        await waitFor(() => {
            expect(PushNotifications.createChannel).toHaveBeenCalledWith({
                id: 'friend_notifications',
                name: 'Friend Notifications',
                description: 'Notifications for friend requests and updates',
                importance: 5,
                visibility: 1,
                vibration: true,
            });
        });
    });

    it('should set up listeners before registration', async () => {
        (PushNotifications.checkPermissions as any).mockResolvedValue({
            receive: 'granted',
        });

        renderHook(() => usePushNotifications(mockUserId));

        await waitFor(() => {
            expect(PushNotifications.addListener).toHaveBeenCalledWith(
                'registration',
                expect.any(Function)
            );
            expect(PushNotifications.addListener).toHaveBeenCalledWith(
                'registrationError',
                expect.any(Function)
            );
            expect(PushNotifications.addListener).toHaveBeenCalledWith(
                'pushNotificationReceived',
                expect.any(Function)
            );
            expect(PushNotifications.addListener).toHaveBeenCalledWith(
                'pushNotificationActionPerformed',
                expect.any(Function)
            );
        });
    });

    it('should handle token registration success', async () => {
        (PushNotifications.checkPermissions as any).mockResolvedValue({
            receive: 'granted',
        });

        let registrationCallback: any;
        (PushNotifications.addListener as any).mockImplementation((event: string, callback: any) => {
            if (event === 'registration') {
                registrationCallback = callback;
            }
        });

        const mockUpsert = vi.fn().mockResolvedValue({ error: null });
        (supabase.from as any).mockReturnValue({
            upsert: mockUpsert,
        });

        const { result } = renderHook(() => usePushNotifications(mockUserId));

        await waitFor(() => {
            expect(registrationCallback).toBeDefined();
        });

        // Simulate token registration
        await registrationCallback({ value: mockToken });

        await waitFor(() => {
            expect(SecureStorage.setPushToken).toHaveBeenCalledWith(mockToken);
            expect(mockUpsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    user_id: mockUserId,
                    token: mockToken,
                    platform: 'android',
                    is_active: true,
                }),
                { onConflict: 'token' }
            );
        });
    });

    it('should handle token registration error', async () => {
        (PushNotifications.checkPermissions as any).mockResolvedValue({
            receive: 'granted',
        });

        let errorCallback: any;
        (PushNotifications.addListener as any).mockImplementation((event: string, callback: any) => {
            if (event === 'registrationError') {
                errorCallback = callback;
            }
        });

        const { result } = renderHook(() => usePushNotifications(mockUserId));

        await waitFor(() => {
            expect(errorCallback).toBeDefined();
        });

        // Simulate registration error
        await errorCallback({ error: 'FCM registration failed' });

        await waitFor(() => {
            expect(result.current.isRegistered).toBe(false);
            expect(result.current.error).toContain('FCM registration failed');
        });
    });

    it('should handle Supabase sync failure gracefully', async () => {
        (PushNotifications.checkPermissions as any).mockResolvedValue({
            receive: 'granted',
        });

        let registrationCallback: any;
        (PushNotifications.addListener as any).mockImplementation((event: string, callback: any) => {
            if (event === 'registration') {
                registrationCallback = callback;
            }
        });

        const mockUpsert = vi.fn().mockResolvedValue({ error: { message: 'Database error' } });
        (supabase.from as any).mockReturnValue({
            upsert: mockUpsert,
        });

        const { result } = renderHook(() => usePushNotifications(mockUserId));

        await waitFor(() => {
            expect(registrationCallback).toBeDefined();
        });

        // Simulate token registration
        await registrationCallback({ value: mockToken });

        await waitFor(() => {
            expect(result.current.syncedToBackend).toBe(false);
            expect(result.current.error).toContain('sync failed');
        });
    });

    it('should remove all listeners on unmount', () => {
        (PushNotifications.checkPermissions as any).mockResolvedValue({
            receive: 'granted',
        });

        const { unmount } = renderHook(() => usePushNotifications(mockUserId));

        unmount();

        expect(PushNotifications.removeAllListeners).toHaveBeenCalled();
    });

    it('should remove token from database', async () => {
        (PushNotifications.checkPermissions as any).mockResolvedValue({
            receive: 'granted',
        });

        let registrationCallback: any;
        (PushNotifications.addListener as any).mockImplementation((event: string, callback: any) => {
            if (event === 'registration') {
                registrationCallback = callback;
            }
        });

        const mockDelete = vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
        });
        (supabase.from as any).mockReturnValue({
            upsert: vi.fn().mockResolvedValue({ error: null }),
            delete: mockDelete,
        });

        const { result } = renderHook(() => usePushNotifications(mockUserId));

        await waitFor(() => {
            expect(registrationCallback).toBeDefined();
        });

        // Simulate token registration
        await registrationCallback({ value: mockToken });

        await waitFor(() => {
            expect(result.current.token).toBe(mockToken);
        });

        // Remove token
        await result.current.removeTokenFromDatabase();

        expect(mockDelete).toHaveBeenCalled();
    });
});
