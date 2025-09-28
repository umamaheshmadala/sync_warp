// EnhancedFavoritesPage.tsx
// Enhanced favorites dashboard with categories, filtering, sharing, and notifications

import React, { useState, useCallback } from 'react';
import {
  Heart,
  Search,
  Filter,
  Plus,
  Share2,
  Bell,
  Tag,
  FolderPlus,
  Download,
  Upload,
  Star,
  Calendar,
  Users,
  Settings,
  Grid,
  List,
  MoreHorizontal,
  Edit,
  Trash2,
  BookmarkPlus,
  TrendingUp,
  Eye,
  EyeOff
} from 'lucide-react';
import useEnhancedFavorites from '../hooks/useEnhancedFavorites';
import { EnhancedFavorite, FavoriteCategory, FavoriteFilter } from '../services/enhancedFavoritesService';

interface EnhancedFavoritesPageProps {
  className?: string;
}

const EnhancedFavoritesPage: React.FC<EnhancedFavoritesPageProps> = ({ className = '' }) => {
  const {
    favorites,
    categories,
    sharedFavorites,
    notifications,
    stats,
    isLoading,
    error,
    createCategory,
    updateCategory,
    deleteCategory,
    addToFavorites,
    removeFromFavorites,
    updateFavorite,
    isFavorited,
    toggleFavorite,
    applyFilters,
    searchFavorites,
    clearFilters,
    shareFavorite,
    respondToShare,
    markNotificationAsRead,
    getUnreadNotificationsCount,
    bulkUpdateFavorites,
    bulkDeleteFavorites,
    importFavorites,
    exportFavorites,
    getFavoriteSuggestions,
    getTrendingFavorites,
    refreshData
  } = useEnhancedFavorites();

  const [activeTab, setActiveTab] = useState<'all' | 'wishlist' | 'shared' | 'categories'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFavorites, setSelectedFavorites] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareTargetId, setShareTargetId] = useState<string | null>(null);
  const [currentFilters, setCurrentFilters] = useState<FavoriteFilter>({});

  // Category management
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#3B82F6');
  const [newCategoryIcon, setNewCategoryIcon] = useState('star');

  // Filtering state
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;

    try {
      await createCategory({
        name: newCategoryName,
        description: newCategoryDescription,
        color: newCategoryColor,
        icon: newCategoryIcon
      });
      setNewCategoryName('');
      setNewCategoryDescription('');
      setNewCategoryColor('#3B82F6');
      setNewCategoryIcon('star');
      setShowNewCategory(false);
    } catch (error) {
      console.error('Failed to create category:', error);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (window.confirm('Are you sure you want to delete this category? Favorites in this category will be uncategorized.')) {
      try {
        await deleteCategory(categoryId);
      } catch (error) {
        console.error('Failed to delete category:', error);
      }
    }
  };

  const handleApplyFilters = () => {
    const filters: FavoriteFilter = {
      ...(selectedCategories.length > 0 && { categories: selectedCategories }),
      ...(selectedPriorities.length > 0 && { priority: selectedPriorities as any }),
      ...(selectedTypes.length > 0 && { itemTypes: selectedTypes as any }),
      ...(activeTab === 'wishlist' && { isWishlist: true }),
      ...(searchQuery && { searchQuery })
    };

    setCurrentFilters(filters);
    applyFilters(filters);
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    setSelectedCategories([]);
    setSelectedPriorities([]);
    setSelectedTypes([]);
    setSearchQuery('');
    setCurrentFilters({});
    clearFilters();
  };

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

  const handleBulkAction = async (action: 'delete' | 'wishlist' | 'category', value?: any) => {
    const selectedIds = Array.from(selectedFavorites);
    if (selectedIds.length === 0) return;

    try {
      switch (action) {
        case 'delete':
          if (window.confirm(`Delete ${selectedIds.length} selected favorites?`)) {
            await bulkDeleteFavorites(selectedIds);
            setSelectedFavorites(new Set());
          }
          break;
        case 'wishlist':
          await bulkUpdateFavorites(selectedIds, { is_wishlist: value });
          setSelectedFavorites(new Set());
          break;
        case 'category':
          await bulkUpdateFavorites(selectedIds, { category_id: value });
          setSelectedFavorites(new Set());
          break;
      }
    } catch (error) {
      console.error('Bulk action failed:', error);
    }
  };

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const exportData = await exportFavorites(format);
      const blob = new Blob([exportData], { 
        type: format === 'json' ? 'application/json' : 'text/csv' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `favorites.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const getDisplayFavorites = () => {
    switch (activeTab) {
      case 'wishlist':
        return favorites.filter(fav => fav.is_wishlist);
      case 'shared':
        return sharedFavorites.flatMap(share => share.favorite ? [share.favorite] : []);
      default:
        return favorites;
    }
  };

  const unreadNotifications = getUnreadNotificationsCount();
  const displayFavorites = getDisplayFavorites();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">Failed to load favorites</div>
        <button
          onClick={refreshData}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className={`max-w-7xl mx-auto p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Enhanced Favorites</h1>
          <p className="text-gray-600 mt-2">
            Organize, share, and manage your favorite businesses, coupons, and products
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Notifications */}
          <button
            className="relative p-2 text-gray-600 hover:text-indigo-600 rounded-lg hover:bg-gray-100"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadNotifications > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {unreadNotifications}
              </span>
            )}
          </button>

          {/* Export */}
          <div className="relative">
            <button
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              onClick={() => handleExport('json')}
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>

          {/* New Category */}
          <button
            onClick={() => setShowNewCategory(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <FolderPlus className="w-4 h-4" />
            <span>New Category</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Favorites</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_favorites}</p>
            </div>
            <Heart className="w-8 h-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Wishlist Items</p>
              <p className="text-2xl font-bold text-gray-900">{stats.wishlist_count}</p>
            </div>
            <BookmarkPlus className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Shared</p>
              <p className="text-2xl font-bold text-gray-900">{stats.shared_count}</p>
            </div>
            <Share2 className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Categories</p>
              <p className="text-2xl font-bold text-gray-900">{categories.length}</p>
            </div>
            <Tag className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          {/* Tabs */}
          <div className="flex border border-gray-200 rounded-lg overflow-hidden">
            {[
              { id: 'all', label: 'All', count: favorites.length },
              { id: 'wishlist', label: 'Wishlist', count: stats.wishlist_count },
              { id: 'shared', label: 'Shared', count: sharedFavorites.length },
              { id: 'categories', label: 'Categories', count: categories.length }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 text-sm font-medium ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                } border-r border-gray-200 last:border-r-0`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search favorites..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          </div>

          {/* Filters */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center space-x-2 px-4 py-2 border rounded-lg ${
              showFilters ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
            {Object.keys(currentFilters).length > 0 && (
              <span className="bg-indigo-600 text-white text-xs rounded-full px-2 py-0.5">
                {Object.keys(currentFilters).length}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center space-x-2">
          {/* Bulk Actions */}
          {selectedFavorites.size > 0 && (
            <div className="flex items-center space-x-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-sm text-blue-700">
                {selectedFavorites.size} selected
              </span>
              <button
                onClick={() => handleBulkAction('delete')}
                className="text-red-600 hover:text-red-700"
                title="Delete selected"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleBulkAction('wishlist', true)}
                className="text-blue-600 hover:text-blue-700"
                title="Add to wishlist"
              >
                <BookmarkPlus className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* View Mode */}
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

      {/* Filters Panel */}
      {showFilters && (
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Categories Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Categories</label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {categories.map(category => (
                  <label key={category.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(category.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCategories(prev => [...prev, category.id]);
                        } else {
                          setSelectedCategories(prev => prev.filter(id => id !== category.id));
                        }
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm">{category.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Priority Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <div className="space-y-2">
                {['high', 'medium', 'low'].map(priority => (
                  <label key={priority} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedPriorities.includes(priority)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPriorities(prev => [...prev, priority]);
                        } else {
                          setSelectedPriorities(prev => prev.filter(p => p !== priority));
                        }
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm capitalize">{priority}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <div className="space-y-2">
                {['business', 'coupon', 'product'].map(type => (
                  <label key={type} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedTypes.includes(type)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTypes(prev => [...prev, type]);
                        } else {
                          setSelectedTypes(prev => prev.filter(t => t !== type));
                        }
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm capitalize">{type}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-4">
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Clear All
            </button>
            <button
              onClick={handleApplyFilters}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Categories View */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map(category => (
            <div key={category.id} className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: category.color + '20', color: category.color }}
                  >
                    <Star className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{category.name}</h3>
                    {category.description && (
                      <p className="text-sm text-gray-500">{category.description}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteCategory(category.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="text-sm text-gray-600">
                {favorites.filter(fav => fav.category_id === category.id).length} items
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Favorites Grid/List */}
      {activeTab !== 'categories' && (
        <>
          {displayFavorites.length === 0 ? (
            <div className="text-center py-12">
              <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No favorites found</h3>
              <p className="text-gray-600">
                {activeTab === 'wishlist' 
                  ? "Items you mark as wishlist will appear here"
                  : activeTab === 'shared'
                  ? "Favorites shared with you will appear here"
                  : "Start adding items to your favorites to see them here"
                }
              </p>
            </div>
          ) : (
            <div className={viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'
              : 'space-y-4'
            }>
              {displayFavorites.map(favorite => (
                <FavoriteCard
                  key={favorite.id}
                  favorite={favorite}
                  categories={categories}
                  isSelected={selectedFavorites.has(favorite.id)}
                  onSelect={() => handleSelectFavorite(favorite.id)}
                  onUpdate={updateFavorite}
                  onDelete={removeFromFavorites}
                  onShare={() => {
                    setShareTargetId(favorite.id);
                    setShowShareModal(true);
                  }}
                  viewMode={viewMode}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* New Category Modal */}
      {showNewCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full m-4 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Category</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Category name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={newCategoryDescription}
                  onChange={(e) => setNewCategoryDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Optional description"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                <input
                  type="color"
                  value={newCategoryColor}
                  onChange={(e) => setNewCategoryColor(e.target.value)}
                  className="w-full h-10 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowNewCategory(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCategory}
                disabled={!newCategoryName.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                Create Category
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Favorite Card Component
interface FavoriteCardProps {
  favorite: EnhancedFavorite;
  categories: FavoriteCategory[];
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (id: string, updates: Partial<EnhancedFavorite>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onShare: () => void;
  viewMode: 'grid' | 'list';
}

const FavoriteCard: React.FC<FavoriteCardProps> = ({
  favorite,
  categories,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  onShare,
  viewMode
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editNotes, setEditNotes] = useState(favorite.notes || '');

  const handleSaveNotes = async () => {
    try {
      await onUpdate(favorite.id, { notes: editNotes });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update notes:', error);
    }
  };

  const handleToggleWishlist = async () => {
    try {
      await onUpdate(favorite.id, { is_wishlist: !favorite.is_wishlist });
    } catch (error) {
      console.error('Failed to toggle wishlist:', error);
    }
  };

  const cardClasses = viewMode === 'grid' 
    ? 'bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow'
    : 'bg-white p-4 rounded-lg shadow-sm border hover:shadow-md transition-shadow flex items-center space-x-4';

  return (
    <div className={`${cardClasses} ${isSelected ? 'ring-2 ring-indigo-500' : ''}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onSelect}
            className="rounded border-gray-300 focus:ring-indigo-500"
          />
          <div className="flex items-center space-x-2">
            {favorite.is_wishlist && (
              <BookmarkPlus className="w-4 h-4 text-blue-500" />
            )}
            <span className={`px-2 py-1 text-xs rounded-full ${
              favorite.priority === 'high' ? 'bg-red-100 text-red-700' :
              favorite.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
              'bg-green-100 text-green-700'
            }`}>
              {favorite.priority}
            </span>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-6 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
              <button
                onClick={() => {
                  setIsEditing(true);
                  setShowMenu(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
              >
                <Edit className="w-4 h-4" />
                <span>Edit Notes</span>
              </button>
              <button
                onClick={() => {
                  handleToggleWishlist();
                  setShowMenu(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
              >
                {favorite.is_wishlist ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span>{favorite.is_wishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}</span>
              </button>
              <button
                onClick={() => {
                  onShare();
                  setShowMenu(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
              >
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </button>
              <button
                onClick={() => {
                  if (window.confirm('Delete this favorite?')) {
                    onDelete(favorite.id);
                  }
                  setShowMenu(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1">
        <div className="flex items-center space-x-2 mb-2">
          <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">
            {favorite.item_type}
          </span>
          {favorite.category && (
            <span
              className="px-2 py-1 text-xs rounded-full"
              style={{ 
                backgroundColor: favorite.category.color + '20',
                color: favorite.category.color
              }}
            >
              {favorite.category.name}
            </span>
          )}
        </div>

        <h3 className="font-medium text-gray-900 mb-2">Item ID: {favorite.item_id}</h3>

        {favorite.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {favorite.tags.map(tag => (
              <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                {tag}
              </span>
            ))}
          </div>
        )}

        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={3}
              placeholder="Add notes..."
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNotes}
                className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          favorite.notes && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">{favorite.notes}</p>
          )
        )}

        <div className="text-xs text-gray-500">
          Added {new Date(favorite.created_at).toLocaleDateString()}
          {favorite.reminder_date && (
            <span className="ml-2 text-blue-600">
              • Reminder: {new Date(favorite.reminder_date).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedFavoritesPage;