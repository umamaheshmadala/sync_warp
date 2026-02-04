import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Eye,
  Star,
  ShoppingBag,
  Search,
  Filter,
  Grid3X3,
  List,
  Package
} from 'lucide-react';
import { Product, ProductFilters } from '../../types/product';
import { useProducts } from '../../hooks/useProducts';
// import ProductForm from './ProductForm';
import ProductCard from './ProductCard';
import { toast } from 'react-hot-toast';

import { DraftsTab } from '../products/drafts/DraftsTab';
import { ProductCreationWizard } from '../products/creation/ProductCreationWizard';
import { useProductWizardStore } from '../../stores/useProductWizardStore';
import { FileText } from 'lucide-react';

interface ProductManagerProps {
  businessId: string;
  businessName: string;
  isOwner: boolean;
}

const ProductManager: React.FC<ProductManagerProps> = React.memo(({
  businessId,
  businessName,
  isOwner
}) => {
  const { products, loading, deleteProduct, refreshProducts } = useProducts(businessId);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const { openWizard } = useProductWizardStore();

  const [activeTab, setActiveTab] = useState<'products' | 'drafts'>('products');
  const [filters, setFilters] = useState<ProductFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Filter products based on search and filters
  const filteredProducts = products.filter(product => {
    // Search filter
    if (searchQuery && !product.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !product.description?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Category filter
    if (filters.category && product.category !== filters.category) {
      return false;
    }

    // Availability filter
    if (filters.availability !== undefined && product.is_available !== filters.availability) {
      return false;
    }

    // Featured filter
    if (filters.featured !== undefined && product.is_featured !== filters.featured) {
      return false;
    }


    return true;
  });

  // Get unique categories from products
  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

  const handleCreateProduct = () => {
    openWizard(businessId);
  };

  const handleEditProduct = (product: Product) => {
    // Legacy Edit Form
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleDeleteProduct = async (productId: string, productName: string) => {
    if (window.confirm(`Are you sure you want to delete "${productName}"? This action cannot be undone.`)) {
      const success = await deleteProduct(productId);
      if (success) {
        toast.success('Product deleted successfully');
      }
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingProduct(null);
  };

  const handleFormSuccess = async () => {
    setShowForm(false);
    setEditingProduct(null);
    // Refresh products list
    await refreshProducts();
  };

  const clearFilters = () => {
    setFilters({});
    setSearchQuery('');
  };

  const getStatsCards = () => [
    {
      title: 'Total Products',
      value: products.length,
      icon: Package,
      color: 'bg-blue-500'
    },
    {
      title: 'Available',
      value: products.filter(p => p.is_available).length,
      icon: Eye,
      color: 'bg-green-500'
    },
    {
      title: 'Featured',
      value: products.filter(p => p.is_featured).length,
      icon: Star,
      color: 'bg-yellow-500'
    },
    {
      title: 'Categories',
      value: categories.length,
      icon: Grid3X3,
      color: 'bg-purple-500'
    }
  ];

  if (loading && products.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ShoppingBag className="w-7 h-7 text-blue-600" />
              Product Catalog
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage products and services for {businessName}
            </p>
          </div>

          {isOwner && (
            <div className="mt-4 sm:mt-0 flex gap-2">
              {/* Tabs (only if owner) */}
              <div className="flex bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setActiveTab('products')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'products' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <ShoppingBag className="w-4 h-4 inline-block mr-1" />
                  Products
                </button>
                <button
                  onClick={() => setActiveTab('drafts')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'drafts' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <FileText className="w-4 h-4 inline-block mr-1" />
                  Drafts
                </button>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCreateProduct}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </motion.button>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          {getStatsCards().map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-lg border border-gray-200 p-4"
            >
              <div className="flex items-center">
                <div className={`flex-shrink-0 w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center`}>
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
                <div className="ml-4">
                  <div className="text-sm font-medium text-gray-500">{stat.title}</div>
                  <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md ${viewMode === 'grid'
                ? 'bg-blue-100 text-blue-600'
                : 'text-gray-400 hover:text-gray-600'
                }`}
            >
              <Grid3X3 className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md ${viewMode === 'list'
                ? 'bg-blue-100 text-blue-600'
                : 'text-gray-400 hover:text-gray-600'
                }`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
            {Object.keys(filters).length > 0 && (
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {Object.keys(filters).length}
              </span>
            )}
          </button>
        </div>

        {/* Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-gray-50 rounded-lg p-4 border border-gray-200"
            >
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Category Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={filters.category || ''}
                    onChange={(e) => setFilters({ ...filters, category: e.target.value || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Categories</option>
                    {categories.map(category => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Availability Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Availability
                  </label>
                  <select
                    value={filters.availability === undefined ? '' : filters.availability.toString()}
                    onChange={(e) => setFilters({
                      ...filters,
                      availability: e.target.value === '' ? undefined : e.target.value === 'true'
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Products</option>
                    <option value="true">Available</option>
                    <option value="false">Unavailable</option>
                  </select>
                </div>

                {/* Featured Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Featured
                  </label>
                  <select
                    value={filters.featured === undefined ? '' : filters.featured.toString()}
                    onChange={(e) => setFilters({
                      ...filters,
                      featured: e.target.value === '' ? undefined : e.target.value === 'true'
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Products</option>
                    <option value="true">Featured</option>
                    <option value="false">Not Featured</option>
                  </select>
                </div>

                {/* Clear Filters */}
                <div className="flex items-end">
                  <button
                    onClick={clearFilters}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Products Or Drafts Display */}
      {activeTab === 'drafts' ? (
        <DraftsTab businessId={businessId} />
      ) : (
        /* Original Product List Logic */
        filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            {/* ... (Empty state content) ... */}
            <div className="mx-auto h-24 w-24 text-gray-400 mb-4">
              <Package className="w-full h-full" />
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No products found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {products.length === 0
                ? isOwner
                  ? 'Get started by adding your first product.'
                  : 'This business hasn\'t added any products yet.'
                : 'Try adjusting your search or filters.'
              }
            </p>
            {isOwner && products.length === 0 && (
              <div className="mt-6">
                <button
                  onClick={handleCreateProduct}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Product
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className={`grid gap-6 ${viewMode === 'grid'
            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
            : 'grid-cols-1'
            }`}>
            {filteredProducts.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <ProductCard
                  product={product}
                  viewMode={viewMode}
                  isOwner={isOwner}
                  onEdit={() => handleEditProduct(product)}
                  onDelete={() => handleDeleteProduct(product.id, product.name)}
                />
              </motion.div>
            ))}
          </div>
        )
      )}

      {/* Product Creation Wizard */}
      <ProductCreationWizard />

      {/* Product Form Modal (Legacy - Removed for Wizard) */}
      {/* <AnimatePresence>
        {showForm && (
           // ...
        )}
      </AnimatePresence> */}
    </div>
  );
});

ProductManager.displayName = 'ProductManager';

export default ProductManager;
