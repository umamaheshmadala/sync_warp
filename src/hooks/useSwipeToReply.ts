import { useState, useRef } from "react";
import { hapticService } from "../services/hapticService";

interface SwipeToReplyOptions {
  onReply?: () => void;
  threshold?: number;
}

export function useSwipeToReply({ onReply, threshold = 60 }: SwipeToReplyOptions) {
  const [x, setX] = useState(0);
  const [isTriggered, setIsTriggered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef<number | null>(null);

  const onTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    startX.current = clientX;
    setIsDragging(true);
  };

  const onTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (startX.current === null) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const deltaX = clientX - startX.current;

    // Only allow dragging to the right (positive x) with resistance (elasticity)
    const newX = deltaX > 0 ? deltaX * 0.4 : 0;

    setX(newX);

    // Haptic feedback when crossing threshold
    if (!isTriggered && newX > threshold) {
      setIsTriggered(true);
      hapticService.onSwipeSnap();
    } else if (isTriggered && newX < threshold) {
      setIsTriggered(false);
    }
  };

  const onTouchEnd = () => {
    if (x > threshold) {
      onReply?.();
    }

    // Reset state and snap back
    setX(0);
    setIsTriggered(false);
    setIsDragging(false);
    startX.current = null;
  };

  return {
    x,
    isTriggered,
    isDragging,
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onMouseDown: onTouchStart,
      onMouseMove: onTouchMove,
      onMouseUp: onTouchEnd,
      onMouseLeave: onTouchEnd
    }
  };
}
