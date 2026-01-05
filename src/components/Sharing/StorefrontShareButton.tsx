// src/components/sharing/StorefrontShareButton.tsx
// Share button for business storefronts
// Story 4.9 - Social Sharing Actions

import React from 'react';
import { Share2 } from 'lucide-react';
import { useWebShare } from '@/hooks/useWebShare';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface StorefrontShareButtonProps {
  /** Business ID */
  businessId: string;
  /** Business name for share text */
  businessName: string;
  /** Business description for share text */
  businessDescription?: string;
  /** Custom storefront URL (defaults to current window location) */
  storefrontUrl?: string;
  /** Button variant */
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  /** Button size */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  /** Additional CSS classes */
  className?: string;
  /** Show text label (true by default) */
  showLabel?: boolean;
  /** Show icon (true by default) */
  showIcon?: boolean;
  /** Custom label text */
  label?: string;
  /** Callback on successful share */
  onShareSuccess?: () => void;
}

/**
 * Share button for business storefronts
 * 
 * @example
 * ```tsx
 * <StorefrontShareButton
 *   businessId={business.id}
 *   businessName={business.name}
 *   businessDescription={business.description}
 * />
 * ```
 */
export function StorefrontShareButton({
  businessId,
  businessName,
  businessDescription,
  storefrontUrl,
  variant = 'outline',
  size = 'default',
  className,
  showLabel = true,
  showIcon = true,
  label = 'Share',
  onShareSuccess
}: StorefrontShareButtonProps) {
  const { share, isSharing, isSupported } = useWebShare({
    entityType: 'storefront',
    entityId: businessId,
    metadata: {
      business_name: businessName
    },
    onSuccess: onShareSuccess
  });

  const handleShare = async () => {
    const url = storefrontUrl || window.location.href;

    await share({
      title: businessName,
      text: businessDescription || `Check out ${businessName} on SynC!`,
      url
    });
  };

  return (
    <Button
      onClick={handleShare}
      disabled={isSharing}
      variant={variant}
      size={size}
      className={cn(showIcon && showLabel ? 'gap-2' : '', className)}
      aria-label={`Share ${businessName}`}
    >
      {showIcon && <Share2 className="h-4 w-4" />}
      {showLabel && (
        <span>
          {isSharing ? 'Sharing...' : label}
        </span>
      )}
    </Button>
  );
}
