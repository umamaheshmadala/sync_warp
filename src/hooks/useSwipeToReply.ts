import { useMotionValue, useAnimation, PanInfo } from "framer-motion";
import { hapticService } from "../services/hapticService";
import { useState } from "react";

interface SwipeToReplyOptions {
  onReply?: () => void;
  threshold?: number;
}

export function useSwipeToReply({ onReply, threshold = 60 }: SwipeToReplyOptions) {
  const x = useMotionValue(0);
  const controls = useAnimation();
  const [isTriggered, setIsTriggered] = useState(false);

  const onDrag = (event: any, info: PanInfo) => {
    // Only allow dragging to the right (positive x)
    if (info.offset.x < 0) return;

    // Haptic feedback when crossing threshold
    if (!isTriggered && info.offset.x > threshold) {
      setIsTriggered(true);
      hapticService.onSwipeSnap();
    } else if (isTriggered && info.offset.x < threshold) {
      setIsTriggered(false);
    }
  };

  const onDragEnd = async (event: any, info: PanInfo) => {
    if (info.offset.x > threshold) {
      onReply?.();
    }
    
    // Reset state
    setIsTriggered(false);
    
    // Snap back animation
    controls.start({ x: 0, transition: { type: "spring", stiffness: 400, damping: 25 } });
  };

  return {
    x,
    controls,
    onDrag,
    onDragEnd,
    isTriggered // Can be used to show/highlight the reply icon
  };
}
