import React from 'react';
import { ShoppingBag, Plus } from 'lucide-react';

interface ProductEmptyStateProps {
    isOwner?: boolean;
    onAddProduct?: () => void;
}

export const ProductEmptyState: React.FC<ProductEmptyStateProps> = ({ isOwner, onAddProduct }) => {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <ShoppingBag className="w-8 h-8 text-gray-400" />
            </div>

            <h3 className="text-lg font-medium text-gray-900 mb-1">No products yet</h3>
            <p className="text-sm text-gray-500 max-w-xs mb-6">
                {isOwner
                    ? "Start building your catalog to showcase your items to customers."
                    : "This business hasn't added any products yet."}
            </p>

            {isOwner && onAddProduct && (
                <button
                    onClick={onAddProduct}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                >
                    <Plus className="w-4 h-4" />
                    Add Product
                </button>
            )}
        </div>
    );
};
