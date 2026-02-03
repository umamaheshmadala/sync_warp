import React from 'react';
import { ProductCardImage } from './ProductCardImage';
import { ProductCardName } from './ProductCardName';

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
    onClick?: (product: GridProduct) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onClick }) => {
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
            className="group cursor-pointer flex flex-col w-full"
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
            <ProductCardImage
                src={firstImage || '/placeholder-product.png'} // Fallback ideally handled by Image component but good here too
                alt={product.name}
                isSoldOut={!!isSoldOut}
            />
            <ProductCardName name={product.name} />
        </div>
    );
};
