// =====================================================
// Story 4.10: Storefront Minor Enhancements
// Component: FavoriteProductButton - Toggle product favorites
// =====================================================

import React from 'react';
import { Heart, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { useFavoriteProduct } from '../../hooks/useFavoriteProduct';
import { cn } from '../../lib/utils';

export interface FavoriteProductButtonProps {
  /** Product ID to favorite/unfavorite */
  productId: string;
  
  /** Product name for toast messages */
  productName?: string;
  
  /** Display variant - icon (compact) or button (with text) */
  variant?: 'icon' | 'button';
  
  /** Size of the button */
  size?: 'sm' | 'default' | 'lg' | 'icon';
  
  /** Additional CSS classes */
  className?: string;
  
  /** Initially favorited state (for SSR) */
  initialFavorited?: boolean;
}

/**
 * Button component to favorite/unfavorite products
 * 
 * Features:
 * - Heart icon that fills when favorited
 * - Optimistic UI updates
 * - Loading spinner during API calls
 * - Toast notifications
 * - Two variants: icon-only or button with text
 * - Handles authentication prompts
 * 
 * @example
 * // Icon variant (compact, for product cards)
 * <FavoriteProductButton productId="123" productName="Cool Product" variant="icon" />
 * 
 * // Button variant (with text, for product details)
 * <FavoriteProductButton productId="123" productName="Cool Product" variant="button" />
 */
export function FavoriteProductButton({
  productId,
  productName,
  variant = 'icon',
  size,
  className,
  initialFavorited = false,
}: FavoriteProductButtonProps) {
  const { isFavorited, loading, checking, toggleFavorite } = useFavoriteProduct(
    productId,
    productName
  );

  // Determine button size based on variant if not explicitly set
  const buttonSize = size || (variant === 'icon' ? 'icon' : 'sm');

  // Icon variant (compact)
  if (variant === 'icon') {
    return (
      <Button
        variant="ghost"
        size={buttonSize}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleFavorite();
        }}
        disabled={loading || checking}
        aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
        className={cn(
          'relative transition-all duration-200',
          'hover:scale-110 active:scale-95',
          className
        )}
        title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        ) : (
          <Heart
            className={cn(
              'h-5 w-5 transition-all duration-200',
              isFavorited && 'fill-red-500 text-red-500 scale-110',
              !isFavorited && 'text-gray-400 hover:text-red-500'
            )}
          />
        )}
      </Button>
    );
  }

  // Button variant (with text)
  return (
    <Button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite();
      }}
      disabled={loading || checking}
      variant={isFavorited ? 'default' : 'outline'}
      size={buttonSize}
      className={cn(
        'transition-all duration-200',
        isFavorited && 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200',
        className
      )}
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {isFavorited ? 'Removing...' : 'Adding...'}
        </>
      ) : (
        <>
          <Heart
            className={cn(
              'mr-2 h-4 w-4 transition-all duration-200',
              isFavorited && 'fill-current scale-110'
            )}
          />
          {isFavorited ? 'Favorited' : 'Favorite'}
        </>
      )}
    </Button>
  );
}

export default FavoriteProductButton;
