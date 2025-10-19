// src/components/following/FollowButton.tsx
// Follow/Unfollow button for businesses with notification preferences

import React, { useState } from 'react';
import { UserPlus, UserCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { useBusinessFollowing } from '../../hooks/useBusinessFollowing';
import { cn } from '../../lib/utils';

interface FollowButtonProps {
  businessId: string;
  businessName?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  showLabel?: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
  className?: string;
}

export const FollowButton: React.FC<FollowButtonProps> = ({
  businessId,
  businessName,
  variant = 'default',
  size = 'default',
  showLabel = true,
  onFollowChange,
  className,
}) => {
  const { isFollowing, followBusiness, unfollowBusiness } = useBusinessFollowing();
  const [isAnimating, setIsAnimating] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const following = isFollowing(businessId);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isAnimating) return;

    setIsAnimating(true);

    try {
      if (following) {
        const success = await unfollowBusiness(businessId, businessName);
        if (success) {
          onFollowChange?.(false);
        }
      } else {
        const success = await followBusiness(businessId, businessName);
        if (success) {
          onFollowChange?.(true);
        }
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    } finally {
      setTimeout(() => setIsAnimating(false), 300);
    }
  };

  // Get button styles
  const getButtonStyles = () => {
    const baseStyles = "inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-lg";
    
    // Size classes
    const sizeClasses = {
      sm: "px-3 py-1.5 text-sm",
      default: "px-4 py-2 text-base",
      lg: "px-6 py-3 text-lg",
    };

    // Variant classes
    let variantClasses = "";
    if (variant === 'outline') {
      variantClasses = following
        ? "border-2 border-indigo-600 text-indigo-600 bg-white hover:bg-indigo-50"
        : "border-2 border-gray-300 text-gray-700 bg-white hover:border-indigo-600 hover:text-indigo-600";
    } else if (variant === 'ghost') {
      variantClasses = following
        ? "text-indigo-600 hover:bg-indigo-50"
        : "text-gray-700 hover:bg-gray-100";
    } else {
      // default variant
      variantClasses = following
        ? "bg-indigo-600 text-white hover:bg-indigo-700"
        : "bg-gray-200 text-gray-700 hover:bg-gray-300";
    }

    return cn(
      baseStyles,
      sizeClasses[size],
      variantClasses,
      isAnimating && "opacity-70 cursor-wait",
      "active:scale-95"
    );
  };

  // Get icon size
  const iconSize = size === 'sm' ? 16 : size === 'lg' ? 24 : 20;

  // Get label text
  const getLabel = () => {
    if (!showLabel) return null;
    
    if (following) {
      return isHovered ? 'Unfollow' : 'Following';
    }
    return 'Follow';
  };

  return (
    <motion.button
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={isAnimating}
      className={cn(getButtonStyles(), className)}
      whileTap={{ scale: 0.95 }}
      aria-label={following ? 'Unfollow business' : 'Follow business'}
    >
      {/* Icon */}
      <motion.div
        animate={{
          scale: isAnimating ? [1, 1.2, 1] : 1,
        }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-center"
      >
        {following ? (
          <UserCheck size={iconSize} className={showLabel ? "mr-2" : ""} />
        ) : (
          <UserPlus size={iconSize} className={showLabel ? "mr-2" : ""} />
        )}
      </motion.div>

      {/* Label */}
      {showLabel && (
        <span className="font-medium">
          {getLabel()}
        </span>
      )}

      {/* Loading indicator */}
      {isAnimating && (
        <motion.div
          className="ml-2"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
        </motion.div>
      )}
    </motion.button>
  );
};

export default FollowButton;
