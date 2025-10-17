// AdvancedSearchPage.tsx
// Advanced search interface with multi-filter UI, category filtering, and search suggestions

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  Filter,
  MapPin,
  Star,
  Clock,
  DollarSign,
  Grid,
  List,
  SlidersHorizontal,
  Zap,
  Heart,
  X,
  ChevronDown,
  Loader2,
  Target
} from 'lucide-react';
import { useAdvancedSearch } from '../../hooks/useAdvancedSearch';
import { useAdvancedLocation } from '../../hooks/useAdvancedLocation';
import { SearchFilters, BusinessSearchResult } from '../../services/advancedSearchService';
import { searchService } from '../../services/searchService';
import BusinessCard from '../search/BusinessCard';
import { SimpleSaveButton } from '../favorites/SimpleSaveButton';

interface AdvancedSearchPageProps {
  className?: string;
}

const AdvancedSearchPage: React.FC<AdvancedSearchPageProps> = ({ className = '' }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const {
    businesses,
    suggestions,
    categories,
    isSearching,
    isLoading,
    error,
    total,
    hasMore,
    currentFilters,
    searchBusinesses,
    searchMore,
    getSuggestions,
    clearSuggestions,
    searchByCategory,
    searchNearby,
    updateFilters,
    resetFilters,
    isFavorited,
    toggleFavorite
  } = useAdvancedSearch();

  const { currentLocation, getCurrentLocation } = useAdvancedLocation();

  // Local state for UI
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [trendingTerms, setTrendingTerms] = useState<any[]>([]);
  const [showTrending, setShowTrending] = useState(true);
  
  // Filter states
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [ratingFilter, setRatingFilter] = useState({ min: '', max: '' });
  const [radiusFilter, setRadiusFilter] = useState('10');
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [withOffers, setWithOffers] = useState(false);
  const [sortBy, setSortBy] = useState<SearchFilters['sortBy']>('relevance');
  
  // Load trending search terms on mount
  useEffect(() => {
    const loadTrendingTerms = async () => {
      try {
        const trending = await searchService.getTrendingSearchTerms(7, 8);
        setTrendingTerms(trending);
      } catch (error) {
        console.error('Failed to load trending terms:', error);
      }
    };

    loadTrendingTerms();
  }, []);

  // Note: Removed visibility listener - realtime subscriptions in useUnifiedFavorites
  // handle favorite state updates automatically without manual refresh

  // Handle search input changes with debounced suggestions
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        getSuggestions(searchQuery);
        setShowSuggestions(true);
        setShowTrending(false);
      } else {
        clearSuggestions();
        setShowSuggestions(false);
        setShowTrending(true);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, getSuggestions, clearSuggestions]);

  // Handle search submission
  const handleSearch = async (query?: string, additionalFilters?: Partial<SearchFilters>) => {
    const searchFilters: SearchFilters = {
      query: query || searchQuery || undefined,
      categories: selectedCategories.length > 0 ? selectedCategories : undefined,
      location: currentLocation ? {
        latitude: currentLocation.coordinates.latitude,
        longitude: currentLocation.coordinates.longitude,
        radius: parseInt(radiusFilter) || 10
      } : undefined,
      priceRange: priceRange.min || priceRange.max ? {
        min: priceRange.min ? parseFloat(priceRange.min) : undefined,
        max: priceRange.max ? parseFloat(priceRange.max) : undefined
      } : undefined,
      rating: ratingFilter.min || ratingFilter.max ? {
        min: ratingFilter.min ? parseFloat(ratingFilter.min) : undefined,
        max: ratingFilter.max ? parseFloat(ratingFilter.max) : undefined
      } : undefined,
      sortBy,
      isOpen: onlyOpen || undefined,
      hasOffers: withOffers || undefined,
      ...additionalFilters
    };

    await searchBusinesses(searchFilters);
    setShowSuggestions(false);
    setShowFilters(false);
  };

  // Handle URL parameters on mount (after handleSearch is defined)
  useEffect(() => {
    const categoryParam = searchParams.get('category');
    const queryParam = searchParams.get('q') || searchParams.get('query');
    const radiusParam = searchParams.get('radius');
    const sectionParam = searchParams.get('section');
    
    // Set filters from URL params
    if (categoryParam) {
      setSelectedCategories([decodeURIComponent(categoryParam)]);
    }
    
    if (queryParam) {
      setSearchQuery(decodeURIComponent(queryParam));
    }
    
    if (radiusParam) {
      setRadiusFilter(radiusParam);
    }
    
    // Auto-search if parameters are present
    if (categoryParam || queryParam) {
      setTimeout(() => {
        handleSearch(queryParam ? decodeURIComponent(queryParam) : undefined);
      }, 500); // Small delay to ensure state is set
    }
  }, [searchParams]); // Remove handleSearch from dependencies to avoid infinite loops

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: any) => {
    if (suggestion.type === 'business') {
      setSearchQuery(suggestion.text);
      handleSearch(suggestion.text);
    } else if (suggestion.type === 'category') {
      setSelectedCategories([suggestion.text]);
      setSearchQuery('');
      searchByCategory(suggestion.text);
    }
  };

  // Handle trending term click
  const handleTrendingTermClick = (term: string) => {
    setSearchQuery(term);
    handleSearch(term);
    setShowTrending(false);
  };

  // Handle category filter change
  const handleCategoryToggle = (categoryName: string) => {
    setSelectedCategories(prev => {
      const updated = prev.includes(categoryName)
        ? prev.filter(cat => cat !== categoryName)
        : [...prev, categoryName];
      return updated;
    });
  };

  // Handle apply filters
  const handleApplyFilters = () => {
    handleSearch();
  };

  // Handle clear filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategories([]);
    setPriceRange({ min: '', max: '' });
    setRatingFilter({ min: '', max: '' });
    setRadiusFilter('10');
    setOnlyOpen(false);
    setWithOffers(false);
    setSortBy('relevance');
    resetFilters();
  };

  // Handle search nearby
  const handleSearchNearby = async () => {
    if (!currentLocation) {
      await getCurrentLocation();
    }
    await searchNearby(parseInt(radiusFilter) || 10);
  };

  // Get active filters count
  const activeFiltersCount = [
    selectedCategories.length > 0,
    priceRange.min || priceRange.max,
    ratingFilter.min || ratingFilter.max,
    onlyOpen,
    withOffers,
    sortBy !== 'relevance'
  ].filter(Boolean).length;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading search data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`max-w-7xl mx-auto p-6 ${className}`}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Advanced Search</h1>
        <p className="text-gray-600">
          Find businesses, services, and deals tailored to your needs
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <div className="relative">
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search for businesses, services, or categories..."
            className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-lg"
          />
          <Search className="absolute left-4 top-4 w-6 h-6 text-gray-400" />
        </div>

        {/* Search Suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-10 max-h-60 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center space-x-3 border-b border-gray-100 last:border-b-0"
              >
                {suggestion.type === 'business' && <Search className="w-4 h-4 text-gray-400" />}
                {suggestion.type === 'category' && <Grid className="w-4 h-4 text-gray-400" />}
                <div>
                  <div className="font-medium text-gray-900">{suggestion.text}</div>
                  {suggestion.type === 'business' && suggestion.metadata && (
                    <div className="text-sm text-gray-500">{suggestion.metadata.category}</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Trending Search Terms */}
        {showTrending && trendingTerms.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-10">
            <div className="p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Zap className="w-4 h-4 text-orange-500" />
                <h3 className="font-medium text-gray-900">Trending Searches</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {trendingTerms.map((term, index) => (
                  <button
                    key={index}
                    onClick={() => handleTrendingTermClick(term.search_term)}
                    className="px-3 py-1 bg-gray-100 hover:bg-indigo-100 text-sm text-gray-700 hover:text-indigo-700 rounded-full transition-colors"
                  >
                    {term.search_term}
                    <span className="ml-1 text-xs text-gray-500">({term.search_count})</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center space-x-3">
          {/* Search Button */}
          <button
            onClick={() => handleSearch()}
            className="flex items-center space-x-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
          >
            <Search className="w-4 h-4" />
            <span>Search</span>
          </button>

          {/* Nearby Button */}
          <button
            onClick={handleSearchNearby}
            className="flex items-center space-x-2 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
          >
            <Target className="w-4 h-4" />
            <span>Near Me</span>
          </button>

          {/* Filters Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center space-x-2 px-6 py-3 border rounded-lg font-medium ${
              showFilters || activeFiltersCount > 0
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                : 'border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <span className="bg-indigo-600 text-white text-xs rounded-full px-2 py-0.5">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center space-x-3">
          {/* Results count */}
          {total > 0 && (
            <span className="text-sm text-gray-600">
              {total} result{total !== 1 ? 's' : ''} found
            </span>
          )}

          {/* View mode toggle */}
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

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div className="mb-6 p-6 bg-gray-50 border border-gray-200 rounded-xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Categories */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Categories</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {categories.map(category => (
                  <label key={category.name} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(category.name)}
                      onChange={() => handleCategoryToggle(category.name)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      {category.name} ({category.count})
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Filters */}
            <div className="space-y-4">
              {/* Price Range */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Price Range</h3>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    value={priceRange.min}
                    onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                    placeholder="Min"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="number"
                    value={priceRange.max}
                    onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                    placeholder="Max"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Rating */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Rating</h3>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    min="1"
                    max="5"
                    step="0.1"
                    value={ratingFilter.min}
                    onChange={(e) => setRatingFilter(prev => ({ ...prev, min: e.target.value }))}
                    placeholder="Min"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="number"
                    min="1"
                    max="5"
                    step="0.1"
                    value={ratingFilter.max}
                    onChange={(e) => setRatingFilter(prev => ({ ...prev, max: e.target.value }))}
                    placeholder="Max"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Distance */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Distance</h3>
                <select
                  value={radiusFilter}
                  onChange={(e) => setRadiusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="5">Within 5 km</option>
                  <option value="10">Within 10 km</option>
                  <option value="25">Within 25 km</option>
                  <option value="50">Within 50 km</option>
                  <option value="100">Within 100 km</option>
                </select>
              </div>
            </div>

            {/* Options and Sort */}
            <div className="space-y-4">
              {/* Options */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Options</h3>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={onlyOpen}
                      onChange={(e) => setOnlyOpen(e.target.checked)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Open now</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={withOffers}
                      onChange={(e) => setWithOffers(e.target.checked)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Has active offers</span>
                  </label>
                </div>
              </div>

              {/* Sort By */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Sort By</h3>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SearchFilters['sortBy'])}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="relevance">Relevance</option>
                  <option value="distance">Distance</option>
                  <option value="rating">Rating</option>
                  <option value="newest">Newest</option>
                  <option value="popular">Most Popular</option>
                </select>
              </div>
            </div>
          </div>

          {/* Filter Actions */}
          <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
            >
              Clear All
            </button>
            <button
              onClick={handleApplyFilters}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Results */}
      {businesses.length > 0 ? (
        <div>
          {/* Results Grid/List */}
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8'
            : 'space-y-6 mb-8'
          }>
            {businesses.map(business => (
              <div key={business.id} className="relative">
                <BusinessCard
                  business={business}
                  onClick={() => navigate(`/business/${business.id}`)}
                  viewMode={viewMode}
                  showDistance={!!currentLocation}
                  showFavoriteButton={true}
                />
                {/* Favorite Button Overlay */}
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

          {/* Load More */}
          {hasMore && (
            <div className="text-center">
              <button
                onClick={searchMore}
                disabled={isSearching}
                className="px-8 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSearching ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Loading...</span>
                  </div>
                ) : (
                  'Load More Results'
                )}
              </button>
            </div>
          )}
        </div>
      ) : !isSearching && !isLoading ? (
        <div className="text-center py-12">
          <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
          <p className="text-gray-600 mb-6">
            Try adjusting your search terms or filters to find what you're looking for.
          </p>
          <div className="flex justify-center space-x-3">
            <button
              onClick={() => handleSearch('')}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
            >
              Search All
            </button>
            <button
              onClick={handleClearFilters}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
            >
              Clear Filters
            </button>
          </div>
        </div>
      ) : null}

      {/* Loading state for search */}
      {isSearching && (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Searching businesses...</p>
        </div>
      )}
    </div>
  );
};

export default AdvancedSearchPage;