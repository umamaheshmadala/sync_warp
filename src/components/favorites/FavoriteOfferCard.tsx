// FavoriteOfferCard.tsx
// Card component for displaying favorited offers
// Used in FavoritesPage Offers tab

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Tag, TrendingUp, Trash2, ExternalLink } from 'lucide-react';
import { FavoriteOffer } from '../../services/favoritesService';
import { useBusinessUrl } from '../../hooks/useBusinessUrl';
import { FavoriteOfferButton } from './FavoriteOfferButton';
import { OfferShareButton } from '../Sharing/OfferShareButton';

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

    const isExpired = new Date(offer.valid_until) < new Date();

    const handleCardClick = () => {
        // Navigate to business storefront with offer modal
        navigate(`${getBusinessUrl(offer.business_id, offer.business_name)}?offer=${offer.id}`);
    };

    const handleRemove = (e: React.MouseEvent) => {
        e.stopPropagation();
        onRemove(offer.id);
    };

    return (
        <div
            onClick={handleCardClick}
            className={`relative border rounded-xl p-4 hover:shadow-md transition-all cursor-pointer group ${isExpired
                ? 'border-gray-200 bg-gray-50 opacity-75'
                : 'border-gray-200 hover:border-indigo-300 bg-white'
                }`}
        >
            <div className="absolute top-2 right-2 flex gap-1 z-10">
                <FavoriteOfferButton offerId={offer.id} className="h-8 w-8 bg-white/50 hover:bg-white [&_span]:hidden px-0" />
                <OfferShareButton
                    offerId={offer.id}
                    offerTitle={offer.title}
                    offerDescription={offer.description}
                    validUntil={offer.valid_until}
                    offerImage={offer.icon_image_url}
                    businessId={offer.business_id}
                    businessName={offer.business_name}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 bg-white/50 hover:bg-white rounded-full"
                />
            </div>

            <div className="flex items-start gap-4">
                {/* Icon/Image */}
                <div className="flex-shrink-0">
                    {offer.icon_image_url ? (
                        <img
                            src={offer.icon_image_url}
                            alt={offer.title}
                            className="w-16 h-16 rounded-lg object-cover"
                        />
                    ) : (
                        <div
                            className={`w-16 h-16 rounded-lg flex items-center justify-center border ${isExpired
                                ? 'bg-gray-100 border-gray-200'
                                : 'bg-indigo-50 border-indigo-100'
                                }`}
                        >
                            <Tag className={`w-8 h-8 ${isExpired ? 'text-gray-400' : 'text-indigo-600'}`} />
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="pr-16"> {/* Padding for absolute buttons */}
                            <h4
                                className={`font-semibold text-lg leading-tight line-clamp-1 ${isExpired ? 'text-gray-500' : 'text-gray-900 group-hover:text-indigo-600'
                                    }`}
                            >
                                {offer.title}
                            </h4>
                            <p className="text-sm text-gray-600 mt-1 line-clamp-1">{offer.business_name}</p>
                        </div>
                    </div>

                    {/* Description */}
                    {offer.description && (
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">{offer.description}</p>
                    )}

                    {/* Metadata */}
                    <div className="flex items-center flex-wrap gap-4 text-xs text-gray-500">
                        <span className="flex items-center">
                            <Calendar className="w-3.5 h-3.5 mr-1.5" />
                            {isExpired
                                ? 'Expired'
                                : `Valid until ${new Date(offer.valid_until).toLocaleDateString()}`}
                        </span>

                        <span className="flex items-center">
                            <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
                            {offer.view_count} views
                        </span>
                    </div>

                    {/* Status Badge */}
                    <div className="mt-2 text-right">
                        {/* Original remove button was redundant or misplaced, kept in header usually but here we have absolute buttons now */}
                    </div>
                </div>
            </div>
        </div>
    );
};

