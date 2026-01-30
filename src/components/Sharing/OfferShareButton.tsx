import { useMemo, useState } from 'react';
import { Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ShareModal } from './ShareModal';
import { cn } from '@/lib/utils';

interface OfferShareButtonProps {
    offerId: string;
    offerTitle: string;
    offerDescription?: string;
    discountValue?: number;
    discountType?: 'percentage' | 'fixed' | 'bogo';
    validUntil: string;
    offerImage?: string;
    businessId: string;
    businessName: string;
    businessSlug?: string;
    variant?: 'default' | 'icon' | 'button' | 'dropdown' | 'outline' | 'ghost';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    className?: string;
    showLabel?: boolean;
    label?: string;
    onShareSuccess?: () => void;
}

export function OfferShareButton({
    offerId,
    offerTitle,
    offerDescription,
    discountValue,
    discountType,
    validUntil,
    offerImage,
    businessId,
    businessName,
    businessSlug,
    variant = 'icon',
    size = 'icon',
    className,
    showLabel = false,
    label = 'Share',
    onShareSuccess,
}: OfferShareButtonProps) {
    const [showModal, setShowModal] = useState(false);

    const daysRemaining = useMemo(() => {
        const now = new Date();
        const expiry = new Date(validUntil);
        const diffTime = expiry.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return Math.max(0, diffDays);
    }, [validUntil]);

    const discountText = useMemo(() => {
        if (!discountValue && discountType !== 'bogo') return '';
        if (discountType === 'percentage') return `${discountValue}% off`;
        if (discountType === 'fixed') return `$${discountValue} off`;
        if (discountType === 'bogo') return 'Buy One Get One';
        return `${discountValue}% off`; // Default fallback
    }, [discountValue, discountType]);

    const handleShare = async (e: React.MouseEvent) => {
        e.stopPropagation();

        // Always use modal for offers to show rich preview unless specifically requested otherwise
        // But for consistency with ProductShareButton, we'll default to modal
        setShowModal(true);
    };

    const isExpired = new Date(validUntil) < new Date() && daysRemaining < 0;

    if (isExpired) {
        return (
            <Button
                variant="ghost"
                size={size}
                className={cn('opacity-50 cursor-not-allowed', className)}
                disabled
                title="This offer has expired"
            >
                <Share2 className={cn('h-4 w-4', showLabel && 'mr-2')} />
                {showLabel && label}
            </Button>
        );
    }

    return (
        <>
            <Button
                variant={variant === 'icon' ? 'ghost' : variant as any}
                size={size}
                className={cn(variant === 'icon' ? 'rounded-full' : '', className)}
                onClick={handleShare}
                title="Share offer"
            >
                <Share2 className={cn('h-4 w-4', showLabel && 'mr-2')} />
                {showLabel && label}
            </Button>

            <ShareModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                entityType="offer"
                entityId={offerId}
                title={offerTitle}
                description={`${discountText ? discountText + ' ' : ''}at ${businessName} - ${daysRemaining === 0 ? 'Expires today!' : `Expires in ${daysRemaining} days`}`}
                imageUrl={offerImage}
                url={`/business/${businessSlug || businessId}/offers?offerId=${offerId}`}
                onShareSuccess={onShareSuccess}
            />
        </>
    );
}
