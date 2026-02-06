import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Menu } from '@headlessui/react';
import { ChevronDown, Plus } from 'lucide-react';
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
    const {
        products,
        loading,
        fetchProducts,
        deleteProduct,
        archiveProduct,
        unarchiveProduct,
        refreshProducts
    } = useProducts(businessId);
    const navigate = useNavigate();
    const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
    const [searchParams, setSearchParams] = useSearchParams();
    const isDesktop = useMediaQuery('(min-width: 768px)');

    // Tabs: 'active' | 'archived' | 'drafts'
    const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');

    // Sync URL param to state (Deep linking)
    useEffect(() => {
        const productIdParam = searchParams.get('productId');
        if (productIdParam && productIdParam !== selectedProductId) {
            setSelectedProductId(productIdParam);
        }
    }, [searchParams]);

    useEffect(() => {
        // Fetch products based on tab
        if (activeTab === 'active') {
            // By default fetchProducts handles filtering for published/sold_out inside
            fetchProducts(businessId);
        } else if (activeTab === 'archived') {
            fetchProducts(businessId, { status: 'archived' } as any);
        }

        // Listen for new product creation from Wizard
        const handleProductCreated = (e: CustomEvent) => {
            if (e.detail?.businessId === businessId) {
                refreshProducts();
            }
        };

        window.addEventListener('product-created', handleProductCreated as EventListener);
        return () => {
            window.removeEventListener('product-created', handleProductCreated as EventListener);
        };
    }, [businessId, activeTab]);

    // Map domain Product to GridProduct with Filter
    const gridProducts: GridProduct[] = (products || [])
        .filter(p => {
            // Client-side filtering to ensure instant UI updates when status changes
            const status = p.status || (p.is_available === false ? 'sold_out' : 'published');
            if (activeTab === 'active') {
                return status === 'published' || status === 'sold_out';
            }
            if (activeTab === 'archived') {
                return status === 'archived';
            }
            return true;
        })
        .map(p => ({
            id: p.id,
            name: p.name,
            images: p.images || (p.image_url ? [p.image_url] : []),
            tags: p.tags,
            status: p.status || (p.is_available === false ? 'sold_out' : 'published')
        }));

    const { openWizard } = useProductWizardStore();

    const handleProductClick = (product: GridProduct) => {
        setSelectedProductId(product.id);
    };

    const handleAddProduct = () => {
        openWizard(businessId);
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

        if (selectedProduct.status === 'archived') {
            await unarchiveProduct(selectedProduct.id);
        } else {
            await archiveProduct(selectedProduct.id);
        }

        handleCloseModal();
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header: Dropdown Filter + Add Product Button */}
            {isOwner ? (
                <div className="flex justify-between items-center px-4 mb-4 mt-2">
                    {/* View Filter Dropdown */}
                    <div className="relative">
                        <Menu as="div" className="relative inline-block text-left">
                            <Menu.Button className="inline-flex justify-center items-center w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors">
                                {activeTab === 'active' ? 'Products' : 'Archived'}
                                <ChevronDown className="w-4 h-4 ml-2 -mr-1" aria-hidden="true" />
                            </Menu.Button>

                            <Menu.Items className="absolute left-0 mt-2 w-40 origin-top-left bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-20 border border-gray-100 dark:border-gray-700">
                                <div className="px-1 py-1">
                                    <Menu.Item>
                                        {({ active }) => (
                                            <button
                                                onClick={() => setActiveTab('active')}
                                                className={`${active ? 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-200' : 'text-gray-900 dark:text-gray-100'
                                                    } group flex rounded-md items-center w-full px-2 py-2 text-sm`}
                                            >
                                                Products
                                            </button>
                                        )}
                                    </Menu.Item>
                                    <Menu.Item>
                                        {({ active }) => (
                                            <button
                                                onClick={() => setActiveTab('archived')}
                                                className={`${active ? 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-200' : 'text-gray-900 dark:text-gray-100'
                                                    } group flex rounded-md items-center w-full px-2 py-2 text-sm`}
                                            >
                                                Archived
                                            </button>
                                        )}
                                    </Menu.Item>
                                </div>
                            </Menu.Items>
                        </Menu>
                    </div>

                    {/* Add Product Button (Aligned on the same line) */}
                    {activeTab === 'active' && (
                        <button
                            onClick={handleAddProduct}
                            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            <span className="hidden sm:inline">Add Product</span>
                            <span className="sm:hidden">Add</span>
                        </button>
                    )}
                </div>
            ) : null}

            <ProductGrid
                products={gridProducts}
                isLoading={loading}
                isOwner={isOwner}
                onProductClick={handleProductClick}
                onAddProduct={activeTab === 'active' ? handleAddProduct : undefined}
                // Hide the internal add button since we render it in the header
                showTopAddButton={false}
                emptyStateTitle={activeTab === 'archived' ? 'No archived products' : undefined}
                emptyStateDescription={activeTab === 'archived' ? 'Archived products will appear here.' : undefined}
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
                            onArchive={archiveProduct}
                            onUnarchive={unarchiveProduct}
                            onDelete={deleteProduct}
                        />
                    )}
                </>
            )}
        </div>
    );
};

