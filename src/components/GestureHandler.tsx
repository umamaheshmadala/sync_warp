// src/components/GestureHandler.tsx
import React, { useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHapticFeedback } from '../hooks/useHapticFeedback';

interface GestureHandlerProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  enableTabSwitching?: boolean;
  tabRoutes?: string[];
  currentRoute?: string;
  swipeThreshold?: number;
  enableHaptics?: boolean;
  disabled?: boolean;
  className?: string;
}

const GestureHandler: React.FC<GestureHandlerProps> = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  enableTabSwitching = false,
  tabRoutes = [],
  currentRoute,
  swipeThreshold = 50,
  enableHaptics = true,
  disabled = false,
  className = ''
}) => {
  const navigate = useNavigate();
  const { triggerHaptic } = useHapticFeedback();

  // Refs to track touch state without re-renders
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const isEdgeSwipe = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;

    // Only track single finger touches
    if (e.touches.length !== 1) return;

    const touch = e.touches[0];
    const clientX = touch.clientX;
    const clientY = touch.clientY;

    touchStart.current = { x: clientX, y: clientY };

    // iOS-style edge swipe detection (left 30px only)
    if (clientX <= 30) {
      isEdgeSwipe.current = true;
    } else {
      isEdgeSwipe.current = false;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (disabled || !touchStart.current) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStart.current.x;
    const deltaY = touch.clientY - touchStart.current.y;

    // Reset for next gesture
    touchStart.current = null;

    // We only care about horizontal swipes for edge navigation
    // Check if horizontal movement dominates vertical
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Check threshold
      if (Math.abs(deltaX) > swipeThreshold) {
        // Right swipe (Back Navigation) - ONLY if it started from edge
        if (deltaX > 0 && isEdgeSwipe.current) {
          if (onSwipeRight) {
            onSwipeRight();
            if (enableHaptics) triggerHaptic('light');
          } else if (enableTabSwitching) {
            handleTabSwitch('right');
            if (enableHaptics) triggerHaptic('light');
          }
        }
        // Left swipe
        else if (deltaX < 0) {
          // We generally don't want global left swipes blocking scrolling, but if wired up:
          if (onSwipeLeft) {
            onSwipeLeft();
            if (enableHaptics) triggerHaptic('light');
          }
        }
      }
    }

    isEdgeSwipe.current = false;
  };

  const handleTabSwitch = useCallback((direction: 'left' | 'right') => {
    if (!currentRoute || !tabRoutes.length) return;
    const currentIndex = tabRoutes.findIndex(route => route === currentRoute);
    if (currentIndex === -1) return;
    let nextIndex = direction === 'left' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex >= tabRoutes.length) nextIndex = 0;
    if (nextIndex < 0) nextIndex = tabRoutes.length - 1;
    const nextRoute = tabRoutes[nextIndex];
    if (nextRoute) navigate(nextRoute);
  }, [currentRoute, tabRoutes, navigate]);

  if (disabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      className={`relative ${className}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        // Critical for performance: 
        // 'pan-y' tells browser "I handle horizontal, you handle vertical"
        // This allows vertical scroll to run on compositor thread (no white screens)
        touchAction: 'pan-y'
      }}
    >
      {children}
    </div>
  );
};

export default GestureHandler;