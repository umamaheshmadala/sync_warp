import React, { useEffect, useState } from 'react';
import { useProducts } from '../../../hooks/useProducts';
import { ProductGrid } from './ProductGrid';
import { GridProduct } from './ProductCard';
import { useNavigate } from 'react-router-dom';
import {
    MobileProductModal,
    MobileProductHeader,
    MobileProductCarousel,
    MobileProductActions,
    MobileProductDetails,
    MobileProductComments
} from '../mobile';
import { Product } from '../../../types/product';

interface BusinessProductsTabProps {
    businessId: string;
    isOwner: boolean;
}

export const BusinessProductsTab: React.FC<BusinessProductsTabProps> = ({ businessId, isOwner }) => {
    const { products, loading, fetchProducts, deleteProduct, updateProduct } = useProducts(businessId);
    const navigate = useNavigate();
    const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

    useEffect(() => {
        fetchProducts(businessId, { featured: true });
    }, [businessId]);

    // Map domain Product to GridProduct
    const gridProducts: GridProduct[] = (products || []).map(p => ({
        id: p.id,
        name: p.name,
        images: p.images || (p.image_url ? [p.image_url] : []), // Handle legacy image_url if present
        tags: p.tags,
        status: p.status || (p.is_available === false ? 'sold_out' : 'published') // Map legacy availability
    }));

    const handleProductClick = (product: GridProduct) => {
        setSelectedProductId(product.id);
    };

    const handleAddProduct = () => {
        navigate('/business/products/create');
    };

    // Find full product data for modal
    const selectedProduct = products.find(p => p.id === selectedProductId);

    // Handlers for modal actions
    const handleCloseModal = () => setSelectedProductId(null);

    const handleEditProduct = () => {
        if (!selectedProductId) return;
        navigate(`/business/products/edit/${selectedProductId}`);
    };

    const handleDeleteProduct = async () => {
        if (!selectedProductId) return;
        if (window.confirm('Are you sure you want to delete this product?')) {
            await deleteProduct(selectedProductId);
            handleCloseModal();
        }
    };

    const handleArchiveProduct = async () => {
        if (!selectedProduct) return;
        const newStatus = selectedProduct.status === 'archived' ? 'published' : 'archived';
        await updateProduct(selectedProduct.id, { status: newStatus });
        // updateProduct typically refreshes list
    };

    return (
        <>
            <ProductGrid
                products={gridProducts}
                isLoading={loading}
                isOwner={isOwner}
                onProductClick={handleProductClick}
                onAddProduct={handleAddProduct}
            />

            {/* Mobile Product Modal */}
            <MobileProductModal
                isOpen={!!selectedProductId}
                onClose={handleCloseModal}
            >
                {selectedProduct && (
                    <>
                        <MobileProductHeader
                            product={selectedProduct}
                            onClose={handleCloseModal}
                            onEdit={isOwner ? handleEditProduct : undefined}
                            onDelete={isOwner ? handleDeleteProduct : undefined}
                            onArchive={isOwner ? handleArchiveProduct : undefined}
                        />
                        <MobileProductCarousel
                            images={selectedProduct.images || []}
                            productName={selectedProduct.name}
                        />
                        <MobileProductActions
                            likeCount={selectedProduct.like_count || 0}
                            commentCount={selectedProduct.comment_count || 0}
                            // Handlers to be implemented in future stories
                            onLike={() => console.log('Like clicked')}
                            onComment={() => console.log('Comment clicked')}
                            onShare={() => console.log('Share clicked')}
                            onFavorite={() => console.log('Favorite clicked')}
                        />
                        <MobileProductDetails product={selectedProduct} />
                        <MobileProductComments
                            totalCount={selectedProduct.comment_count || 0}
                            onViewAll={() => console.log('View all comments')}
                            onAddComment={(text) => console.log('Add comment:', text)}
                        />
                    </>
                )}
            </MobileProductModal>
        </>
    );
};

