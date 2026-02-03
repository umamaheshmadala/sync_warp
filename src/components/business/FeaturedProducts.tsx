import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
import ProductView from './ProductView';
import ProductForm from './ProductForm';
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
  const { products, loading, fetchProducts, refreshProducts, deleteProduct } = useProducts(businessId);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Determine if add button should be shown
  const shouldShowAddButton = isOwner && (showAddButton ?? viewMode === 'full');

  useEffect(() => {
    if (products.length > 0) {
      if (viewMode === 'full') {
        // Products tab: show ALL products, featured first
        const featured = products.filter(p => p.is_featured && p.is_available);
        const nonFeatured = products.filter(p => !p.is_featured && p.is_available);
        setFeaturedProducts([...featured, ...nonFeatured]);
      } else {
        // Overview tab: show only first 4 featured
        const featured = products.filter(p => p.is_featured && p.is_available).slice(0, 4);
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
    setEditingProduct(product); // Open edit form modal
  };

  const handleEditFormClose = () => {
    setEditingProduct(null);
  };

  const handleEditFormSuccess = async () => {
    setEditingProduct(null);
    await refreshProducts(); // Refresh products to show updates
  };

  const handleAddFormSuccess = async () => {
    setIsAddModalOpen(false);
    await refreshProducts();
  };

  const handleDeleteConfirm = async () => {
    if (selectedProduct) {
      await deleteProduct(selectedProduct.id);
      setDeleteModalOpen(false);
      setSelectedProduct(null);
      await refreshProducts();
    }
  };

  if (loading && featuredProducts.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Featured Products</h3>
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
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
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Products
          </button>
        </div>
      )}

      <div className="relative p-[5px]">



        {featuredProducts.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-1.5">
            {featuredProducts.map((product) => (
              <div key={product.id}>
                <LazyRender
                  placeholder={<div className="h-56 bg-gray-100 rounded-lg" />}
                >
                  <CustomerProductCard
                    product={product}
                    size="medium"
                    showActions={true}
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

      {/* Product View Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <ProductView
            product={selectedProduct}
            isOwner={isOwner}
            isModal={true}
            onClose={() => setSelectedProduct(null)}
            onEdit={isOwner ? () => handleEditProduct(selectedProduct) : undefined}
          />
        )}
      </AnimatePresence>



      {/* Product Edit Form Modal */}
      <AnimatePresence>
        {editingProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={handleEditFormClose}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <ProductForm
                businessId={businessId}
                product={editingProduct}
                onClose={handleEditFormClose}
                onSuccess={handleEditFormSuccess}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteModalOpen && selectedProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]"
            onClick={() => setDeleteModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Product</h3>
              <p className="text-sm text-gray-500 mb-6">
                Are you sure you want to delete "{selectedProduct.name}"? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setDeleteModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Product Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setIsAddModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <ProductForm // Use existing ProductForm
                businessId={businessId}
                product={null} // null for new product
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={handleAddFormSuccess}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default FeaturedProducts;
