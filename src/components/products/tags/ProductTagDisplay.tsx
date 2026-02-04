
import React from 'react';
import { useProductTags } from '../../../hooks/useProductTags';
import { Product } from '../../../types/product';
import { ProductTagPill } from './ProductTagPill';

interface ProductTagDisplayProps {
    product: Product;
    className?: string;
    size?: 'sm' | 'md';
    limit?: number;
}

export const ProductTagDisplay: React.FC<ProductTagDisplayProps> = ({ product, className, size = 'md', limit }) => {
    const { tags } = useProductTags(product);

    if (!tags || tags.length === 0) return null;

    const displayTags = limit ? tags.slice(0, limit) : tags;

    return (
        <div className={`flex flex-wrap gap-2 ${className || ''}`}>
            {displayTags.map((tag, index) => (
                <ProductTagPill
                    key={`${tag.type}-${index}`}
                    type={tag.type}
                    config={tag.config}
                    size={size}
                />
            ))}
        </div>
    );
};
