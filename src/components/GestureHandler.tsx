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

// Text-heavy elements where text selection is common
const TEXT_SELECTABLE_TAGS = new Set([
  'P', 'SPAN', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'LI', 'TD', 'TH', 'LABEL', 'A', 'STRONG', 'EM', 'B', 'I',
  'BLOCKQUOTE', 'PRE', 'CODE', 'ARTICLE', 'SECTION'
]);

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
  const touchStart = useRef<{ x: number; y: number; target: EventTarget | null } | null>(null);
  const isEdgeSwipe = useRef(false);
  const hasMoved = useRef(false);
  const isTextSelection = useRef(false);

  // Check if touch started on a text-selectable element
  const isTextSelectableElement = (target: EventTarget | null): boolean => {
    if (!target || !(target instanceof HTMLElement)) return false;

    // Check direct element
    if (TEXT_SELECTABLE_TAGS.has(target.tagName)) return true;

    // Check if inside a text-selectable container
    const closest = target.closest('p, span, h1, h2, h3, h4, h5, h6, article, blockquote, pre, code');
    if (closest) return true;

    return false;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;

    // Only track single finger touches
    if (e.touches.length !== 1) return;

    const touch = e.touches[0];
    const clientX = touch.clientX;
    const clientY = touch.clientY;

    touchStart.current = { x: clientX, y: clientY, target: e.target };
    hasMoved.current = false;
    isTextSelection.current = false;

    // iOS-style edge swipe detection (left 20px only - reduced from 30)
    // Make edge detection more restrictive
    if (clientX <= 20) {
      isEdgeSwipe.current = true;
    } else {
      isEdgeSwipe.current = false;
    }

    // Clear any existing selection before tracking
    // Don't do this - it would prevent selection entirely
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (disabled || !touchStart.current) return;

    hasMoved.current = true;

    // Check for text selection during the move
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      isTextSelection.current = true;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (disabled || !touchStart.current) return;

    const startX = touchStart.current.x;
    const startY = touchStart.current.y;
    const startTarget = touchStart.current.target;

    // Reset for next gesture
    touchStart.current = null;

    // CRITICAL: Check if user is selecting text IMMEDIATELY
    const selection = window.getSelection();
    const hasSelection = selection && selection.toString().trim().length > 0;

    if (hasSelection || isTextSelection.current) {
      // User selected text, don't navigate
      isEdgeSwipe.current = false;
      isTextSelection.current = false;
      hasMoved.current = false;
      return;
    }

    // Check if started on a text element and user moved horizontally
    // This is likely an attempt to select text, even if selection hasn't completed
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;

    const isTextElement = isTextSelectableElement(startTarget);

    // If touch started on text element and was a horizontal drag (not just a tap),
    // AND it's not an edge swipe, assume text selection intent
    if (isTextElement && hasMoved.current && !isEdgeSwipe.current && Math.abs(deltaX) > 10) {
      isEdgeSwipe.current = false;
      isTextSelection.current = false;
      hasMoved.current = false;
      return;
    }

    // Check if the target is an input, textarea, or contenteditable element
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable ||
      target.closest('[contenteditable="true"]') ||
      target.closest('input') ||
      target.closest('textarea')
    ) {
      isEdgeSwipe.current = false;
      return;
    }

    // We only care about horizontal swipes for edge navigation
    // Check if horizontal movement dominates vertical
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Check threshold - increase threshold for non-edge swipes
      const effectiveThreshold = isEdgeSwipe.current ? swipeThreshold : swipeThreshold * 2;

      if (Math.abs(deltaX) > effectiveThreshold) {
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
        // Left swipe - we generally don't want this triggering accidentally
        // Only trigger if explicitly wired up AND it's a clear intentional swipe
        else if (deltaX < 0 && onSwipeLeft && isEdgeSwipe.current) {
          // Require edge swipe for left swipe too to prevent accidental triggers
          onSwipeLeft();
          if (enableHaptics) triggerHaptic('light');
        }
      }
    }

    isEdgeSwipe.current = false;
    isTextSelection.current = false;
    hasMoved.current = false;
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
      onTouchMove={handleTouchMove}
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