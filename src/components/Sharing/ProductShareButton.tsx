// src/components/sharing/ProductShareButton.tsx
// Share button for products with unified sharing
// Story 10.1.3 - Product Sharing (Updated from Story 4.9)

import React, { useState, useMemo } from 'react';
import { Share2 } from 'lucide-react';
import { useUnifiedShare } from '@/hooks/useUnifiedShare';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ShareModal } from './ShareModal';

export interface ProductShareButtonProps {
  /** Product ID */
  productId: string;
  /** Product name for share text */
  productName: string;
  /** Product price */
  productPrice?: number;
  /** Product currency code */
  productCurrency?: string;
  /** Product description for share text */
  productDescription?: string;
  /** Product image URL */
  productImage?: string;
  /** Business ID */
  businessId: string;
  /** Business name */
  businessName: string;
  /** Business slug for URL */
  businessSlug?: string;
  /** Business logo (fallback image) */
  businessLogo?: string;
  /** Button variant */
  variant?: 'default' | 'outline' | 'ghost' | 'secondary' | 'icon';
  /** Button size */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  /** Additional CSS classes */
  className?: string;
  /** Show text label */
  showLabel?: boolean;
  /** Custom label text */
  label?: string;
  /** Callback on successful share */
  onShareSuccess?: () => void;
  /** Show modal (true) or quick share (false) */
  showModal?: boolean;
}

/**
 * Share button for products
 * 
 * @example
 * ```tsx
 * // Modal mode (default) - opens ShareModal with all options
 * <ProductShareButton
 *   productId={product.id}
 *   productName={product.name}
 *   productPrice={product.price}
 *   productCurrency={product.currency}
 *   productImage={product.image_urls?.[0]}
 *   businessId={business.id}
 *   businessName={business.name}
 *   businessSlug={business.slug}
 * />
 * 
 * // Quick mode - triggers native share directly
 * <ProductShareButton
 *   productId={product.id}
 *   productName={product.name}
 *   businessId={business.id}
 *   businessName={business.name}
 *   showModal={false}
 * />
 * ```
 */
export function ProductShareButton({
  productId,
  productName,
  productPrice,
  productCurrency = 'INR',
  productDescription,
  productImage,
  businessId,
  businessName,
  businessSlug,
  businessLogo,
  variant = 'ghost',
  size = 'sm',
  className,
  showLabel,
  label = 'Share',
  onShareSuccess,
  showModal = true,
}: ProductShareButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { shareNative, isSharing } = useUnifiedShare();

  // Format price with currency
  const formattedPrice = useMemo(() => {
    if (!productPrice || productPrice === 0) return '';
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: productCurrency,
      }).format(productPrice);
    } catch {
      // Fallback for unsupported currencies
      return `${productCurrency} ${productPrice}`;
    }
  }, [productPrice, productCurrency]);

  // Build share URL
  const url = useMemo(() => {
    const slug = businessSlug || businessId;
    return `${window.location.origin}/business/${slug}/product/${productId}`;
  }, [businessSlug, businessId, productId]);

  // Build description with price
  const description = useMemo(() => {
    if (productDescription) return productDescription;
    if (formattedPrice) {
      return `${productName} at ${businessName} - ${formattedPrice}`;
    }
    return `Check out ${productName} at ${businessName}!`;
  }, [productDescription, productName, businessName, formattedPrice]);

  // Get image with fallback
  const imageUrl = productImage || businessLogo;

  // Auto-determine showLabel based on variant
  const shouldShowLabel = showLabel ?? !['ghost', 'icon'].includes(variant);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (showModal) {
      setIsModalOpen(true);
    } else {
      // Quick share mode - use native share
      try {
        const result = await shareNative({
          entityType: 'product',
          entityId: productId,
          entityData: {
            title: productName,
            description,
            imageUrl,
            url,
            metadata: {
              price: productPrice,
              currency: productCurrency,
              businessName,
              businessId,
            }
          },
        });
        if (result.success) {
          onShareSuccess?.();
        }
      } catch (err) {
        console.error('Share failed:', err);
      }
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const handleShareSuccess = () => {
    onShareSuccess?.();
  };

  // Icon-only button for compact spaces
  if (variant === 'icon') {
    return (
      <>
        <button
          onClick={handleClick}
          disabled={isSharing}
          className={cn(
            'p-1.5 bg-white/90 hover:bg-white rounded-full shadow-sm transition-colors',
            isSharing && 'opacity-50 cursor-not-allowed',
            className
          )}
          title={`Share ${productName}`}
          aria-label={`Share ${productName}`}
        >
          <Share2 className="w-4 h-4" />
        </button>

        <ShareModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          entityType="product"
          entityId={productId}
          title={productName}
          description={description}
          imageUrl={imageUrl}
          url={url}
          onShareSuccess={handleShareSuccess}
        />
      </>
    );
  }

  return (
    <>
      <Button
        onClick={handleClick}
        disabled={isSharing}
        variant={(variant as any) === 'icon' ? 'ghost' : (variant as any)}
        size={size}
        className={cn('gap-2', className)}
        aria-label={`Share ${productName}`}
      >
        <Share2 className="h-4 w-4" />
        {shouldShowLabel && (
          <span>
            {isSharing ? 'Sharing...' : label}
          </span>
        )}
      </Button>

      <ShareModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        entityType="product"
        entityId={productId}
        title={productName}
        description={description}
        imageUrl={imageUrl}
        url={url}
        onShareSuccess={handleShareSuccess}
      />
    </>
  );
}
