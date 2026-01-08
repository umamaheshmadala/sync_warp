import { useLocation } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';
import { Capacitor } from '@capacitor/core';
import { useQueryClient } from '@tanstack/react-query';
import Header from './Header';
import BottomNavigation from '../BottomNavigation';
import { useNavigate } from 'react-router-dom';
import { useNavigationPreferences } from '../../hooks/useNavigationState';
import GestureHandler from '../GestureHandler';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { notificationSettingsService } from '@/services/notificationSettingsService';
import { PullToRefresh } from '@/components/ui/PullToRefresh';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // Initialize Realtime Notifications
  useRealtimeNotifications();

  const navigate = useNavigate();
  const { preferences } = useNavigationPreferences();

  // Don't show header/nav on auth pages only (root path is now dashboard)
  const isAuthPage = location.pathname.startsWith('/auth');

  // Check if on messages route (relaxed check to handle IDs and trailing slashes)
  const isMessagesRoute = location.pathname.includes('/messages');

  // Configure Keyboard and Listeners
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    // Set Keyboard Resize Mode to Native as requested by user
    Keyboard.setResizeMode({ mode: KeyboardResize.Native });
    // Disable webview scroll to let our CSS handle scrolling within containers
    Keyboard.setScroll({ isDisabled: true });

    let showListener: any;
    let hideListener: any;

    const setupListeners = async () => {
      showListener = await Keyboard.addListener('keyboardWillShow', () => {
        setIsKeyboardVisible(true);
      });

      hideListener = await Keyboard.addListener('keyboardWillHide', () => {
        setIsKeyboardVisible(false);
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

  // Hide bottom navigation when keyboard is visible anywhere to make space
  // Also hide if keyboard is visible
  const shouldShowBottomNav = !isKeyboardVisible && !isAuthPage;

  return (
    <GestureHandler
      onSwipeRight={() => {
        if (preferences.swipeGesturesEnabled) {
          console.log('[AppLayout] Swipe Right Detected -> Go Back');
          navigate(-1);
        }
      }}
      disabled={!preferences.swipeGesturesEnabled}
      enableHaptics={preferences.enableHapticFeedback}
      className="w-full h-full"
    >
      <div className="fixed inset-0 w-full h-full flex flex-col overflow-hidden bg-gray-50">
        <Header />
        <main
          className={`flex-1 flex flex-col min-h-0 relative ${isMessagesRoute ? 'overflow-hidden' : 'overflow-y-auto'}`}
          style={{
            overscrollBehaviorY: 'none', // Prevent bounce effects
            WebkitOverflowScrolling: 'touch' // Ensure momentum scrolling
          }}
        >
          {/* Content needs to account for header height + safe area */}
          <PullToRefresh
            onRefresh={handlePullToRefresh}
            disabled={isMessagesRoute}
            className="w-full max-w-4xl mx-auto min-h-full"
          >
            <div style={{ paddingTop: 'calc(54px + env(safe-area-inset-top, 0px))' }}>
              {children}
              {/* Spacer for Bottom Navigation - Physical element ensures scroll clearance */}
              <div
                className="w-full transition-all duration-200"
                style={{
                  height: shouldShowBottomNav
                    ? 'calc(56px + env(safe-area-inset-bottom, 0px) + 3px)'
                    : '0px'
                }}
              />
            </div>
          </PullToRefresh>
        </main>

        {/* Fixed Bottom Navigation */}
        {shouldShowBottomNav && <BottomNavigation currentRoute={location.pathname} />}
      </div>
    </GestureHandler>
  );
}
