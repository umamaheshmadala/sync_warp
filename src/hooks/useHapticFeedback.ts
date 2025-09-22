// src/hooks/useHapticFeedback.ts
import { useCallback } from 'react';

export type HapticType = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' | 'success' | 'warning' | 'error';

interface HapticFeedback {
  triggerHaptic: (type: HapticType) => void;
  isSupported: boolean;
}

/**
 * Custom hook for haptic feedback support across different devices
 * Provides native-like tactile feedback for mobile interactions
 */
export const useHapticFeedback = (): HapticFeedback => {
  // Check if haptic feedback is supported
  const isSupported = 'vibrate' in navigator || 'hapticEngine' in window;

  /**
   * Trigger haptic feedback with different intensities
   */
  const triggerHaptic = useCallback((type: HapticType) => {
    try {
      // Modern browsers with Vibration API
      if ('vibrate' in navigator) {
        const patterns = {
          light: [10],           // Quick, subtle tap
          medium: [20],          // Standard tap
          heavy: [30],           // Strong tap
          rigid: [15, 5, 15],    // Double tap pattern
          soft: [5, 3, 5, 3, 5], // Gentle pulse
          success: [10, 5, 10],  // Success pattern
          warning: [25, 10, 25], // Warning pattern
          error: [50, 20, 50]    // Error pattern (strong)
        };
        
        navigator.vibrate(patterns[type] || patterns.light);
        return;
      }

      // iOS Safari with experimental haptic engine
      if ('hapticEngine' in window) {
        const intensity = {
          light: 0.3,
          medium: 0.5,
          heavy: 0.8,
          rigid: 0.7,
          soft: 0.2,
          success: 0.6,
          warning: 0.7,
          error: 1.0
        };

        // @ts-ignore - Experimental API
        window.hapticEngine?.impactOccurred?.(intensity[type] || 0.3);
        return;
      }

      // Fallback: Use audio feedback for desktop
      if (!('ontouchstart' in window)) {
        // Create a subtle audio feedback for desktop users
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Configure based on haptic type
        const frequency = {
          light: 800,
          medium: 600,
          heavy: 400,
          rigid: 700,
          soft: 900,
          success: 550,
          warning: 450,
          error: 300
        };
        
        oscillator.frequency.setValueAtTime(frequency[type] || 600, audioContext.currentTime);
        oscillator.type = 'sine';
        
        // Quick, subtle beep
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.01, audioContext.currentTime + 0.01);
        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.05);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.05);
      }
    } catch (error) {
      // Silently fail if haptic feedback is not supported
      console.debug('Haptic feedback not available:', error);
    }
  }, []);

  return {
    triggerHaptic,
    isSupported
  };
};

/**
 * Predefined haptic patterns for common UI interactions
 */
export const hapticPatterns = {
  // Navigation
  tabSwitch: 'light' as HapticType,
  buttonTap: 'medium' as HapticType,
  menuOpen: 'soft' as HapticType,
  menuClose: 'light' as HapticType,
  
  // Feedback
  success: 'success' as HapticType,
  error: 'error' as HapticType,
  warning: 'warning' as HapticType,
  
  // Interactions
  swipeStart: 'light' as HapticType,
  swipeComplete: 'medium' as HapticType,
  longPress: 'heavy' as HapticType,
  drag: 'rigid' as HapticType,
  
  // Notifications
  newMessage: 'medium' as HapticType,
  notification: 'soft' as HapticType,
  alert: 'heavy' as HapticType
};

export default useHapticFeedback;