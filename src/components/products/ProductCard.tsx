import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Share2, List } from 'lucide-react';
import { Product } from '../../types/product';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';

interface ProductCardProps {
  product: Product;
  size?: 'small' | 'medium' | 'large';
  showActions?: boolean;
  onClick?: () => void;
}

export function ProductCard({
  product,
  size = 'medium',
  showActions = true,
  onClick
}: ProductCardProps) {
  const navigate = useNavigate();
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

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
      navigate(`/business/${product.business_id}/product/${product.id}`);
    }
  };

  const handleActionClick = (e: React.MouseEvent, action: 'favorite' | 'share' | 'wishlist') => {
    e.stopPropagation();
    // These will be implemented with hooks
    console.log(`${action} clicked for product:`, product.id);
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
    >
      <CardContent className="p-0">
        {/* Image Container */}
        <div className={cn('relative overflow-hidden bg-gray-100', sizeClasses[size])}>
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
            loading="lazy"
          />

          {/* Featured Badge */}
          {product.is_featured && (
            <Badge
              className="absolute left-2 top-2 bg-yellow-500 text-black"
              variant="secondary"
            >
              Featured
            </Badge>
          )}

          {/* Stock Status */}
          {!product.is_available && (
            <Badge
              className="absolute right-2 top-2 bg-red-500"
              variant="destructive"
            >
              Out of Stock
            </Badge>
          )}
        </div>

        {/* Product Info */}
        <div className="p-4">
          <h3 className="line-clamp-2 font-semibold text-sm md:text-base">
            {product.name}
          </h3>

          {product.description && (
            <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
              {product.description}
            </p>
          )}

          {/* Price */}
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-lg font-bold text-primary">
              {getCurrencySymbol(product.currency)}
              {product.price?.toLocaleString() || '0'}
            </span>
            {product.category && (
              <span className="text-xs text-muted-foreground">
                • {product.category}
              </span>
            )}
          </div>

          {/* Actions */}
          {showActions && (
            <div className="mt-3 flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={(e) => handleActionClick(e, 'favorite')}
                aria-label="Add to favorites"
                data-testid="favorite-button"
              >
                <Heart className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={(e) => handleActionClick(e, 'share')}
                aria-label="Share product"
                data-testid="share-button"
              >
                <Share2 className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={(e) => handleActionClick(e, 'wishlist')}
                aria-label="Add to wishlist"
                data-testid="wishlist-button"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
