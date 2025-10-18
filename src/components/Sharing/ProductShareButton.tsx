// src/components/sharing/ProductShareButton.tsx
// Share button for products with tracking
// Story 4.9 - Social Sharing Actions

import React from 'react';
import { Share2 } from 'lucide-react';
import { useWebShare } from '@/hooks/useWebShare';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ProductShareButtonProps {
  /** Product ID */
  productId: string;
  /** Product name for share text */
  productName: string;
  /** Product description for share text */
  productDescription?: string;
  /** Product URL (defaults to /products/{productId}) */
  productUrl?: string;
  /** Button variant */
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  /** Button size */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  /** Additional CSS classes */
  className?: string;
  /** Show text label (true by default for default/outline, false for ghost/icon) */
  showLabel?: boolean;
  /** Custom label text */
  label?: string;
  /** Callback on successful share */
  onShareSuccess?: () => void;
}

/**
 * Share button for products
 * 
 * @example
 * ```tsx
 * <ProductShareButton
 *   productId={product.id}
 *   productName={product.name}
 *   productDescription={product.description}
 *   variant="ghost"
 *   size="sm"
 * />
 * ```
 */
export function ProductShareButton({
  productId,
  productName,
  productDescription,
  productUrl,
  variant = 'ghost',
  size = 'sm',
  className,
  showLabel,
  label = 'Share',
  onShareSuccess
}: ProductShareButtonProps) {
  const { share, isSharing } = useWebShare({
    entityType: 'product',
    entityId: productId,
    metadata: {
      product_name: productName
    },
    onSuccess: onShareSuccess
  });

  // Auto-determine showLabel based on variant if not explicitly set
  const shouldShowLabel = showLabel ?? (['default', 'outline'].includes(variant));

  const handleShare = async () => {
    const url = productUrl || `${window.location.origin}/products/${productId}`;
    
    await share({
      title: productName,
      text: productDescription || `Check out this product: ${productName}`,
      url
    });
  };

  return (
    <Button
      onClick={handleShare}
      disabled={isSharing}
      variant={variant}
      size={size}
      className={cn('gap-2', className)}
      aria-label={`Share ${productName}`}
    >
      <Share2 className="h-4 w-4" />
      {shouldShowLabel && (
        <span className="hidden sm:inline">
          {isSharing ? 'Sharing...' : label}
        </span>
      )}
    </Button>
  );
}
