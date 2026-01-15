import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, List, Package } from 'lucide-react';
import { useProducts } from '../../hooks/useProducts';
import { useSimpleProductSocial } from '../../hooks/useSimpleProductSocial';
import useUnifiedFavorites from '../../hooks/useUnifiedFavorites';
import { useBusinessUrl } from '../../hooks/useBusinessUrl';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { ProductCard } from './ProductCard';

import { ProductShareButton } from '../Sharing/ProductShareButton';
import { cn } from '../../lib/utils';

export function ProductDetails() {
  const { businessId, productId } = useParams<{ businessId: string; productId: string }>();
  const navigate = useNavigate();
  const { getBusinessUrl } = useBusinessUrl();
  const { product, loading, error, fetchProduct, fetchProducts } = useProducts(businessId);

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [imageLoading, setImageLoading] = useState(true);


  // Social features
  const {
    isInWishlist,
    toggleWishlist,
    isLoading: socialLoading
  } = useSimpleProductSocial();

  // Use UnifiedFavorites for product favorites
  const unifiedFavorites = useUnifiedFavorites();

  const isFavorited = (productId: string) => unifiedFavorites.isFavorited(productId, 'product');

  const toggleFavorite = async (product: any) => {
    await unifiedFavorites.toggleFavorite(product.id, 'product', {
      name: product.name,
      description: product.description,
      price: product.price,
      currency: product.currency,
      image_url: product.image_urls?.[0],
      category: product.category,
      business_id: product.business_id
    });
  };

  // Fetch product and related products
  useEffect(() => {
    if (productId) {
      fetchProduct(productId);
    }
  }, [productId]);

  useEffect(() => {
    if (product && businessId) {
      // Fetch related products (same category, excluding current)
      fetchProducts(businessId, {
        category: product.category,
      }).then((products) => {
        const filtered = products.filter(p => p.id !== product.id).slice(0, 3);
        setRelatedProducts(filtered);
      });
    }
  }, [product, businessId]);

  const handleBack = () => {
    // Extract business name from product if available
    const businessName = product?.business?.name;
    navigate(getBusinessUrl(businessId!, businessName));
  };

  const handleFavoriteClick = async () => {
    if (!product) return;
    try {
      await toggleFavorite(product);
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const handleWishlistClick = async () => {
    if (!product) return;
    try {
      await toggleWishlist(product);
    } catch (error) {
      console.error('Failed to toggle wishlist:', error);
    }
  };



  const getCurrencySymbol = (currency: string) => {
    const symbols: { [key: string]: string } = {
      INR: '₹',
      USD: '$',
      EUR: '€'
    };
    return symbols[currency] || currency;
  };

  // Loading State
  if (loading) {
    return (
      <div className="container mx-auto max-w-6xl p-4">
        <Skeleton className="mb-4 h-10 w-32" />
        <div className="grid gap-8 md:grid-cols-2">
          <div className="space-y-4">
            <Skeleton className="h-96 w-full" />
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-20" />
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (error || !product) {
    return (
      <div className="container mx-auto max-w-6xl p-4">
        <Button variant="ghost" onClick={handleBack} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Store
        </Button>
        <div className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 p-8 text-center">
          <Package className="h-12 w-12 text-red-400" />
          <h3 className="mt-4 text-lg font-semibold text-red-900">Product not found</h3>
          <p className="mt-2 text-sm text-red-600">
            {error || 'The product you are looking for does not exist.'}
          </p>
        </div>
      </div>
    );
  }

  const images = product.image_urls && product.image_urls.length > 0
    ? product.image_urls
    : ['/placeholder-product.jpg'];

  const selectedImage = images[selectedImageIndex] || images[0];

  return (
    <div className="container mx-auto max-w-6xl p-4">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={handleBack}
        className="mb-4"
        data-testid="back-button"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Store
      </Button>

      {/* Main Product Section */}
      <div className="grid gap-8 md:grid-cols-2">
        {/* Image Gallery */}
        <div className="space-y-4">
          {/* Main Image */}
          <div className="relative aspect-square overflow-hidden rounded-lg border bg-gray-100">
            {imageLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            )}
            <img
              src={selectedImage}
              alt={product.name}
              className="h-full w-full object-contain"
              onLoad={() => setImageLoading(false)}
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder-product.jpg';
                setImageLoading(false);
              }}
            />

            {/* Badges */}
            {product.is_featured && (
              <Badge className="absolute left-3 top-3 bg-yellow-500 text-black">
                Featured
              </Badge>
            )}
            {!product.is_available && (
              <Badge className="absolute right-3 top-3 bg-red-500">
                Out of Stock
              </Badge>
            )}
          </div>

          {/* Thumbnail Gallery */}
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setSelectedImageIndex(index);
                    setImageLoading(true);
                  }}
                  className={`h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all ${selectedImageIndex === index
                    ? 'border-primary'
                    : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                  <img
                    src={image}
                    alt={`${product.name} - ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Information */}
        <div className="space-y-6">
          {/* Title and Price */}
          <div>
            <h1 className="text-3xl font-bold">{product.name}</h1>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-primary">
                {getCurrencySymbol(product.currency)}
                {product.price?.toLocaleString() || '0'}
              </span>
              <Badge variant={product.is_available ? 'default' : 'secondary'}>
                {product.is_available ? 'In Stock' : 'Out of Stock'}
              </Badge>
            </div>
          </div>

          {/* Category */}
          {product.category && (
            <div>
              <span className="text-sm font-medium text-muted-foreground">
                Category: <span className="text-foreground">{product.category}</span>
              </span>
            </div>
          )}

          {/* Description */}
          {product.description && (
            <div>
              <h2 className="mb-2 font-semibold">Description</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {product.description}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className={cn(
                'flex-1 transition-colors',
                product && isFavorited(product.id) && 'border-red-500 bg-red-50 text-red-600 hover:bg-red-100'
              )}
              onClick={handleFavoriteClick}
              disabled={socialLoading}
              data-testid="favorite-button"
            >
              <Heart
                className={cn(
                  'mr-2 h-4 w-4',
                  product && isFavorited(product.id) && 'fill-current'
                )}
              />
              {product && isFavorited(product.id) ? 'Favorited' : 'Favorite'}
            </Button>
            <ProductShareButton
              productId={product.id}
              productName={product.name}
              productDescription={product.description}
              productPrice={product.price}
              productCurrency={product.currency}
              productImage={product.image_urls?.[0]}
              businessId={product.business_id}
              businessName={product.business?.name || ''}
              variant="outline"
              size="default"
              className="flex-1"
              showLabel={true}
              label="Share"
              onShareSuccess={() => {
                console.log('Product shared from details page');
              }}
            />
            <Button
              variant="outline"
              className={cn(
                'flex-1 transition-colors',
                product && isInWishlist(product.id) && 'border-blue-500 bg-blue-50 text-blue-600 hover:bg-blue-100'
              )}
              onClick={handleWishlistClick}
              disabled={socialLoading}
              data-testid="wishlist-button"
            >
              <List
                className={cn(
                  'mr-2 h-4 w-4',
                  product && isInWishlist(product.id) && 'fill-current'
                )}
              />
              {product && isInWishlist(product.id) ? 'In Wishlist' : 'Wishlist'}
            </Button>
          </div>

          {/* Business Info */}
          <div className="rounded-lg border bg-gray-50 p-4">
            <h3 className="mb-2 font-semibold">About this business</h3>
            <Button
              variant="link"
              className="h-auto p-0 text-primary"
              onClick={handleBack}
            >
              Visit Store →
            </Button>
          </div>
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="mt-12">
          <h2 className="mb-4 text-2xl font-bold">You might also like</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {relatedProducts.map((relatedProduct) => (
              <ProductCard
                key={relatedProduct.id}
                product={relatedProduct}
                size="medium"
                showActions={true}
              />
            ))}
          </div>
        </div>
      )}


    </div>
  );
}
