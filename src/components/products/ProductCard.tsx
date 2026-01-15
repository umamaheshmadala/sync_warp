import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star } from 'lucide-react';
import { Product } from '../../types/product';
import { Card, CardContent } from '../ui/card';
import { cn } from '../../lib/utils';
import { useBusinessUrl } from '../../hooks/useBusinessUrl';
import { getOptimizedImageUrl } from '../../utils/imageUtils';
import { FavoriteProductButton } from '../favorites/FavoriteProductButton';
import { ProductShareButton } from '../Sharing/ProductShareButton';

interface ProductCardProps {
  product: Product;
  size?: 'small' | 'medium' | 'large';
  showActions?: boolean;
  onClick?: () => void;
  showRemoveButton?: boolean;
  onRemoved?: () => void;
}

const ProductCardBase = ({
  product,
  size = 'medium',
  showActions = true,
  onClick,
  showRemoveButton = false,
  onRemoved
}: ProductCardProps) => {
  const navigate = useNavigate();
  const { getBusinessUrl } = useBusinessUrl();
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  // Social features removed from card to improve performance
  // Actions are handled in ProductView modal only

  // Get the first image or fallback
  const rawImage = product.image_urls && product.image_urls.length > 0
    ? product.image_urls[0]
    : '/placeholder-product.jpg';

  // Optimize image size based on card size
  const targetWidth = size === 'small' ? 200 : size === 'medium' ? 300 : 400;
  const primaryImage = getOptimizedImageUrl(rawImage, targetWidth);

  // Get currency symbol
  const getCurrencySymbol = (currency: string) => {
    const symbols: { [key: string]: string } = {
      INR: '₹',
      USD: '$',
      EUR: '€'
    };
    return symbols[currency] || currency;
  };

  const handleCardClick = () => {
    if (onClick) {
      onClick();
    } else {
      // Default: navigate to product details
      navigate(`${getBusinessUrl(product.business_id, product.business?.name)}/product/${product.id}`);
    }
  };

  // Removed unused handlers and state for performance
  const sizeClasses = {
    small: 'h-48',
    medium: 'h-56',
    large: 'h-72'
  };

  return (
    <Card
      className={cn(
        'group cursor-pointer overflow-hidden transition-all',
      )}
      onClick={handleCardClick}
      data-testid="product-card"
      style={{
        transform: 'translateZ(0)', // Force GPU layer
      }}
    >
      <CardContent className="p-0">
        {/* Image Container - 9:16 Portrait Aspect Ratio */}
        <div className="relative overflow-hidden bg-gray-100 aspect-[9/16]">
          {/* Blur placeholder (Instagram-style) - shows gradient while loading */}
          {imageLoading && (
            <div
              className="absolute inset-0 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200 animate-pulse"
            />
          )}

          <img
            src={imageError ? '/placeholder-product.jpg' : primaryImage}
            alt={product.name}
            className={cn(
              'h-full w-full object-cover transition-all duration-500 group-hover:scale-110',
              // Blur-to-sharp transition for smooth loading
              imageLoading ? 'opacity-0 scale-105 blur-sm' : 'opacity-100 scale-100 blur-0'
            )}
            onLoad={() => setImageLoading(false)}
            onError={() => {
              setImageError(true);
              setImageLoading(false);
            }}
            decoding="async"
            loading="lazy"
          />

          {/* Featured Star - Top Left */}
          {product.is_featured && (
            <div className="absolute left-2 top-2">
              <Star className="w-[25px] h-[25px] text-yellow-400 fill-yellow-400 drop-shadow-lg" />
            </div>
          )}

          {/* Multiple Images Indicator - Top Right */}
          {product.image_urls && product.image_urls.length > 1 && (
            <div className="absolute right-2 top-2">
              <div className="rounded-md p-1 bg-black/40">
                <svg width="25" height="25" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Back card */}
                  <rect x="3" y="2" width="10" height="12" rx="1.5" fill="white" fillOpacity="0.6" />
                  {/* Middle card */}
                  <rect x="2" y="3" width="10" height="12" rx="1.5" fill="white" fillOpacity="0.8" />
                  {/* Front card */}
                  <rect x="1" y="4" width="10" height="12" rx="1.5" fill="white" stroke="white" strokeWidth="0.5" />
                </svg>
              </div>
            </div>
          )}

          {/* Favorite Button - Bottom Right - Story 4.13 */}
          <div className="absolute bottom-2 right-2" onClick={(e) => e.stopPropagation()}>
            <FavoriteProductButton productId={product.id} iconOnly={true} />
          </div>

          {/* Share Button - Bottom Left - Story 10.1.3 */}
          <div className="absolute bottom-2 left-2" onClick={(e) => e.stopPropagation()}>
            <ProductShareButton
              productId={product.id}
              productName={product.name}
              productPrice={product.price}
              productCurrency={product.currency || 'INR'}
              productImage={product.image_urls?.[0]}
              businessId={product.business_id}
              businessName={product.business?.name || ''}
              businessSlug={(product.business as any)?.slug || product.business_id}
              variant="icon"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; // End of component logic

// Memoize the component to prevent unnecessary re-renders
export const ProductCard = React.memo(ProductCardBase, (prevProps, nextProps) => {
  return prevProps.product.id === nextProps.product.id &&
    prevProps.size === nextProps.size &&
    prevProps.showActions === nextProps.showActions &&
    prevProps.showRemoveButton === nextProps.showRemoveButton;
});
