import React, { useState, useEffect } from 'react';
import {
  Star,
  Package,
  Eye,
  ImageIcon,
  ExternalLink,
  Plus
} from 'lucide-react';
import { Product, CURRENCIES } from '../../types/product';
import { useProducts } from '../../hooks/useProducts';
import { WebProductModal } from '../products/web/WebProductModal';
import {
  MobileProductModal,
  MobileProductHeader,
  MobileProductCarousel,
  MobileProductActions,
  MobileProductDetails,
  MobileProductComments,
  StickyCommentInput
} from '../products/mobile';
import { useMediaQuery } from '../../hooks/use-media-query';
// ProductForm removed — editing now goes through the 3-step ProductCreationWizard
import { useProductWizardStore } from '../../stores/useProductWizardStore';
import { useNavigate } from 'react-router-dom';
import { ProductCard as CustomerProductCard } from '../products/ProductCard';
import BusinessProductCard from './ProductCard';
import { LazyRender } from '../common/LazyRender';
import { useBusinessUrl } from '../../hooks/useBusinessUrl';

interface FeaturedProductsProps {
  businessId: string;
  businessName: string;
  isOwner: boolean;
  viewMode?: 'widget' | 'full';
  showAddButton?: boolean;
}

const FeaturedProducts: React.FC<FeaturedProductsProps> = ({
  businessId,
  businessName,
  isOwner,
  viewMode = 'widget',
  showAddButton
}) => {
  const navigate = useNavigate();
  const { getBusinessUrl } = useBusinessUrl();
  const { products, loading, fetchProducts, refreshProducts, deleteProduct, archiveProduct, unarchiveProduct } = useProducts(businessId);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const { openWizard } = useProductWizardStore();
  const isDesktop = useMediaQuery('(min-width: 768px)');

  // Determine if add button should be shown
  const shouldShowAddButton = isOwner && (showAddButton ?? viewMode === 'full');

  useEffect(() => {
    if (products.length > 0) {
      if (viewMode === 'full') {
        // Products tab: show ALL products, featured first
        const featured = products.filter(p => p.tags?.includes('featured') && p.status === 'published');
        const nonFeatured = products.filter(p => !p.tags?.includes('featured') && p.status === 'published');
        setFeaturedProducts([...featured, ...nonFeatured]);
      } else {
        // Overview tab: show only first 6 featured (updated from 4)
        const featured = products.filter(p => p.tags?.includes('featured') && p.status === 'published').slice(0, 6);
        setFeaturedProducts(featured);
      }
    }
  }, [products, viewMode]);

  // Get currency symbol
  const getCurrencySymbol = (currency: string) => {
    const currencyInfo = CURRENCIES.find(c => c.value === currency);
    return currencyInfo?.symbol || currency;
  };

  // Format price display
  const formatPrice = (price?: number, currency = 'INR') => {
    if (!price || price === 0) return 'Price not set';

    const symbol = getCurrencySymbol(currency);
    return `${symbol}${price.toLocaleString()}`;
  };

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
  };



  const handleManageProducts = () => {
    navigate(`/business/${businessId}/manage/products`);
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(null); // Close product view modal
    openWizard(businessId, undefined, product); // Open the 3-step wizard
  };

  const handleCloseModal = () => setSelectedProduct(null);

  if (loading && featuredProducts.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Featured Products</h3>
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-32 bg-gray-200 rounded-lg"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {shouldShowAddButton && (
        <div className="flex justify-end mb-4 px-[5px]">
          <button
            onClick={() => useProductWizardStore.getState().openWizard(businessId)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Products
          </button>
        </div>
      )}

      <div className="relative p-[5px]">



        {featuredProducts.length > 0 ? (
          <div className={`grid gap-1.5 ${viewMode === 'full' ? 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-6' : 'grid-cols-3'}`}>
            {featuredProducts.map((product) => (
              <div key={product.id}>
                <LazyRender
                  placeholder={<div className="h-56 bg-gray-100 rounded-lg" />}
                >
                  <CustomerProductCard
                    product={product}
                    size="medium"
                    showActions={viewMode === 'full'}
                    onClick={() => handleProductClick(product)}
                  />
                </LazyRender>
              </div>
            ))}
          </div>
        ) : (
          <div className="col-span-full py-12 text-center text-gray-500 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
            <Package className="h-12 w-12 mx-auto text-gray-400 mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No Featured Products</h3>
            <p className="text-sm">Highlight your best products here!</p>
          </div>
        )}
      </div>

      {/* Product View Modal - ALWAYS Use Mobile View (Standard for App) */}
      <MobileProductModal
        isOpen={!!selectedProduct}
        onClose={handleCloseModal}
        stickyFooter={selectedProduct ? <StickyCommentInput productId={selectedProduct.id} /> : undefined}
      >
        {selectedProduct && (
          <>
            <MobileProductHeader
              product={selectedProduct}
              onClose={handleCloseModal}
              onEdit={isOwner ? () => handleEditProduct(selectedProduct) : undefined}
              onDelete={isOwner ? async () => { await deleteProduct(selectedProduct.id); handleCloseModal(); } : undefined}
              onArchive={isOwner ? async () => { await archiveProduct(selectedProduct.id); handleCloseModal(); } : undefined}
            />
            <MobileProductCarousel
              images={selectedProduct.images || []}
              productName={selectedProduct.name}
            />
            <MobileProductActions
              product={selectedProduct}
              onComment={() => {
                document.getElementById('comment-input')?.focus();
              }}
            />
            <MobileProductDetails product={selectedProduct} />
            <MobileProductComments
              productId={selectedProduct.id}
              initialCount={selectedProduct.comment_count || 0}
              isOwner={isOwner}
              hideInput
            />
          </>
        )}
      </MobileProductModal>
    </>
  );
};

export default FeaturedProducts;
