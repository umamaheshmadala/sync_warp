// src/components/sharing/ShareButton.tsx
// Reusable share button component for coupon/deal cards
// Story 8.3.4 - Coupon/Deal Sharing Integration

import React, { useState } from 'react';
import { Share2, Check, Loader } from 'lucide-react';
import { shareTrackingService, type ShareableType } from '../../services/shareTrackingService';
import { toast } from 'react-hot-toast';

interface Props {
  shareableType: ShareableType;
  shareableId: string;
  shareableTitle: string;
  shareableDescription?: string;
  shareableImageUrl?: string;
  className?: string;
  variant?: 'default' | 'icon';
  onShareComplete?: () => void;
}

export function ShareButton({ 
  shareableType, 
  shareableId, 
  shareableTitle,
  shareableDescription,
  shareableImageUrl,
  className = '',
  variant = 'default',
  onShareComplete 
}: Props) {
  const [isSharing, setIsSharing] = useState(false);
  const [isShared, setIsShared] = useState(false);

  const handleShare = async () => {
    setIsSharing(true);

    try {
      const success = await shareTrackingService.shareViaShareSheet({
        type: shareableType,
        id: shareableId,
        title: shareableTitle,
        description: shareableDescription,
        imageUrl: shareableImageUrl
      });

      if (success) {
        setIsShared(true);
        toast.success(`${shareableType === 'coupon' ? 'Coupon' : 'Deal'} shared!`);
        onShareComplete?.();

        // Reset after 2 seconds
        setTimeout(() => setIsShared(false), 2000);
      }
    } catch (error) {
      console.error('Failed to share:', error);
      toast.error('Failed to share');
    } finally {
      setIsSharing(false);
    }
  };

  if (variant === 'icon') {
    return (
      <button
        onClick={handleShare}
        disabled={isSharing}
        className={`p-2 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        aria-label={`Share ${shareableTitle}`}
      >
        {isSharing ? (
          <Loader className="w-5 h-5 text-gray-600 animate-spin" />
        ) : isShared ? (
          <Check className="w-5 h-5 text-green-600" />
        ) : (
          <Share2 className="w-5 h-5 text-gray-600" />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleShare}
      disabled={isSharing}
      className={`flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      aria-label={`Share ${shareableTitle}`}
    >
      {isSharing ? (
        <>
          <Loader className="w-4 h-4 animate-spin" />
          <span className="text-sm font-medium">Sharing...</span>
        </>
      ) : isShared ? (
        <>
          <Check className="w-4 h-4" />
          <span className="text-sm font-medium">Shared!</span>
        </>
      ) : (
        <>
          <Share2 className="w-4 h-4" />
          <span className="text-sm font-medium">Share</span>
        </>
      )}
    </button>
  );
}

export default ShareButton;
