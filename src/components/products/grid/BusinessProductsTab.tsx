import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useProducts } from '../../../hooks/useProducts';
import { ProductGrid } from './ProductGrid';
import { GridProduct } from './ProductCard';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    MobileProductModal,
    MobileProductHeader,
    MobileProductCarousel,
    MobileProductActions,
    MobileProductDetails,
    MobileProductComments
} from '../mobile';
import { WebProductModal } from '../web/WebProductModal'; // Import Desktop Modal
import { useMediaQuery } from '../../../hooks/use-media-query';

import { Product } from '../../../types/product';
// import ProductForm from '../../business/ProductForm';
import { ProductNotificationToggle } from '../controls/ProductNotificationToggle';
import { useProductWizardStore } from '../../../stores/useProductWizardStore'; // Added import

interface BusinessProductsTabProps {
    businessId: string;
    isOwner: boolean;
}

export const BusinessProductsTab: React.FC<BusinessProductsTabProps> = ({ businessId, isOwner }) => {
    const { products, loading, fetchProducts, deleteProduct, updateProduct, refreshProducts } = useProducts(businessId);
    const navigate = useNavigate();
    const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
    const [isCreatingProduct, setIsCreatingProduct] = useState(false);
    const [searchParams, setSearchParams] = useSearchParams();
    const isDesktop = useMediaQuery('(min-width: 768px)');

    // Sync URL param to state (Deep linking)
    useEffect(() => {
        const productIdParam = searchParams.get('productId');
        if (productIdParam && productIdParam !== selectedProductId) {
            setSelectedProductId(productIdParam);
        }
    }, [searchParams]);

    useEffect(() => {
        fetchProducts(businessId, { featured: true });

        // Listen for new product creation from Wizard
        const handleProductCreated = (e: CustomEvent) => {
            if (e.detail?.businessId === businessId) {
                console.log('[BusinessProductsTab] Product created event received, refreshing...');
                refreshProducts();
            }
        };

        window.addEventListener('product-created', handleProductCreated as EventListener);
        return () => {
            window.removeEventListener('product-created', handleProductCreated as EventListener);
        };
    }, [businessId]);

    // Map domain Product to GridProduct
    const gridProducts: GridProduct[] = (products || []).map(p => ({
        id: p.id,
        name: p.name,
        images: p.images || (p.image_url ? [p.image_url] : []), // Handle legacy image_url if present
        tags: p.tags,
        status: p.status || (p.is_available === false ? 'sold_out' : 'published') // Map legacy availability
    }));

    const { openWizard } = useProductWizardStore(); // Added hook

    const handleProductClick = (product: GridProduct) => {
        setSelectedProductId(product.id);
    };

    const handleAddProduct = () => {
        console.log('[BusinessProductsTab] Clicking Add Product for business:', businessId);
        openWizard(businessId); // Use Wizard
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
                onEditProduct={(productId) => {
                    const productToEdit = products.find(p => p.id === productId);
                    if (productToEdit) {
                        openWizard(businessId, undefined, productToEdit);
                    }
                }}
            />

            {/* Mobile Product Modal (Visible on sm and below - hidden via CSS media/logic inside components or here) */}
            {/* Note: WebProductModal uses a portal, MobileProductModal uses a portal. 
                Ideally we check window width, but simpler to just render both and let CSS hide/show or use a hook.
                Since both use Portals and fixed positioning, we should render ONLY ONE based on logic to avoid conflicts.
             */}

            {/* Logic: Using simple CSS hidden utility on specific modal wrapper might be tricky with Portals.
                Let's use a small helper or just window matchMedia in this component to decide?
                Or sticking to the plan: Render based on a simple hook.
             */}

            {/* For now, just render MobileProductModal. We will add the Desktop one below conditionally 
                or replace it entirely. A custom useMediaQuery hook is best here.
            */}

            {/* TEMPORARY: Render MobileModal ALWAYS (as it was) + WebModal (Hidden on Mobile via internal check? No, passed prop?) 
               Let's implement a simple useMediaQuery right here or imported.
            */}

            {/* Mobile Product Modal - Render ONLY on Mobile */}
            {!isDesktop && (
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
                                product={selectedProduct}
                                // Handlers to be implemented in future stories
                                onComment={() => {
                                    document.getElementById('comment-input')?.focus(); // Focus input
                                }}
                            />
                            <MobileProductDetails product={selectedProduct} />
                            <MobileProductComments
                                productId={selectedProduct.id}
                                initialCount={selectedProduct.comment_count || 0}
                                isOwner={isOwner}
                            />
                            {isOwner && (
                                <div className="px-4 pb-4">
                                    <ProductNotificationToggle
                                        productId={selectedProduct.id}
                                        isEnabled={selectedProduct.notifications_enabled ?? true}
                                        isOwner={isOwner}
                                    />
                                </div>
                            )}
                        </>
                    )}
                </MobileProductModal>
            )}

            {/* Product Creation Modal (Simplified Overlay for now) */}
            {/* Product Creation Modal (Simplified Overlay for now) - REMOVED FOR WIZARD */}
            {/* {isCreatingProduct && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-xl">
                        <ProductForm
                            businessId={businessId}
                            onClose={() => setIsCreatingProduct(false)}
                            onSuccess={() => {
                                setIsCreatingProduct(false);
                                fetchProducts(businessId); // Refresh list
                            }}
                        />
                    </div>
                </div>
            )} */}

            {/* Desktop Modal - Render ONLY on Desktop */}
            {isDesktop && (
                <>
                    {selectedProduct && (
                        <WebProductModal
                            isOpen={!!selectedProductId}
                            onClose={handleCloseModal}
                            product={selectedProduct}
                            isOwner={isOwner}
                        />
                    )}
                </>
            )}
        </>
    );
};

