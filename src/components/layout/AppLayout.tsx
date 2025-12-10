import { useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Keyboard } from '@capacitor/keyboard';
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

  // Check if on messages route
  const isMessagesRoute = location.pathname.startsWith('/messages/');

  // Keyboard visibility detection for mobile
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

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
    <div className="flex flex-col h-screen">
      <Header />
      <main className="flex-1 overflow-auto">{children}</main>
      {shouldShowBottomNav && <BottomNavigation currentRoute={location.pathname} />}
    </div>
  );
}
