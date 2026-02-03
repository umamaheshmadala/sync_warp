import React, { useState } from 'react';
import { Product } from '../../../types/product';
import { Tag } from 'lucide-react';

interface MobileProductDetailsProps {
    product: Product;
}

export const MobileProductDetails: React.FC<MobileProductDetailsProps> = ({ product }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    // Status visual mapping (simplified for now)
    const isSoldOut = product.status === 'sold_out';

    const tags = product.tags || [];
    if (isSoldOut && !tags.includes('Sold Out')) tags.unshift('Sold Out');

    const renderTag = (tag: string, index: number) => {
        let bgClass = 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';

        switch (tag.toLowerCase()) {
            case 'featured':
                bgClass = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200';
                break;
            case 'new arrival':
                bgClass = 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200';
                break;
            case 'sold out':
                bgClass = 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200';
                break;
            case 'sale':
                bgClass = 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200';
                break;
        }

        return (
            <span
                key={index}
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${bgClass}`}
            >
                {tag}
            </span>
        );
    };

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
            {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {tags.map((tag, i) => renderTag(tag, i))}
                </div>
            )}

            {/* Description */}
            {product.description && (
                <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    <p className={!isExpanded ? 'line-clamp-3' : ''}>
                        {product.description}
                    </p>
                    {product.description.length > 120 && (
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="text-gray-500 dark:text-gray-400 font-medium mt-1 text-xs"
                        >
                            {isExpanded ? 'Show less' : 'Read more'}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};
