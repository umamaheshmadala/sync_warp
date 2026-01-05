import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, List, X, Star } from 'lucide-react';
import { Product } from '../../types/product';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import { useSimpleProductSocial } from '../../hooks/useSimpleProductSocial';
import useUnifiedFavorites from '../../hooks/useUnifiedFavorites';
import ProductShareModal from './ProductShareModal';
import { ProductShareButton } from '../Sharing/ProductShareButton';
import { FavoriteProductButton } from './FavoriteProductButton';
import { useBusinessUrl } from '../../hooks/useBusinessUrl';

interface ProductCardProps {
  product: Product;
  size?: 'small' | 'medium' | 'large';
  showActions?: boolean;
  onClick?: () => void;
  showRemoveButton?: boolean;
  onRemoved?: () => void;
}

export function ProductCard({
  product,
  size = 'medium',
  showActions = true,
  onClick,
  showRemoveButton = false,
  onRemoved
}: ProductCardProps) {
  const navigate = useNavigate();
  const { getBusinessUrl } = useBusinessUrl();
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Social features - wishlist from simple social
  const {
    isInWishlist,
    toggleWishlist,
    isLoading: socialLoading
  } = useSimpleProductSocial();

  // Use UnifiedFavorites for product favorites
  const unifiedFavorites = useUnifiedFavorites();
  const isFavorited = (productId: string) => unifiedFavorites.isFavorited(productId, 'product');

  // Get the first image or fallback
  const primaryImage = product.image_urls && product.image_urls.length > 0
    ? product.image_urls[0]
    : '/placeholder-product.jpg';

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

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await unifiedFavorites.toggleFavorite(product.id, 'product', {
        name: product.name,
        description: product.description,
        price: product.price,
        currency: product.currency,
        image_url: product.image_urls?.[0],
        category: product.category,
        business_id: product.business_id
      });
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const handleWishlistClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await toggleWishlist(product);
      if (onRemoved && !isInWishlist(product.id)) {
        // Slight delay to allow toast to show
        setTimeout(() => onRemoved(), 100);
      }
    } catch (error) {
      console.error('Failed to toggle wishlist:', error);
    }
  };

  const handleRemoveClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // Show confirmation
    if (!window.confirm('Remove this product from your wishlist?')) {
      return;
    }

    try {
      await toggleWishlist(product);
      if (onRemoved) {
        setTimeout(() => onRemoved(), 100);
      }
    } catch (error) {
      console.error('Failed to remove from wishlist:', error);
    }
  };

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsShareModalOpen(true);
  };

  const sizeClasses = {
    small: 'h-48',
    medium: 'h-56',
    large: 'h-72'
  };

  return (
    <Card
      className={cn(
        'group cursor-pointer overflow-hidden transition-all hover:shadow-lg',
        'hover:scale-[1.02]'
      )}
      onClick={handleCardClick}
      data-testid="product-card"
      style={{
        contain: 'layout style paint', // Prevent layout thrashing
        transform: 'translateZ(0)', // Force GPU layer
        willChange: 'auto', // Let browser decide
        contentVisibility: 'auto' // Skip rendering off-screen cards
      }}
    >
      <CardContent className="p-0">
        {/* Image Container - 9:16 Portrait Aspect Ratio */}
        <div className="relative overflow-hidden bg-gray-100 aspect-[9/16]">
          {imageLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          )}

          <img
            src={imageError ? '/placeholder-product.jpg' : primaryImage}
            alt={product.name}
            className={cn(
              'h-full w-full object-cover transition-transform duration-300 group-hover:scale-110',
              imageLoading ? 'opacity-0' : 'opacity-100'
            )}
            onLoad={() => setImageLoading(false)}
            onError={() => {
              setImageError(true);
              setImageLoading(false);
            }}
            decoding="async"
          />

          {/* Featured Star - Top Left */}
          {product.is_featured && (
            <div className="absolute left-2 top-2">
              <Star className="w-5 h-5 text-yellow-400 fill-yellow-400 drop-shadow-lg" />
            </div>
          )}

          {/* Multiple Images Indicator - Top Right */}
          {product.image_urls && product.image_urls.length > 1 && (
            <div className="absolute right-2 top-2">
              <div className="bg-black/50 backdrop-blur-sm rounded-md p-1">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
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
        </div>

        {/* No info section - Image only */}
      </CardContent>

      {/* Share Modal */}
      <ProductShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        product={product}
        onShareSuccess={() => {
          console.log('Product shared successfully');
        }}
      />
    </Card>
  );
}
