// SimpleSaveButton.tsx
// Simple, reliable SaveButton component

import React, { useState } from 'react';
import { Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import useUnifiedFavorites from '../../hooks/useUnifiedFavorites';
import { cn } from '../../lib/utils';

interface SimpleSaveButtonProps {
  itemId: string;
  itemType: 'business' | 'coupon' | 'product';
  itemData?: any; // Optional data for enhanced features
  variant?: 'default' | 'compact' | 'large';
  size?: 'sm' | 'md' | 'lg'; // Alternative sizing
  showLabel?: boolean;
  className?: string;
  disabled?: boolean;
  onClick?: (isFavorited: boolean) => void;
  savedLabel?: string;
  unsavedLabel?: string;
}

const SimpleSaveButton: React.FC<SimpleSaveButtonProps> = ({
  itemId,
  itemType,
  itemData, // Not used in this simple version but accepted for compatibility
  variant = 'default',
  size = 'md',
  showLabel = false,
  className,
  disabled = false,
  onClick,
  savedLabel = 'Saved',
  unsavedLabel = 'Save'
}) => {
  const favorites = useUnifiedFavorites();
  const [isAnimating, setIsAnimating] = useState(false);

  // Check if item is favorited
  const isFavorited = favorites.isFavorited(itemId, itemType);

  // Handle save/unsave action
  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (disabled || isAnimating || !favorites.isAuthenticated) return;

    setIsAnimating(true);

    try {
      const result = await favorites.toggleFavorite(itemId, itemType, itemData);
      onClick?.(result);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setTimeout(() => setIsAnimating(false), 300);
    }
  };

  // Get button styles based on variant and size
  const getButtonStyles = () => {
    const baseStyles = "relative flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-full";
    
    // Handle size prop (overrides variant for sizing)
    if (size) {
      switch (size) {
        case 'sm':
          return cn(baseStyles, "w-8 h-8 text-sm");
        case 'lg':
          return cn(baseStyles, "w-12 h-12 text-lg");
        case 'md':
        default:
          return cn(baseStyles, "w-10 h-10 text-base");
      }
    }
    
    // Fallback to variant
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

  return (
    <div className={cn("inline-flex items-center", className)}>
      <motion.button
        onClick={handleToggle}
        disabled={disabled || isAnimating || !favorites.isAuthenticated}
        className={cn(
          getButtonStyles(),
          isFavorited
            ? "bg-red-50 text-red-600 hover:bg-red-100"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200",
          disabled && "opacity-50 cursor-not-allowed",
          !favorites.isAuthenticated && "opacity-60 cursor-not-allowed",
          "active:scale-95"
        )}
        whileTap={{ scale: 0.95 }}
        aria-label={isFavorited ? `Remove from favorites` : `Add to favorites`}
        title={isFavorited ? `Remove from favorites` : `Add to favorites`}
      >
        {/* Heart Icon */}
        <motion.div
          animate={{
            scale: isAnimating ? [1, 1.2, 1] : 1,
          }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-center"
        >
          <Heart
            size={getIconSize()}
            className={cn(
              "transition-colors duration-200",
              isFavorited ? "fill-current text-red-600" : "text-current"
            )}
          />
        </motion.div>

        {/* Loading indicator */}
        {isAnimating && (
          <motion.div
            className="absolute inset-0 rounded-full bg-current opacity-20"
            initial={{ scale: 0 }}
            animate={{ scale: 2, opacity: 0 }}
            transition={{ duration: 0.4 }}
          />
        )}
      </motion.button>

      {/* Optional label */}
      {showLabel && (
        <motion.span
          animate={{ 
            opacity: isFavorited ? 1 : 0.7,
            color: isFavorited ? "#dc2626" : "#6b7280"
          }}
          className="ml-2 text-sm font-medium transition-colors duration-200"
        >
          {isFavorited ? savedLabel : unsavedLabel}
        </motion.span>
      )}
    </div>
  );
};

export default SimpleSaveButton;
export { SimpleSaveButton };
