import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Star, 
  Package, 
  Eye, 
  DollarSign, 
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
import { useBusinessUrl } from '../../hooks/useBusinessUrl';

interface FeaturedProductsProps {
  businessId: string;
  businessName: string;
  isOwner: boolean;
}

const FeaturedProducts: React.FC<FeaturedProductsProps> = ({
  businessId,
  businessName,
  isOwner
}) => {
  const navigate = useNavigate();
  const { getBusinessUrl } = useBusinessUrl();
  const { products, loading, fetchProducts, refreshProducts } = useProducts(businessId);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  useEffect(() => {
    if (products.length > 0) {
      // Filter featured products (max 4)
      const featured = products.filter(p => p.is_featured && p.is_available).slice(0, 4);
      setFeaturedProducts(featured);
    }
  }, [products]);

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

  const handleViewAllProducts = () => {
    setShowAllProducts(true);
  };

  const handleManageProducts = () => {
    navigate(`${getBusinessUrl(businessId, businessName)}/products`);
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
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Star className="w-5 h-5 text-yellow-500 mr-2" />
            Featured Products
          </h3>
          
          <div className="flex items-center space-x-3">
            {products.length > 4 && (
              <button
                onClick={handleViewAllProducts}
                className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                View All ({products.length})
                <ExternalLink className="w-4 h-4 ml-1" />
              </button>
            )}
            
            {isOwner && (
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleManageProducts}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  <Package className="w-4 h-4 mr-2" />
                  Manage Products
                </button>
                
                <button
                  onClick={() => navigate(`${getBusinessUrl(businessId, businessName)}/coupons`)}
                  className="inline-flex items-center px-3 py-2 border border-purple-300 rounded-md text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                  Manage Coupons
                </button>
              </div>
            )}
          </div>
        </div>

        {featuredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product, index) => (
              <React.Fragment key={product.id}>
                {/* Use customer-facing ProductCard for non-owners (with social buttons) */}
                {!isOwner ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <CustomerProductCard
                      product={product}
                      size="medium"
                      showActions={true}
                      onClick={() => navigate(`${getBusinessUrl(businessId, businessName)}/product/${product.id}`)}
                    />
                  </motion.div>
                ) : (
                  /* Owner view - show admin preview (click to view/edit) */
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="group cursor-pointer"
                    onClick={() => handleProductClick(product)}
                  >
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow duration-200">
                      {/* Product Image */}
                      <div className="aspect-w-1 aspect-h-1 bg-gray-100 relative">
                        {product.image_urls && product.image_urls.length > 0 ? (
                          <img
                            src={product.image_urls[0]}
                            alt={product.name}
                            className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        ) : (
                          <div className="w-full h-32 bg-gray-100 flex items-center justify-center">
                            <ImageIcon className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                        
                        {/* Featured badge */}
                        <div className="absolute top-2 left-2">
                          <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            <Star className="w-3 h-3 mr-1 fill-current" />
                            Featured
                          </div>
                        </div>
                        
                        {/* Available badge */}
                        <div className="absolute top-2 right-2">
                          <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <Eye className="w-3 h-3 mr-1" />
                            Available
                          </div>
                        </div>
                      </div>

                      {/* Product Details */}
                      <div className="p-4">
                        <h4 className="font-medium text-gray-900 mb-1 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                          {product.name}
                        </h4>
                        
                        {product.category && (
                          <p className="text-xs text-gray-500 mb-2">
                            {product.category}
                          </p>
                        )}
                        
                        <div className="flex items-center justify-between">
                          {product.price && product.price > 0 ? (
                            <div className="flex items-center">
                              <span className="font-semibold text-gray-900">
                                {formatPrice(product.price, product.currency)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">Price not set</span>
                          )}
                          
                          {product.image_urls && product.image_urls.length > 0 && (
                            <span className="text-xs text-gray-400">
                              {product.image_urls.length} {product.image_urls.length === 1 ? 'image' : 'images'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </React.Fragment>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="mx-auto h-16 w-16 text-gray-400 mb-4">
              <Star className="w-full h-full" />
            </div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">No featured products</h3>
            <p className="text-sm text-gray-500 mb-4">
              {isOwner 
                ? 'Add products and mark them as featured to showcase them here.'
                : 'This business hasn\'t featured any products yet.'
              }
            </p>
            {isOwner && (
              <button
                onClick={handleManageProducts}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Products
              </button>
            )}
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

      {/* View All Products Modal */}
      <AnimatePresence>
        {showAllProducts && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowAllProducts(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">
                    All Products - {businessName}
                  </h2>
                  <button
                    onClick={() => setShowAllProducts(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="p-6 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.filter(p => p.is_available).map((product) => (
                    <div
                      key={product.id}
                      className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow duration-200 cursor-pointer"
                      onClick={() => {
                        setShowAllProducts(false);
                        handleProductClick(product);
                      }}
                    >
                      <div className="aspect-w-1 aspect-h-1 bg-gray-100">
                        {product.image_urls && product.image_urls.length > 0 ? (
                          <img
                            src={product.image_urls[0]}
                            alt={product.name}
                            className="w-full h-32 object-cover"
                          />
                        ) : (
                          <div className="w-full h-32 bg-gray-100 flex items-center justify-center">
                            <ImageIcon className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                        
                        {product.is_featured && (
                          <div className="absolute top-2 left-2">
                            <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              <Star className="w-3 h-3 mr-1 fill-current" />
                              Featured
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="p-4">
                        <h4 className="font-medium text-gray-900 mb-1">{product.name}</h4>
                        {product.description && (
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                            {product.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-gray-900">
                            {formatPrice(product.price, product.currency)}
                          </span>
                          <span className="text-xs text-green-600">Available</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
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
    </>
  );
};

export default FeaturedProducts;
