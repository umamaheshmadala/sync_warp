// =====================================================
// Story 4.10 + Story 12.23: Star Icon for Favourites
// Component: FavoriteProductButton - Toggle product favourites
// =====================================================

import React from 'react';
import { Star, Loader2 } from 'lucide-react';
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
        aria-label={isFavorited ? 'Remove from Favourites' : 'Add to Favourites'}
        className={cn(
          'relative transition-all duration-200',
          'hover:scale-110 active:scale-95',
          className
        )}
        title={isFavorited ? 'Remove from Favourites' : 'Add to Favourites'}
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        ) : (
          <Star
            className={cn(
              'h-5 w-5 transition-all duration-200',
              isFavorited && 'fill-yellow-400 text-yellow-400 scale-110',
              !isFavorited && 'text-gray-400 hover:text-yellow-500'
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
        isFavorited && 'bg-yellow-50 hover:bg-yellow-100 text-yellow-600 border-yellow-200',
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
          <Star
            className={cn(
              'mr-2 h-4 w-4 transition-all duration-200',
              isFavorited && 'fill-current scale-110'
            )}
          />
          {isFavorited ? 'Favourited' : 'Favourite'}
        </>
      )}
    </Button>
  );
}

export default FavoriteProductButton;
