// =====================================================
// Story 4.12: Business Offers Management
// Component: OfferCard - Display individual offer
// =====================================================

import React from 'react';
import { format } from 'date-fns';
import type { Offer } from '../../types/offers';
import { TicketOfferCard } from './TicketOfferCard';
import { getOfferColor } from '../../utils/offerColors';

interface OfferCardProps {
  offer: Offer;
  onShare?: (offer: Offer) => void;
  onEdit?: (offer: Offer) => void;
  onActivate?: (offer: Offer) => void;
  onPause?: (offer: Offer) => void;
  onArchive?: (offer: Offer) => void;
  onDelete?: (offer: Offer) => void;
  onViewAnalytics?: (offer: Offer) => void;
  onExtendExpiry?: (offer: Offer) => void;
  onDuplicate?: (offer: Offer) => void;
  onViewDetails?: (offer: Offer) => void;
  showActions?: boolean;
  showStats?: boolean;
}

export function OfferCard({
  offer,
  onViewDetails,
}: OfferCardProps) {

  // Get Category Name for Color Mapping
  const categoryName = offer.offer_type?.category?.name;
  const ticketColor = getOfferColor(categoryName);

  // Format Expiry
  const formattedExpiry = format(new Date(offer.valid_until), 'MMM d, yyyy');

  return (
    <div
      onClick={() => onViewDetails && onViewDetails(offer)}
      className="cursor-pointer"
    >
      <TicketOfferCard
        businessName={offer.business?.business_name || 'Sync Business'}
        offerName={offer.title}
        offerType={offer.offer_type?.offer_name || 'Special Offer'}
        offerCode={offer.offer_code || 'CODE123'}
        validUntil={formattedExpiry}
        color={ticketColor}
        className="w-full"
      />
    </div>
  );
}

export default OfferCard;
