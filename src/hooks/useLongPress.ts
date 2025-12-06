import { useRef, useCallback, useState } from "react";
import { hapticService } from "../services/hapticService";

/**
 * Options for the useLongPress hook
 */
interface LongPressOptions {
  /** Callback fired when long press threshold is reached */
  onLongPress: () => void;
  /** Optional callback for normal click/press */
  onPress?: () => void;
  /** Time in ms to wait before triggering long press. Default 500ms */
  threshold?: number;
  /** Distance in pixels finger can move before cancelling long press. Default 10px */
  moveThreshold?: number;
}

interface LongPressResult {
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseUp: (e: React.MouseEvent) => void;
  onMouseLeave: (e: React.MouseEvent) => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  isLongPressing: boolean;
}

export function useLongPress({
  onLongPress,
  onPress,
  threshold = 500,
  moveThreshold = 10,
}: LongPressOptions): LongPressResult {
  const timerRef = useRef<NodeJS.Timeout>();
  const isLongPressRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const [isLongPressing, setIsLongPressing] = useState(false);

  // Clear timer and state
  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
    setIsLongPressing(false);
  }, []);

  // Start the timer
  const start = useCallback(
    (x: number, y: number) => {
      clear(); // Ensure clean state
      isLongPressRef.current = false;
      startPosRef.current = { x, y };

      timerRef.current = setTimeout(async () => {
        isLongPressRef.current = true;
        setIsLongPressing(true);

        // Native haptic feedback for long press
        await hapticService.onLongPress();

        onLongPress();
      }, threshold);
    },
    [onLongPress, threshold, clear]
  );

  // Handle pointer release
  const handleEnd = useCallback(
    (e?: React.MouseEvent | React.TouchEvent) => {
      // If we are scrolling or moved too much, clear happened in handleMove
      if (timerRef.current) {
        clear();
        // If it wasn't a long press, trigger normal press
        if (!isLongPressRef.current && onPress) {
           // Prevent ghost clicks if needed, but usually onPress logic goes here
           onPress();
        }
      }
      isLongPressRef.current = false;
    },
    [clear, onPress]
  );

  // Handle movement (cancel if scrolling)
  const handleMove = useCallback(
    (x: number, y: number) => {
      if (!timerRef.current) return;

      const dx = Math.abs(x - startPosRef.current.x);
      const dy = Math.abs(y - startPosRef.current.y);

      // If finger moved significantly, it's a scroll/swipe, not a long press
      if (dx > moveThreshold || dy > moveThreshold) {
        clear();
      }
    },
    [clear, moveThreshold]
  );

  // Mouse Event Handlers (Desktop/Web)
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only left click
      if (e.button === 0) {
        start(e.clientX, e.clientY);
      }
    },
    [start]
  );

  const onMouseUp = useCallback(
    (e: React.MouseEvent) => {
      handleEnd(e);
    },
    [handleEnd]
  );

  const onMouseLeave = useCallback(
    (e: React.MouseEvent) => {
      clear();
    },
    [clear]
  );

  // Touch Event Handlers (Mobile)
  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      // Only single touch
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        start(touch.clientX, touch.clientY);
      }
    },
    [start]
  );

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      handleEnd(e);
    },
    [handleEnd]
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      handleMove(touch.clientX, touch.clientY);
    },
    [handleMove]
  );

  return {
    onMouseDown,
    onMouseUp,
    onMouseLeave,
    onTouchStart,
    onTouchEnd,
    onTouchMove,
    isLongPressing,
  };
}
