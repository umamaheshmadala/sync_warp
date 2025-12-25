import { useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';
import { Capacitor } from '@capacitor/core';
import Header from './Header';
import BottomNavigation from '../BottomNavigation';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // Initialize Realtime Notifications
  useRealtimeNotifications();

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

  if (isAuthPage) {
    return <>{children}</>;
  }

  // Hide bottom navigation when keyboard is visible on messages route
  const shouldShowBottomNav = !isKeyboardVisible || !isMessagesRoute;

  return (
    <div className="fixed inset-0 w-full h-full flex flex-col overflow-hidden bg-gray-50">
      <Header />
      <main
        className={`flex-1 flex flex-col min-h-0 relative ${isMessagesRoute ? 'overflow-hidden' : 'overflow-y-auto'}`}
      >
        <div className="w-full max-w-4xl mx-auto min-h-full pt-[54px] md:pt-16">
          {children}
          {/* Spacer for Bottom Navigation - Physical element ensures scroll clearance */}
          <div className={`w-full transition-all duration-200 ${shouldShowBottomNav ? 'h-32 md:h-16' : 'h-0'}`} />
        </div>
      </main>

      {/* Fixed Bottom Navigation */}
      {shouldShowBottomNav && <BottomNavigation currentRoute={location.pathname} />}
    </div>
  );
}
