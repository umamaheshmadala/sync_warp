import React from 'react';
import { ProductCardImage } from './ProductCardImage';
import { ProductCardName } from './ProductCardName';
import { Edit3, X } from 'lucide-react';

// Temporary interface until we unified shared types
// This should match the query fields selected in productService
export interface GridProduct {
    id: string;
    name: string;
    images?: any[]; // Allow flexibility for now
    tags?: string[];
    status?: string;
    // Add other fields as needed
}

interface ProductCardProps {
    product: GridProduct;
    isOwner?: boolean;
    onClick?: (product: GridProduct) => void;
    onEdit?: () => void;
    onDelete?: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onClick, isOwner, onEdit, onDelete }) => {
    // Extract first image
    const firstImage = Array.isArray(product.images) && product.images.length > 0
        ? typeof product.images[0] === 'string' ? product.images[0] : product.images[0].url
        : null;

    // Check status
    const isSoldOut = product.status === 'sold_out' || product.tags?.includes('sold_out');

    // Handle click
    const handleClick = () => {
        if (onClick) onClick(product);
    };

    return (
        <div
            className="group cursor-pointer flex flex-col w-full relative" // Added relative for absolute positioning of edit button
            onClick={handleClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleClick();
                }
            }}
        >
            <div className="relative"> {/* Wrapper for Image + Edit Button */}
                <ProductCardImage
                    src={firstImage || '/placeholder-product.png'}
                    alt={product.name}
                    isSoldOut={!!isSoldOut}
                />

                {/* Edit Button - Visible ONLY to Owner */}
                {/* Actions - Visible ONLY to Owner */}
                {isOwner && (
                    <div className="absolute top-2 right-2 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        {onEdit && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit();
                                }}
                                className="bg-white hover:bg-gray-100 text-gray-700 p-2 rounded-full shadow-md transition-colors"
                                title="Edit Product"
                            >
                                <Edit3 className="w-4 h-4" />
                            </button>
                        )}
                        {onDelete && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete();
                                }}
                                className="bg-white hover:bg-red-50 text-red-600 p-2 rounded-full shadow-md transition-colors"
                                title="Delete Draft"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                )}
            </div>

            <ProductCardName name={product.name} />
        </div>
    );
};
