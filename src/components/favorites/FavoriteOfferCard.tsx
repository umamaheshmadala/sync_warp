// FavoriteOfferCard.tsx
// Card component for displaying favorited offers
// Used in FavoritesPage Offers tab

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FavoriteOffer } from '../../services/favoritesService';
import { useBusinessUrl } from '../../hooks/useBusinessUrl';
import { TicketOfferCard } from '../offers/TicketOfferCard';
import { getOfferColor } from '../../utils/offerColors';
import { format } from 'date-fns';
// Note: FavoriteOffer type might not have nested offer_type object fully populated like Offer type
// We need to check if FavoriteOffer includes the category name or if we need to fetch it/fallback.
// Assuming for now it has similar structure or we use fallback color.

interface FavoriteOfferCardProps {
    offer: FavoriteOffer;
    onRemove: (offerId: string) => void;
}

export const FavoriteOfferCard: React.FC<FavoriteOfferCardProps> = ({
    offer,
    onRemove
}) => {
    const navigate = useNavigate();
    const { getBusinessUrl } = useBusinessUrl();

    const handleCardClick = () => {
        // Navigate to business storefront with offer modal
        navigate(`${getBusinessUrl(offer.business_id, offer.business_name)}?offer=${offer.id}`);
    };

    // FavoriteOffer interface might be different. Let's assume it mimics Offer or has flattened props.
    // If category is missing, it will default to Gray.
    // We can try to extract category name if available in the join.
    const categoryName = (offer as any).offer_type?.category?.name || (offer as any).category_name;
    const ticketColor = getOfferColor(categoryName);
    const formattedExpiry = format(new Date(offer.valid_until), 'MMM d, yyyy');

    return (
        <div onClick={handleCardClick} className="cursor-pointer relative group">
            <TicketOfferCard
                businessName={offer.business_name || 'Sync Business'}
                offerName={offer.title}
                offerType={(offer as any).offer_type?.offer_name || 'Special Offer'}
                offerCode={offer.offer_code || 'CODE123'}
                validUntil={formattedExpiry}
                color={ticketColor}
                className="w-full"
            />

            {/* Overlay Remove Button for Favorites context */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onRemove(offer.id);
                }}
                className="absolute top-2 right-2 bg-white/80 hover:bg-white text-red-500 p-1.5 rounded-full shadow-sm z-30 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remove from favorites"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
            </button>
        </div>
    );
};
