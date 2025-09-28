// FallbackEnhancedFavoritesPage.tsx
// Enhanced favorites page that works with the existing simple favorites system
// This provides the enhanced UI while falling back to the simple favorites backend

import React, { useState, useEffect } from 'react';
import {
  Heart,
  Search,
  Filter,
  Plus,
  Share2,
  Bell,
  Tag,
  Star,
  Grid,
  List,
  MoreHorizontal,
  Edit,
  Trash2,
  BookmarkPlus,
  TrendingUp,
  Loader2,
  X,
  FolderOpen,
  Clock,
  MapPin,
  ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useLocalFavorites from '../../hooks/useLocalFavorites';
import { SimpleSaveButton } from './SimpleSaveButton';

interface FallbackEnhancedFavoritesPageProps {
  className?: string;
}

const FallbackEnhancedFavoritesPage: React.FC<FallbackEnhancedFavoritesPageProps> = ({ className = '' }) => {
  const navigate = useNavigate();
  const localFavorites = useLocalFavorites();
  const { favorites, isLoading, error, counts } = localFavorites;
  
  // Transform localStorage favorites for display
  const favoritesWithData = favorites.map(fav => ({
    id: fav.id,
    item_id: fav.id,
    item_type: fav.type,
    item_data: {
      name: `${fav.type === 'business' ? 'Business' : 'Coupon'} ${fav.id.slice(0, 8)}`,
      description: `Favorited ${fav.type}`,
    },
    created_at: new Date(fav.timestamp).toISOString()
  }));

  // Local state
  const [activeTab, setActiveTab] = useState<'all' | 'businesses' | 'coupons'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFavorites, setSelectedFavorites] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  // Filter favorites based on active tab and search
  const filteredFavorites = favoritesWithData.filter(favorite => {
    // Tab filtering
    if (activeTab === 'businesses' && favorite.item_type !== 'business') return false;
    if (activeTab === 'coupons' && favorite.item_type !== 'coupon') return false;

    // Search filtering
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const itemData = favorite.item_data as any;
      const name = itemData?.name || itemData?.title || itemData?.business_name || '';
      const description = itemData?.description || '';
      return name.toLowerCase().includes(query) || description.toLowerCase().includes(query);
    }

    return true;
  });

  const handleSelectFavorite = (favoriteId: string) => {
    setSelectedFavorites(prev => {
      const newSet = new Set(prev);
      if (newSet.has(favoriteId)) {
        newSet.delete(favoriteId);
      } else {
        newSet.add(favoriteId);
      }
      return newSet;
    });
  };

  const handleBulkDelete = async () => {
    const selectedIds = Array.from(selectedFavorites);
    if (selectedIds.length === 0) return;

    if (window.confirm(`Delete ${selectedIds.length} selected favorites?`)) {
      try {
        for (const id of selectedIds) {
          const favorite = favoritesWithData.find(f => f.id === id);
          if (favorite) {
            localFavorites.toggleFavorite(id, favorite.item_type as any);
          }
        }
        setSelectedFavorites(new Set());
      } catch (error) {
        console.error('Bulk delete failed:', error);
      }
    }
  };

  const getFavoriteIcon = (itemType: string) => {
    switch (itemType) {
      case 'business': return <MapPin className="w-5 h-5" />;
      case 'coupon': return <Tag className="w-5 h-5" />;
      default: return <Heart className="w-5 h-5" />;
    }
  };

  const handleItemClick = (favorite: any) => {
    const itemData = favorite.item_data as any;
    
    if (favorite.item_type === 'business') {
      navigate(`/business/${favorite.item_id}`);
    } else if (favorite.item_type === 'coupon') {
      navigate(`/coupon/${favorite.item_id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your favorites...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-lg font-semibold text-red-900 mb-2">Unable to Load Favorites</h2>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`max-w-7xl mx-auto p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Favorites</h1>
          <p className="text-gray-600">
            Manage and organize your favorite businesses, coupons, and deals
          </p>
        </div>

        <div className="flex space-x-4">
          {/* Migration Notice */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-sm">
            <div className="flex items-start space-x-2">
              <Bell className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-yellow-900">Enhanced Features Coming Soon</h3>
                <p className="text-xs text-yellow-700 mt-1">
                  Advanced categories, sharing, and organization features will be available once the database migration is complete.
                </p>
              </div>
            </div>
          </div>
          
          {/* Debug Panel */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-sm">
            <div className="flex items-start space-x-2">
              <div className="text-xs">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Debug Panel</h4>
                <div className="space-y-2">
                  <button
                    onClick={() => (localFavorites as any).seedTestData?.()}
                    className="block w-full px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                  >
                    Add Test Data
                  </button>
                  <button
                    onClick={() => (localFavorites as any).clearAllFavorites?.()}
                    className="block w-full px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                  >
                    Clear All
                  </button>
                  <div className="text-xs text-blue-700">
                    Count: {counts.total} ({counts.businesses}B, {counts.coupons}C)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <Heart className="w-8 h-8 text-red-500" />
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900">{counts.total}</p>
              <p className="text-sm text-gray-600">Total Favorites</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <MapPin className="w-8 h-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900">
                {counts.businesses}
              </p>
              <p className="text-sm text-gray-600">Businesses</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <Tag className="w-8 h-8 text-green-500" />
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900">
                {counts.coupons}
              </p>
              <p className="text-sm text-gray-600">Coupons</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900">
                {favoritesWithData.filter(f => {
                  const created = new Date(f.created_at);
                  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                  return created > weekAgo;
                }).length}
              </p>
              <p className="text-sm text-gray-600">This Week</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search favorites..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-80"
              />
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            </div>

            {/* Tab Filters */}
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  activeTab === 'all'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All ({counts.total})
              </button>
              <button
                onClick={() => setActiveTab('businesses')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  activeTab === 'businesses'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Businesses ({counts.businesses})
              </button>
              <button
                onClick={() => setActiveTab('coupons')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  activeTab === 'coupons'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Coupons ({counts.coupons})
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Bulk Actions */}
            {selectedFavorites.size > 0 && (
              <>
                <span className="text-sm text-gray-600">
                  {selectedFavorites.size} selected
                </span>
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center space-x-1 px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              </>
            )}

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
      </div>

      {/* Favorites Display */}
      {filteredFavorites.length === 0 ? (
        <div className="text-center py-12">
          <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery || activeTab !== 'all' ? 'No matching favorites' : 'No favorites yet'}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchQuery || activeTab !== 'all' 
              ? 'Try adjusting your search or filters'
              : 'Start saving your favorite businesses and coupons'}
          </p>
          {!searchQuery && activeTab === 'all' && (
            <button
              onClick={() => navigate('/search/advanced')}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Explore Businesses
            </button>
          )}
        </div>
      ) : (
        <div className={`${
          viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
            : 'space-y-4'
        }`}>
          {filteredFavorites.map((favorite) => {
            const itemData = favorite.item_data as any;
            const name = itemData?.name || itemData?.title || itemData?.business_name || 'Unnamed Item';
            const description = itemData?.description || '';
            const isSelected = selectedFavorites.has(favorite.id);

            return (
              <div
                key={favorite.id}
                className={`bg-white rounded-lg shadow-sm border transition-shadow hover:shadow-md ${
                  isSelected ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200'
                } ${viewMode === 'list' ? 'flex items-center p-4' : 'p-6'}`}
              >
                {viewMode === 'grid' ? (
                  <>
                    {/* Grid View */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectFavorite(favorite.id)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div className={`p-2 rounded-lg ${
                          favorite.item_type === 'business' ? 'bg-blue-100 text-blue-600' :
                          favorite.item_type === 'coupon' ? 'bg-green-100 text-green-600' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {getFavoriteIcon(favorite.item_type)}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <SimpleSaveButton
                          itemId={favorite.item_id}
                          itemType={favorite.item_type as any}
                          itemData={itemData}
                          size="sm"
                        />
                        <button className="p-1 text-gray-400 hover:text-gray-600">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h3 className="font-semibold text-gray-900 mb-2">{name}</h3>
                      {description && (
                        <p className="text-sm text-gray-600 line-clamp-2">{description}</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>Saved {new Date(favorite.created_at).toLocaleDateString()}</span>
                      </div>
                      <button
                        onClick={() => handleItemClick(favorite)}
                        className="flex items-center space-x-1 text-indigo-600 hover:text-indigo-700"
                      >
                        <span>View</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* List View */}
                    <div className="flex items-center space-x-4 flex-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectFavorite(favorite.id)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className={`p-2 rounded-lg ${
                        favorite.item_type === 'business' ? 'bg-blue-100 text-blue-600' :
                        favorite.item_type === 'coupon' ? 'bg-green-100 text-green-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {getFavoriteIcon(favorite.item_type)}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{name}</h3>
                        {description && (
                          <p className="text-sm text-gray-600 mt-1">{description}</p>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(favorite.created_at).toLocaleDateString()}
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleItemClick(favorite)}
                          className="p-2 text-indigo-600 hover:text-indigo-700"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        <SimpleSaveButton
                          itemId={favorite.item_id}
                          itemType={favorite.item_type as any}
                          itemData={itemData}
                          size="sm"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FallbackEnhancedFavoritesPage;