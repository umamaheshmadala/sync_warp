// src/components/GestureHandler.tsx
import React, { useState, useCallback } from 'react';
import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion';
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

interface SwipeState {
  isSwipeActive: boolean;
  swipeDirection: 'left' | 'right' | 'up' | 'down' | null;
  swipeProgress: number;
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
  swipeThreshold = 100,
  enableHaptics = true,
  disabled = false,
  className = ''
}) => {
  const navigate = useNavigate();
  const { triggerHaptic } = useHapticFeedback();
  const [swipeState, setSwipeState] = useState<SwipeState>({
    isSwipeActive: false,
    swipeDirection: null,
    swipeProgress: 0
  });

  // Motion values for smooth animations
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  // Transform motion values to useful properties
  const rotateY = useTransform(x, [-300, 0, 300], [-15, 0, 15]);
  const opacity = useTransform(x, [-300, 0, 300], [0.5, 1, 0.5]);

  /**
   * Handle pan start
   */
  const handlePanStart = useCallback(() => {
    if (disabled) return;
    
    setSwipeState(prev => ({
      ...prev,
      isSwipeActive: true
    }));

    if (enableHaptics) {
      triggerHaptic('light');
    }
  }, [disabled, enableHaptics, triggerHaptic]);

  /**
   * Handle pan movement
   */
  const handlePan = useCallback((_event: any, info: PanInfo) => {
    if (disabled) return;

    const { offset } = info;
    const absOffsetX = Math.abs(offset.x);
    const absOffsetY = Math.abs(offset.y);
    
    // Determine primary swipe direction
    let direction: 'left' | 'right' | 'up' | 'down' | null = null;
    
    if (absOffsetX > absOffsetY) {
      // Horizontal swipe
      if (Math.abs(offset.x) > 30) {
        direction = offset.x > 0 ? 'right' : 'left';
      }
    } else {
      // Vertical swipe
      if (Math.abs(offset.y) > 30) {
        direction = offset.y > 0 ? 'down' : 'up';
      }
    }

    const progress = direction 
      ? Math.min(Math.abs(direction === 'left' || direction === 'right' ? offset.x : offset.y) / swipeThreshold, 1)
      : 0;

    setSwipeState(prev => ({
      ...prev,
      swipeDirection: direction,
      swipeProgress: progress
    }));

    // Trigger haptic feedback at threshold
    if (progress >= 1 && enableHaptics && swipeState.swipeProgress < 1) {
      triggerHaptic('medium');
    }
  }, [disabled, swipeThreshold, enableHaptics, triggerHaptic, swipeState.swipeProgress]);

  /**
   * Handle pan end - execute swipe actions
   */
  const handlePanEnd = useCallback((_event: any, info: PanInfo) => {
    if (disabled) return;

    const { offset, velocity } = info;
    const absOffsetX = Math.abs(offset.x);
    const absOffsetY = Math.abs(offset.y);

    // Reset motion values
    x.set(0);
    y.set(0);

    let actionTriggered = false;

    // Check if swipe meets threshold (distance or velocity)
    const meetsThreshold = (offsetVal: number, velocityVal: number) => 
      Math.abs(offsetVal) > swipeThreshold || Math.abs(velocityVal) > 500;

    if (absOffsetX > absOffsetY) {
      // Horizontal swipe
      if (offset.x > 0 && meetsThreshold(offset.x, velocity.x)) {
        // Swipe right
        if (enableTabSwitching) {
          handleTabSwitch('right');
        } else if (onSwipeRight) {
          onSwipeRight();
        }
        actionTriggered = true;
      } else if (offset.x < 0 && meetsThreshold(offset.x, velocity.x)) {
        // Swipe left
        if (enableTabSwitching) {
          handleTabSwitch('left');
        } else if (onSwipeLeft) {
          onSwipeLeft();
        }
        actionTriggered = true;
      }
    } else {
      // Vertical swipe
      if (offset.y > 0 && meetsThreshold(offset.y, velocity.y)) {
        // Swipe down
        if (onSwipeDown) {
          onSwipeDown();
          actionTriggered = true;
        }
      } else if (offset.y < 0 && meetsThreshold(offset.y, velocity.y)) {
        // Swipe up
        if (onSwipeUp) {
          onSwipeUp();
          actionTriggered = true;
        }
      }
    }

    // Haptic feedback for successful action
    if (actionTriggered && enableHaptics) {
      triggerHaptic('success');
    }

    // Reset swipe state
    setSwipeState({
      isSwipeActive: false,
      swipeDirection: null,
      swipeProgress: 0
    });
  }, [
    disabled, 
    swipeThreshold, 
    x, 
    y, 
    enableTabSwitching, 
    onSwipeRight, 
    onSwipeLeft, 
    onSwipeUp, 
    onSwipeDown,
    enableHaptics,
    triggerHaptic
  ]);

  /**
   * Handle tab switching via gestures
   */
  const handleTabSwitch = useCallback((direction: 'left' | 'right') => {
    if (!currentRoute || !tabRoutes.length) return;

    const currentIndex = tabRoutes.findIndex(route => route === currentRoute);
    if (currentIndex === -1) return;

    let nextIndex: number;
    if (direction === 'left') {
      nextIndex = currentIndex + 1;
      if (nextIndex >= tabRoutes.length) nextIndex = 0; // Wrap to first
    } else {
      nextIndex = currentIndex - 1;
      if (nextIndex < 0) nextIndex = tabRoutes.length - 1; // Wrap to last
    }

    const nextRoute = tabRoutes[nextIndex];
    if (nextRoute) {
      navigate(nextRoute);
    }
  }, [currentRoute, tabRoutes, navigate]);

  if (disabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={`relative ${className}`}
      style={{
        x,
        y,
        rotateY,
        opacity
      }}
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.1}
      onPanStart={handlePanStart}
      onPan={handlePan}
      onPanEnd={handlePanEnd}
      whileDrag={{
        scale: 0.95,
        transition: { type: "spring", stiffness: 400, damping: 25 }
      }}
    >
      {children}
      
      {/* Swipe indicator */}
      {swipeState.isSwipeActive && swipeState.swipeDirection && (
        <motion.div
          className={`
            absolute inset-0 pointer-events-none flex items-center justify-center
            bg-gradient-to-r from-transparent via-white/10 to-transparent
            ${swipeState.swipeDirection === 'left' ? 'bg-gradient-to-l' : ''}
            ${swipeState.swipeDirection === 'right' ? 'bg-gradient-to-r' : ''}
            ${swipeState.swipeDirection === 'up' ? 'bg-gradient-to-t' : ''}
            ${swipeState.swipeDirection === 'down' ? 'bg-gradient-to-b' : ''}
          `}
          initial={{ opacity: 0 }}
          animate={{ opacity: swipeState.swipeProgress * 0.3 }}
        >
          <motion.div
            className="text-white/70 text-sm font-medium"
            animate={{
              scale: 1 + (swipeState.swipeProgress * 0.2),
              opacity: swipeState.swipeProgress
            }}
          >
            {swipeState.swipeProgress >= 1 ? 'Release to navigate' : 'Keep swiping...'}
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default GestureHandler;