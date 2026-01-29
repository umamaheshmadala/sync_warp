import React from 'react';
import { format } from 'date-fns';
import type { Offer } from '../../types/offers';
import { TicketOfferCard } from './TicketOfferCard';
import { getOfferColor } from '../../utils/offerColors';
import { OfferStatusBadge } from './OfferStatusBadge';
import { OfferActionsMenu, OfferActionType } from './OfferActionsMenu';

interface OfferCardProps {
  offer: Offer;
  // Unified Handler - Required for actions to work
  onAction?: (action: OfferActionType, offer: Offer) => void;
  // Card click behavior (navigation) - Distinct from "Actions Menu"
  onViewDetails?: (offer: Offer) => void;
  showActions?: boolean;
}

export function OfferCard({
  offer,
  onAction,
  onViewDetails,
  showActions = true,
}: OfferCardProps) {

  // Get Category Name for Color Mapping
  const categoryName = offer.offer_type?.category?.name;
  const ticketColor = getOfferColor(categoryName);

  // Format Expiry
  const formattedExpiry = offer.valid_until
    ? format(new Date(offer.valid_until), 'MMM d, yyyy')
    : 'No expiry';

  const isPaused = offer.status === 'paused';
  const isTerminated = offer.status === 'terminated';
  const isArchived = offer.status === 'archived';

  return (
    <div className={`relative group ${isPaused ? 'opacity-75' : ''}`}>
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
          auditCode={offer.audit_code}
          color={ticketColor}
          className="w-full"
        />

        {/* Status Badge Overlay (Top Left) */}
        <div className="absolute top-1.5 left-1.5 z-10 flex gap-2">
          <OfferStatusBadge status={offer.status} className="shadow-none border opacity-90 backdrop-blur-[1px]" />
          {offer.is_featured && (
            <div className="bg-yellow-100 text-yellow-600 p-1 rounded-full shadow-sm flex items-center justify-center" title="Featured Offer">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-star w-4 h-4"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
            </div>
          )}
        </div>

        {/* Actions Menu Overlay (Top Right) */}
        {showActions && (
          <div className="absolute top-2 right-2 z-10" onClick={(e) => e.stopPropagation()}>
            <OfferActionsMenu
              offer={offer}
              onAction={onAction}
              className="bg-white rounded-full shadow-sm"
            />
          </div>
        )}
      </div>

      {/* Visual indicator for Terminated/Archived */}
      {(isTerminated || isArchived) && (
        <div className="absolute inset-0 bg-gray-100 bg-opacity-30 pointer-events-none rounded-xl" />
      )}
    </div>
  );
}

export default OfferCard;
