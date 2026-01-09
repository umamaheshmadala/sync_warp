// FavoriteProductCard.tsx
// Card component for displaying favorited products
// Used in FavoritesPage Products tab

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, DollarSign, ImageIcon, Star } from 'lucide-react';
import { FavoriteProduct } from '../../services/favoritesService';
import { useBusinessUrl } from '../../hooks/useBusinessUrl';
import { getOptimizedImageUrl } from '../../utils/imageUtils';

interface FavoriteProductCardProps {
    product: FavoriteProduct;
    onRemove: (productId: string) => void;
}

export const FavoriteProductCard: React.FC<FavoriteProductCardProps> = ({
    product,
    onRemove
}) => {
    const navigate = useNavigate();
    const { getBusinessUrl } = useBusinessUrl();
    const [imageError, setImageError] = useState(false);

    const handleCardClick = () => {
        // Navigate to product detail page
        navigate(`${getBusinessUrl(product.business_id, product.business_name)}/product/${product.id}`);
    };

    const handleRemove = (e: React.MouseEvent) => {
        e.stopPropagation();
        onRemove(product.id);
    };

    // Get currency symbol
    const getCurrencySymbol = (currency: string) => {
        const symbols: { [key: string]: string } = {
            INR: '₹',
            USD: '$',
            EUR: '€'
        };
        return symbols[currency] || currency;
    };

    // Format price
    const formatPrice = (price: number, currency: string) => {
        return `${getCurrencySymbol(currency)}${price.toLocaleString()}`;
    };

    // Get the first image
    const getImageUrl = () => {
        if (product.image_urls && product.image_urls.length > 0) {
            return getOptimizedImageUrl(product.image_urls[0], 300);
        }
        return undefined;
    };

    return (
        <div
            onClick={handleCardClick}
            className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-all cursor-pointer group"
        >
            {/* Product Image - Portrait 9:16 */}
            <div className="relative overflow-hidden bg-gray-100 aspect-[9/16]">
                {getImageUrl() && !imageError ? (
                    <img
                        src={getImageUrl()}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        onError={() => setImageError(true)}
                        loading="lazy"
                    />
                ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                        <ImageIcon className="w-12 h-12 text-gray-400" />
                    </div>
                )}

                {/* Featured Star - Top Left */}
                {product.is_featured && (
                    <div className="absolute top-2 left-2">
                        <Star className="w-5 h-5 text-yellow-400 fill-yellow-400 drop-shadow-lg" />
                    </div>
                )}

                {/* Remove button - Top Right */}
                <button
                    onClick={handleRemove}
                    className="absolute top-2 right-2 p-2 bg-white/90 hover:bg-white rounded-full shadow-md transition-colors"
                    aria-label="Remove from favorites"
                >
                    <Trash2 className="w-4 h-4 text-gray-600 hover:text-red-600" />
                </button>

                {/* Availability Badge - Bottom */}
                <div className="absolute bottom-2 left-2">
                    <span
                        className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${product.is_available
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                    >
                        {product.is_available ? 'Available' : 'Unavailable'}
                    </span>
                </div>
            </div>

            {/* Product Info */}
            <div className="p-3">
                <h4 className="font-semibold text-gray-900 line-clamp-2 mb-1 group-hover:text-indigo-600 transition-colors">
                    {product.name}
                </h4>

                <p className="text-sm text-gray-600 mb-2">{product.business_name}</p>

                {product.description && (
                    <p className="text-xs text-gray-500 line-clamp-2 mb-2">{product.description}</p>
                )}

                <div className="flex items-center justify-between mt-2">
                    <span className="flex items-center text-lg font-bold text-gray-900">
                        <DollarSign className="w-4 h-4 mr-0.5" />
                        {formatPrice(product.price, product.currency)}
                    </span>
                </div>
            </div>
        </div>
    );
};
