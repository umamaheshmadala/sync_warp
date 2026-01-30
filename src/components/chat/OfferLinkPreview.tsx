import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TicketOfferCard } from '../offers/TicketOfferCard';
import { getOfferColor } from '../../utils/offerColors';
import { format } from 'date-fns';
import type { LinkPreview } from '../../types/messaging';

interface OfferLinkPreviewProps {
    preview: LinkPreview;
}

export function OfferLinkPreview({ preview }: OfferLinkPreviewProps) {
    const navigate = useNavigate();
    const metadata = preview.metadata || {};

    // Navigate to offer details on click
    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        const url = new URL(preview.url);
        navigate(`${url.pathname}${url.hash}`);
    };

    // Extract data from metadata
    const businessName = metadata.businessName || 'Sync Business';
    const offerName = preview.title;
    const offerTypeName = metadata.offerTypeName || 'Special Offer';
    const offerCode = metadata.offerCode || 'CODE';
    const auditCode = metadata.auditCode;
    const categoryName = metadata.categoryName;

    // Format expiry if available
    const validUntil = metadata.validUntil
        ? format(new Date(metadata.validUntil), 'MMM d, yyyy')
        : 'No expiry';

    // Get color based on category
    const ticketColor = getOfferColor(categoryName);

    return (
        <div
            onClick={handleClick}
            className="cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98] w-full max-w-sm"
        >
            <TicketOfferCard
                businessName={businessName}
                offerName={offerName}
                offerType={offerTypeName}
                offerCode={offerCode}
                validUntil={validUntil}
                auditCode={auditCode}
                color={ticketColor}
                className="w-full shadow-sm"
            />

            {/* Helper text footer similar to user mockup */}
            <div className="mt-2 px-1">
                <p className="text-xs text-blue-100 hover:text-white underline truncate">
                    Check out {offerName}! {preview.url.replace(/^https?:\/\//, '')}
                </p>
            </div>
        </div>
    );
}
