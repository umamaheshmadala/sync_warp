// CompactOfferCard.tsx
// Compact 3-line offer card for storefront overview display

import React from 'react';
import { format } from 'date-fns';
import type { Offer } from '../../types/offers';
import { TicketOfferCard } from './TicketOfferCard';
import { getOfferColor } from '../../utils/offerColors';

interface CompactOfferCardProps {
  offer: Offer;
  onShare?: (offer: Offer) => void;
  onClick?: (offer: Offer) => void;
  highlighted?: boolean;
}

export const CompactOfferCard: React.FC<CompactOfferCardProps> = ({
  offer,
  onClick,
  highlighted = false,
}) => {

  // Get Category Name for Color Mapping
  const categoryName = offer.offer_type?.category?.name;
  const ticketColor = getOfferColor(categoryName);
  const formattedExpiry = format(new Date(offer.valid_until), 'MMM d, yyyy');

  return (
    <div
      onClick={() => onClick?.(offer)}
      className={`
        transition-all duration-200 cursor-pointer transform hover:scale-[1.02]
        ${highlighted ? 'ring-2 ring-indigo-500 rounded-xl' : ''}
      `}
    >
      <TicketOfferCard
        businessName={offer.business?.business_name || 'Sync Business'}
        offerName={offer.title}
        offerType={offer.offer_type?.offer_name || 'Special Offer'}
        offerCode={offer.offer_code || 'CODE123'}
        validUntil={formattedExpiry}
        color={ticketColor}
        className="w-full text-xs" // Added text-xs to scale down font sizes slightly if needed, though TicketCard is responsive
      />
    </div>
  );
};

export default CompactOfferCard;
