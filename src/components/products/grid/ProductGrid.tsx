import React from 'react';
import { Plus } from 'lucide-react';
import { ProductCard, GridProduct } from './ProductCard';
import { ProductEmptyState } from './ProductEmptyState';

interface ProductGridProps {
    products: GridProduct[];
    isLoading?: boolean;
    isOwner?: boolean;
    onAddProduct?: () => void;
    onEditProduct?: (productId: string) => void;
    showTopAddButton?: boolean;
    emptyStateTitle?: string;
    emptyStateDescription?: string;
    onProductClick?: (product: GridProduct) => void;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
    products,
    isLoading,
    isOwner,
    onProductClick,
    onAddProduct,
    onEditProduct,
    showTopAddButton = true,
    emptyStateTitle,
    emptyStateDescription
}) => {
    if (isLoading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 p-4">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                        <div className="aspect-[4/5] bg-gray-200 rounded-lg mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    </div>
                ))}
            </div>
        );
    }

    if (!products || products.length === 0) {
        return (
            <ProductEmptyState
                isOwner={isOwner}
                onAddProduct={onAddProduct}
                title={emptyStateTitle}
                description={emptyStateDescription}
            />
        );
    }

    return (
        <div className="space-y-4">
            {isOwner && onAddProduct && showTopAddButton && (
                <div className="flex justify-end px-4 pt-2">
                    <button
                        onClick={onAddProduct}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Add Product
                    </button>
                </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 px-4 pb-4">
                {products.map((product) => (
                    <ProductCard
                        key={product.id}
                        product={product}
                        onClick={onProductClick}
                        isOwner={isOwner}
                        onEdit={() => onEditProduct && onEditProduct(product.id)}
                    />
                ))}
            </div>
        </div>
    );
};
