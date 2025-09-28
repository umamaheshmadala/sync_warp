// CategoryBrowserPage.tsx
// Category browser page with visual category cards, filtering, and organized business exploration

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Grid,
  List,
  Search,
  Filter,
  MapPin,
  Star,
  TrendingUp,
  Users,
  Zap,
  Clock,
  DollarSign,
  ChevronRight,
  Building,
  ShoppingBag,
  Utensils,
  Car,
  Heart,
  Music,
  GraduationCap,
  Briefcase,
  Home,
  Gamepad2,
  Loader2
} from 'lucide-react';
import useAdvancedSearch from '../../hooks/useAdvancedSearch';
import BusinessCard from '../search/BusinessCard';
import { SimpleSaveButton } from '../favorites/SimpleSaveButton';

interface CategoryBrowserPageProps {
  className?: string;
}

const CategoryBrowserPage: React.FC<CategoryBrowserPageProps> = ({ className = '' }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    categories,
    businesses,
    isLoading,
    error,
    total,
    loadCategories,
    searchByCategory,
    searchBusinesses
  } = useAdvancedSearch();

  // Local state
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    searchParams.get('category')
  );
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'count' | 'popular'>('name');

  // Load categories on mount
  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Load businesses for selected category
  useEffect(() => {
    if (selectedCategory) {
      searchByCategory(selectedCategory);
    }
  }, [selectedCategory, searchByCategory]);

  // Category icons mapping
  const getCategoryIcon = (categoryName: string) => {
    const name = categoryName.toLowerCase();
    if (name.includes('restaurant') || name.includes('food')) return <Utensils className="w-8 h-8" />;
    if (name.includes('retail') || name.includes('shop')) return <ShoppingBag className="w-8 h-8" />;
    if (name.includes('service') || name.includes('repair')) return <Briefcase className="w-8 h-8" />;
    if (name.includes('health') || name.includes('medical')) return <Heart className="w-8 h-8" />;
    if (name.includes('entertainment') || name.includes('fun')) return <Music className="w-8 h-8" />;
    if (name.includes('education') || name.includes('school')) return <GraduationCap className="w-8 h-8" />;
    if (name.includes('automotive') || name.includes('car')) return <Car className="w-8 h-8" />;
    if (name.includes('home') || name.includes('house')) return <Home className="w-8 h-8" />;
    if (name.includes('game') || name.includes('sport')) return <Gamepad2 className="w-8 h-8" />;
    return <Building className="w-8 h-8" />;
  };

  // Category colors mapping
  const getCategoryColor = (categoryName: string) => {
    const name = categoryName.toLowerCase();
    if (name.includes('restaurant') || name.includes('food')) return 'from-orange-400 to-red-500';
    if (name.includes('retail') || name.includes('shop')) return 'from-blue-400 to-indigo-500';
    if (name.includes('service') || name.includes('repair')) return 'from-gray-400 to-gray-600';
    if (name.includes('health') || name.includes('medical')) return 'from-green-400 to-emerald-500';
    if (name.includes('entertainment') || name.includes('fun')) return 'from-purple-400 to-pink-500';
    if (name.includes('education') || name.includes('school')) return 'from-yellow-400 to-orange-500';
    if (name.includes('automotive') || name.includes('car')) return 'from-red-400 to-pink-500';
    if (name.includes('home') || name.includes('house')) return 'from-teal-400 to-cyan-500';
    if (name.includes('game') || name.includes('sport')) return 'from-violet-400 to-purple-500';
    return 'from-slate-400 to-slate-600';
  };

  // Filter and sort categories
  const filteredCategories = categories
    .filter(category => 
      searchQuery ? category.name.toLowerCase().includes(searchQuery.toLowerCase()) : true
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'count':
          return b.count - a.count;
        case 'popular':
          return b.count - a.count; // Same as count for now
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });

  const handleCategoryClick = (categoryName: string) => {
    setSelectedCategory(categoryName);
    navigate(`/categories?category=${encodeURIComponent(categoryName)}`);
  };

  const handleBackToCategories = () => {
    setSelectedCategory(null);
    navigate('/categories');
  };

  const handleAdvancedSearch = () => {
    const query = selectedCategory ? `category:${selectedCategory}` : '';
    navigate(`/search/advanced?query=${encodeURIComponent(query)}`);
  };

  if (isLoading && categories.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading categories...</p>
        </div>
      </div>
    );
  }

  // Category Detail View
  if (selectedCategory) {
    return (
      <div className={`max-w-7xl mx-auto p-6 ${className}`}>
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <button
              onClick={handleBackToCategories}
              className="flex items-center space-x-2 text-indigo-600 hover:text-indigo-700 font-medium"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
              <span>Back to Categories</span>
            </button>
          </div>
          
          <div className="flex items-center space-x-4 mb-4">
            <div className={`p-4 bg-gradient-to-br ${getCategoryColor(selectedCategory)} rounded-xl text-white`}>
              {getCategoryIcon(selectedCategory)}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{selectedCategory}</h1>
              <p className="text-gray-600">
                {total} business{total !== 1 ? 'es' : ''} found
              </p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <button
              onClick={handleAdvancedSearch}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
            >
              <Filter className="w-4 h-4" />
              <span>Advanced Search</span>
            </button>
          </div>

          <div className="flex items-center space-x-3">
            {/* View Mode Toggle */}
            <div className="flex border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${
                  viewMode === 'grid' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 border-l border-gray-200 ${
                  viewMode === 'list' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Businesses */}
        {businesses.length > 0 ? (
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'
            : 'space-y-6'
          }>
            {businesses.map(business => (
              <div key={business.id} className="relative">
                <BusinessCard
                  business={business}
                  onClick={() => navigate(`/business/${business.id}`)}
                  viewMode={viewMode}
                  showFavoriteButton={true}
                />
                <div className="absolute top-3 right-3">
                  <SimpleSaveButton
                    itemId={business.id}
                    itemType="business"
                    itemData={{
                      business_name: business.name || business.business_name,
                      business_type: business.category || business.business_type,
                      address: business.address,
                      rating: business.rating,
                      description: business.description
                    }}
                    size="sm"
                  />
                </div>
              </div>
            ))}
          </div>
        ) : !isLoading ? (
          <div className="text-center py-12">
            <div className={`w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br ${getCategoryColor(selectedCategory)} flex items-center justify-center text-white`}>
              {getCategoryIcon(selectedCategory)}
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No businesses found</h3>
            <p className="text-gray-600 mb-6">
              No businesses found in the {selectedCategory} category.
            </p>
            <div className="flex justify-center space-x-3">
              <button
                onClick={handleBackToCategories}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
              >
                Browse Other Categories
              </button>
              <button
                onClick={handleAdvancedSearch}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
              >
                Advanced Search
              </button>
            </div>
          </div>
        ) : null}

        {/* Loading state */}
        {isLoading && (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading businesses...</p>
          </div>
        )}
      </div>
    );
  }

  // Categories Overview
  return (
    <div className={`max-w-7xl mx-auto p-6 ${className}`}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Browse Categories</h1>
        <p className="text-gray-600">
          Explore businesses organized by category and find exactly what you're looking for
        </p>
      </div>

      {/* Search and Controls */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4 flex-1">
          {/* Search Categories */}
          <div className="relative max-w-md">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search categories..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full"
            />
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          </div>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'name' | 'count' | 'popular')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="name">Sort by Name</option>
            <option value="count">Sort by Count</option>
            <option value="popular">Most Popular</option>
          </select>
        </div>

        <div className="text-sm text-gray-600">
          {filteredCategories.length} categor{filteredCategories.length !== 1 ? 'ies' : 'y'} found
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Categories Grid */}
      {filteredCategories.length > 0 ? (
        <>
          {/* Popular Categories */}
          <div className="mb-12">
            <div className="flex items-center space-x-3 mb-6">
              <TrendingUp className="w-5 h-5 text-red-500" />
              <h2 className="text-xl font-bold text-gray-900">Popular Categories</h2>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
              {filteredCategories
                .sort((a, b) => b.count - a.count)
                .slice(0, 12)
                .map((category) => (
                  <button
                    key={category.name}
                    onClick={() => handleCategoryClick(category.name)}
                    className="group p-6 bg-white border border-gray-200 rounded-xl hover:border-indigo-300 hover:shadow-lg transition-all duration-200"
                  >
                    {/* Category Icon */}
                    <div className={`w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br ${getCategoryColor(category.name)} flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-200`}>
                      {getCategoryIcon(category.name)}
                    </div>
                    
                    {/* Category Name */}
                    <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-indigo-900 transition-colors">
                      {category.name}
                    </h3>
                    
                    {/* Business Count */}
                    <p className="text-sm text-gray-600 group-hover:text-indigo-700 transition-colors">
                      {category.count} business{category.count !== 1 ? 'es' : ''}
                    </p>

                    {/* Trending Badge */}
                    {category.count > 10 && (
                      <div className="mt-2 inline-flex items-center px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        Popular
                      </div>
                    )}
                  </button>
                ))}
            </div>
          </div>

          {/* All Categories */}
          <div>
            <div className="flex items-center space-x-3 mb-6">
              <Grid className="w-5 h-5 text-indigo-500" />
              <h2 className="text-xl font-bold text-gray-900">All Categories</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCategories.map((category) => (
                <button
                  key={category.name}
                  onClick={() => handleCategoryClick(category.name)}
                  className="group p-6 bg-white border border-gray-200 rounded-xl hover:border-indigo-300 hover:shadow-md transition-all duration-200 text-left"
                >
                  <div className="flex items-center space-x-4">
                    {/* Category Icon */}
                    <div className={`w-14 h-14 rounded-lg bg-gradient-to-br ${getCategoryColor(category.name)} flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-200`}>
                      {getCategoryIcon(category.name)}
                    </div>
                    
                    <div className="flex-1">
                      {/* Category Name */}
                      <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-indigo-900 transition-colors">
                        {category.name}
                      </h3>
                      
                      {/* Description */}
                      {category.description && (
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                          {category.description}
                        </p>
                      )}
                      
                      {/* Business Count */}
                      <div className="flex items-center space-x-4 text-sm">
                        <span className="text-gray-600 group-hover:text-indigo-700 transition-colors">
                          {category.count} business{category.count !== 1 ? 'es' : ''}
                        </span>
                        
                        {/* Popular Badge */}
                        {category.count > 5 && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                            Active
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all duration-200" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      ) : !isLoading ? (
        <div className="text-center py-12">
          <Grid className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No categories found</h3>
          <p className="text-gray-600 mb-6">
            {searchQuery 
              ? `No categories match "${searchQuery}". Try a different search term.`
              : 'No categories are available at the moment.'
            }
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
            >
              Clear Search
            </button>
          )}
        </div>
      ) : null}

      {/* Loading state */}
      {isLoading && (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading categories...</p>
        </div>
      )}

      {/* Call to Action */}
      <div className="mt-16 text-center py-12 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">Looking for something specific?</h3>
        <p className="text-gray-600 mb-8">Use our advanced search to find businesses with detailed filters</p>
        <button
          onClick={() => navigate('/search/advanced')}
          className="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
        >
          Advanced Search
        </button>
      </div>
    </div>
  );
};

export default CategoryBrowserPage;