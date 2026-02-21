// SaveButton.tsx
// Reusable component for adding/removing items from favorites
// Features animated heart icon and supports both businesses and coupons

import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import useFavorites from '../../hooks/useFavorites';
import { cn } from '../../lib/utils';

interface SaveButtonProps {
  // Item identification
  itemId: string;
  itemType: 'business' | 'coupon';
  
  // Visual customization
  variant?: 'default' | 'compact' | 'large';
  showLabel?: boolean;
  className?: string;
  
  // Behavior
  disabled?: boolean;
  onClick?: (isFavorited: boolean) => void;
  
  // Custom labels
  savedLabel?: string;
  unsavedLabel?: string;
}

const SaveButton: React.FC<SaveButtonProps> = ({
  itemId,
  itemType,
  variant = 'default',
  showLabel = false,
  className,
  disabled = false,
  onClick,
  savedLabel = 'Saved',
  unsavedLabel = 'Save'
}) => {
  const favorites = useFavorites({ autoLoad: true });
  const {
    toggleBusinessFavorite,
    toggleCouponFavorite,
    isBusinessFavorited,
    isCouponFavorited,
    isAuthenticated
  } = favorites;

  const [isAnimating, setIsAnimating] = useState(false);
  const [, forceUpdate] = useState({});
  
  // Check if item is favorited directly from cache - no local state needed
  const isFavorited = itemType === 'business' 
    ? isBusinessFavorited(itemId)
    : isCouponFavorited(itemId);
  
  // Force re-render when cache updates
  useEffect(() => {
    // This effect will run when the favorites state changes
    const timer = setTimeout(() => forceUpdate({}), 10);
    return () => clearTimeout(timer);
  }, [favorites.counts, favorites.totalFavorites]);
  
  // Additional effect to handle cache timestamp changes with more aggressive polling during animation
  useEffect(() => {
    const pollInterval = isAnimating ? 50 : 200; // Poll more frequently during animation
    
    const interval = setInterval(() => {
      const currentState = itemType === 'business' 
        ? isBusinessFavorited(itemId)
        : isCouponFavorited(itemId);
      // Force update only if needed
      if (currentState !== isFavorited) {
        forceUpdate({});
      }
    }, pollInterval);
    
    return () => clearInterval(interval);
  }, [itemType, itemId, isFavorited, isBusinessFavorited, isCouponFavorited, isAnimating]);

  // Handle save/unsave action
  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (disabled || isAnimating) return;

    if (!isAuthenticated) {
      // Could trigger a sign-in modal here
      return;
    }

    setIsAnimating(true);

    try {
      let result: boolean;
      
      if (itemType === 'business') {
        result = await toggleBusinessFavorite(itemId);
      } else {
        result = await toggleCouponFavorite(itemId);
      }

      // Result will be reflected in cache immediately
      
      // Call optional callback
      onClick?.(result);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      // Delay to allow animation to complete
      setTimeout(() => setIsAnimating(false), 300);
    }
  };

  // Get button styles based on variant
  const getButtonStyles = () => {
    const baseStyles = "relative flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-full";
    
    switch (variant) {
      case 'compact':
        return cn(baseStyles, "w-8 h-8 text-sm");
      case 'large':
        return cn(baseStyles, "w-12 h-12 text-lg");
      case 'default':
      default:
        return cn(baseStyles, "w-10 h-10 text-base");
    }
  };

  // Get heart icon size based on variant
  const getIconSize = () => {
    switch (variant) {
      case 'compact':
        return 16;
      case 'large':
        return 24;
      case 'default':
      default:
        return 20;
    }
  };

  // Animation variants for the heart
  const heartVariants = {
    idle: { 
      scale: 1, 
      rotate: 0,
      transition: { duration: 0.2 }
    },
    favorited: { 
      scale: [1, 1.3, 1], 
      rotate: [0, -10, 10, 0],
      transition: { duration: 0.4, times: [0, 0.5, 1] }
    },
    unfavorited: { 
      scale: [1, 0.8, 1], 
      transition: { duration: 0.3 }
    }
  };

  // Pulse animation for loading state
  const pulseVariants = {
    pulse: {
      scale: [1, 1.1, 1],
      transition: { duration: 0.6, repeat: Infinity }
    }
  };

  return (
    <div className={cn("inline-flex items-center", className)}>
      <button
        onClick={handleToggle}
        disabled={disabled || isAnimating || !isAuthenticated}
        className={cn(
          getButtonStyles(),
          isFavorited
            ? "bg-red-50 text-red-600 hover:bg-red-100"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200",
          disabled && "opacity-50 cursor-not-allowed",
          !isAuthenticated && "opacity-60 cursor-not-allowed",
          "active:scale-95"
        )}
        aria-label={isFavorited ? `Remove from favorites` : `Add to favorites`}
        title={isFavorited ? `Remove from favorites` : `Add to favorites`}
      >
        {/* Heart Icon with Animation */}
        <div
          className="flex items-center justify-center"
        >
          <Heart
            size={getIconSize()}
            className={cn(
              "transition-colors duration-200",
              isFavorited ? "fill-current text-red-600" : "text-current"
            )}
          />
        </div>

        {/* Ripple effect on click */}
        {isAnimating && (
          <div
            className="absolute inset-0 rounded-full bg-current opacity-20 animate-fadeIn"
          />
        )}
      </button>

      {/* Optional label */}
      {showLabel && (
        <span
          className="ml-2 text-sm font-medium transition-colors duration-200 animate-fadeIn"
        >
          {isFavorited ? savedLabel : unsavedLabel}
        </span>
      )}

      {/* Floating heart animation on save */}
      {isAnimating && isFavorited && (
        <div
          className="absolute pointer-events-none animate-fadeIn"
        >
          <Heart size={16} className="fill-red-500 text-red-500" />
        </div>
      )}
    </div>
  );
};

export default SaveButton;