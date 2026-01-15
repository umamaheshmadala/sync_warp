// src/components/sharing/StorefrontShareButton.tsx
// Share button for business storefronts
// Story 4.9 - Social Sharing Actions
// Story 10.1.2 - Enhanced with ShareModal integration

import React, { useState } from 'react';
import { Share2 } from 'lucide-react';
import { useUnifiedShare } from '@/hooks/useUnifiedShare';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ShareModal } from './ShareModal';

export interface StorefrontShareButtonProps {
  /** Business ID */
  businessId: string;
  /** Business name for share text */
  businessName: string;
  /** Business description for share text */
  businessDescription?: string;
  /** Business logo/image URL */
  businessImageUrl?: string;
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
  /** Show modal with all share options (true) or quick share (false) */
  showModal?: boolean;
}

/**
 * Share button for business storefronts
 * 
 * @example
 * ```tsx
 * // Modal mode (default) - opens ShareModal with all options
 * <StorefrontShareButton
 *   businessId={business.id}
 *   businessName={business.name}
 *   businessDescription={business.description}
 *   showModal={true}
 * />
 * 
 * // Quick mode - triggers native share directly
 * <StorefrontShareButton
 *   businessId={business.id}
 *   businessName={business.name}
 *   showModal={false}
 * />
 * ```
 */
export function StorefrontShareButton({
  businessId,
  businessName,
  businessDescription,
  businessImageUrl,
  storefrontUrl,
  variant = 'outline',
  size = 'default',
  className,
  showLabel = true,
  showIcon = true,
  label = 'Share',
  onShareSuccess,
  showModal = true,
}: StorefrontShareButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { shareNative, isSharing } = useUnifiedShare();

  const url = storefrontUrl || window.location.href;

  const handleClick = async () => {
    if (showModal) {
      setIsModalOpen(true);
    } else {
      // Quick share mode - use native share directly
      try {
        const result = await shareNative({
          entityType: 'storefront',
          entityId: businessId,
          entityData: {
            title: businessName,
            description: businessDescription || `Check out ${businessName} on SynC!`,
            imageUrl: businessImageUrl,
            url,
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

  return (
    <>
      <Button
        onClick={handleClick}
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

      {/* Share Modal */}
      <ShareModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        entityType="storefront"
        entityId={businessId}
        title={businessName}
        description={businessDescription}
        imageUrl={businessImageUrl}
        url={url}
        onShareSuccess={handleShareSuccess}
      />
    </>
  );
}

