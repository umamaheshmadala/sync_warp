
import { useLocation } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { useQueryClient } from '@tanstack/react-query';
import Header from './Header';
import BottomNavigation from '../BottomNavigation';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { notificationSettingsService } from '@/services/notificationSettingsService';
import { PullToRefresh } from '@/components/ui/PullToRefresh';
import { useThemeStore } from '@/store/themeStore';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const { resolvedTheme } = useThemeStore();

  // Initialize Realtime Notifications
  useRealtimeNotifications();

  // Don't show header/nav on auth pages and admin pages (admin has its own layout)
  const isAuthPage = location.pathname.startsWith('/auth');
  const isAdminRoute = location.pathname.startsWith('/admin');

  // Check if on messages route (relaxed check to handle IDs and trailing slashes)
  const isMessagesRoute = location.pathname.includes('/messages');

  // Configure Keyboard and Listeners
  // Story 8.12.1: We use resize: 'none' in config and handle layout manually for better interactive dismissal
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Dynamic Status Bar Theme based on resolvedTheme
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    if (Capacitor.getPlatform() === 'android') {
      const isDark = resolvedTheme === 'dark';
      StatusBar.setOverlaysWebView({ overlay: false }).catch(() => { });
      StatusBar.setBackgroundColor({ color: isDark ? '#1f2937' : '#ffffff' }).catch(() => { });
      StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light }).catch(() => { });
    }
  }, [resolvedTheme]);

  // Keyboard Listeners
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    // Note: 'resize: none' is set in capacitor.config.ts
    // We intentionally do NOT set it here to avoid race conditions overriding the config

    let showListener: any;
    let hideListener: any;

    const setupListeners = async () => {
      showListener = await Keyboard.addListener('keyboardWillShow', (info) => {
        console.log('[AppLayout] ⌨️ keyboardWillShow', info.keyboardHeight);
        setIsKeyboardVisible(true);
        setKeyboardHeight(info.keyboardHeight);
      });

      hideListener = await Keyboard.addListener('keyboardWillHide', () => {
        console.log('[AppLayout] ⌨️ keyboardWillHide');
        setIsKeyboardVisible(false);
        setKeyboardHeight(0);
      });
    };

    setupListeners();

    return () => {
      showListener?.remove();
      hideListener?.remove();
    };
  }, []);

  // Update timezone on mount
  useEffect(() => {
    const updateTimezone = async () => {
      try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        await notificationSettingsService.updateTimezone(timezone);
      } catch (err) {
        console.error('Failed to update timezone:', err);
      }
    };
    updateTimezone();
  }, []);

  // React Query client for instant background data refresh
  const queryClient = useQueryClient();

  // Pull-to-refresh handler - invalidates all React Query cache to trigger background refetch
  // This keeps components mounted (no white screen) and shows fresh data in ~1-2 seconds
  const handlePullToRefresh = useCallback(async () => {
    // Invalidate all queries - this triggers background refetch
    // Components stay mounted and show stale data until fresh data arrives
    await queryClient.invalidateQueries();

    // Small delay to ensure user sees the refresh happening
    await new Promise(resolve => setTimeout(resolve, 200));
  }, [queryClient]);

  if (isAuthPage) {
    return <>{children}</>;
  }

  // Admin pages have their own full-width desktop layout
  if (isAdminRoute) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {children}
      </div>
    );
  }

  // Hide bottom navigation when keyboard is visible anywhere to make space
  // Also hide if keyboard is visible
  const shouldShowBottomNav = !isKeyboardVisible && !isAuthPage;

  return (
    <div className="fixed inset-0 w-full h-full flex flex-col overflow-hidden bg-gray-50">
      <Header />
      <main
        className={`flex-1 flex flex-col min-h-0 relative ${isMessagesRoute ? 'overflow-hidden' : 'overflow-y-auto will-change-scroll'}`}
        style={{
          overscrollBehaviorY: 'none', // Prevent bounce effects
          WebkitOverflowScrolling: 'touch' // Ensure momentum scrolling
        }}
      >
        {/* Messages route needs full-width layout without PullToRefresh constraints */}
        {isMessagesRoute ? (
          <div
            className="w-full flex-1 min-h-0 flex flex-col"
            style={{
              paddingTop: 'calc(54px + env(safe-area-inset-top, 0px))',
              // Adjust bottom padding:
              // 1. If keyboard visible (non-Android) -> specific keyboard height
              // 2. If nav visible -> nav height + safe area
              // 3. Otherwise -> 0
              paddingBottom: (isKeyboardVisible && Capacitor.getPlatform() !== 'android')
                ? `${keyboardHeight}px`
                : (shouldShowBottomNav ? 'calc(56px + env(safe-area-inset-bottom, 0px))' : '0px'),
              transition: 'padding-bottom 0.2s cubic-bezier(0.2, 0.0, 0, 1.0)' // match iOS keyboard timing roughly
            }}
          >
            {children}
          </div>
        ) : (
          <PullToRefresh
            onRefresh={handlePullToRefresh}
            disabled={false}
            className="w-full max-w-4xl mx-auto min-h-full"
            style={{ paddingTop: 'calc(54px + env(safe-area-inset-top, 0px))' }}
          >
            {children}
            {/* Spacer for Bottom Navigation - Physical element ensures scroll clearance */}
            <div
              className="w-full transition-all duration-200"
              style={{
                height: shouldShowBottomNav
                  ? 'calc(56px + env(safe-area-inset-bottom, 0px) + 3px)'
                  : '0px',
              }}
            />
          </PullToRefresh>
        )}
      </main>

      {/* Fixed Bottom Navigation */}
      {shouldShowBottomNav && <BottomNavigation currentRoute={location.pathname} />}
    </div >
  );
}
