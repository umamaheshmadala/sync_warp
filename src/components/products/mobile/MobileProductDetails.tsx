import React from 'react';
import { Product } from '../../../types/product';
import { ProductDescription } from '../details/ProductDescription';
import { useProductTags } from '../../../hooks/useProductTags';

interface MobileProductDetailsProps {
    product: Product;
}

export const MobileProductDetails: React.FC<MobileProductDetailsProps> = ({ product }) => {
    // Use the hook to get distinct, configured tags (includes New Arrival logic, formatting)
    const { tags } = useProductTags(product);

    // Status visual mapping
    const isSoldOut = product.status === 'sold_out';

    return (
        <div className="px-4 pb-4 space-y-3">
            {/* Title Row */}
            <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-snug">
                    {product.name}
                </h2>
                {/* Price could be hidden per requirements, or shown if specified */}
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
                {isSoldOut && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200">
                        Sold Out
                    </span>
                )}
                {tags.map((tagItem, i) => (
                    <span
                        key={i}
                        className="px-2.5 py-0.5 rounded-full text-xs font-medium"
                        style={{
                            backgroundColor: tagItem.config.bgColor,
                            color: tagItem.config.color || tagItem.config.textColor || '#000' // Fallback
                        }}
                    >
                        {tagItem.config.label}
                    </span>
                ))}
            </div>

            {/* Description */}
            <ProductDescription
                text={product.description}
                maxLength={100}
                className="leading-relaxed"
            />
        </div>
    );
};
