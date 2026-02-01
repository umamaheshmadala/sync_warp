// TrendingCouponsPage.tsx
// Trending coupons component with analytics-driven recommendations and detailed coupon cards

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Flame,
  Clock,
  Users,
  Tag,
  MapPin,
  Star,
  Filter,
  Grid,
  List,
  Share2,
  Heart,
  ExternalLink,
  Calendar,
  Loader2,
  Gift,
  Percent,
  IndianRupee
} from 'lucide-react';
import useAdvancedSearch from '../../hooks/useAdvancedSearch';
import { useAdvancedLocation } from '../../hooks/useAdvancedLocation';
import { CouponSearchResult } from '../../services/advancedSearchService';
import { SimpleSaveButton } from '../favorites/SimpleSaveButton';
import { useBusinessUrl } from '../../hooks/useBusinessUrl';

interface TrendingCouponsPageProps {
  className?: string;
}

const TrendingCouponsPage: React.FC<TrendingCouponsPageProps> = ({ className = '' }) => {
  const navigate = useNavigate();
  const { getBusinessUrl } = useBusinessUrl();
  const {
    getTrendingCoupons,
    isLoading,
    error
  } = useAdvancedSearch();

  const { currentLocation } = useAdvancedLocation();

  // Local state
  const [trendingCoupons, setTrendingCoupons] = useState<CouponSearchResult[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterBy, setFilterBy] = useState<'all' | 'nearby' | 'expiring' | 'high-value'>('all');
  const [sortBy, setSortBy] = useState<'trending' | 'expiry' | 'value' | 'usage'>('trending');

  // Load trending coupons
  useEffect(() => {
    loadTrendingCoupons();
  }, []);

  const loadTrendingCoupons = async () => {
    try {
      const coupons = await getTrendingCoupons(50); // Get more coupons for filtering
      setTrendingCoupons(coupons);
    } catch (error) {
      console.error('Failed to load trending coupons:', error);
    }
  };

  // Filter coupons based on selected filter
  const filteredCoupons = trendingCoupons.filter(coupon => {
    switch (filterBy) {
      case 'nearby':
        // This would require business location data - simplified for now
        return true;
      case 'expiring':
        const expiryDate = new Date(coupon.valid_until);
        const now = new Date();
        const daysUntilExpiry = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
        return daysUntilExpiry <= 7;
      case 'high-value':
        return coupon.discount_type === 'percentage'
          ? coupon.discount_value >= 20
          : coupon.discount_value >= 100;
      default:
        return true;
    }
  });

  // Sort coupons
  const sortedCoupons = [...filteredCoupons].sort((a, b) => {
    switch (sortBy) {
      case 'expiry':
        return new Date(a.valid_until).getTime() - new Date(b.valid_until).getTime();
      case 'value':
        if (a.discount_type === 'percentage' && b.discount_type === 'percentage') {
          return b.discount_value - a.discount_value;
        }
        return b.discount_value - a.discount_value;
      case 'usage':
        return (b.used_count || 0) - (a.used_count || 0);
      case 'trending':
      default:
        return (b.popularity_score || 0) - (a.popularity_score || 0);
    }
  });

  const getDiscountDisplay = (coupon: CouponSearchResult) => {
    switch (coupon.discount_type) {
      case 'percentage':
        return `${coupon.discount_value}% OFF`;
      case 'fixed_amount':
        return `₹${coupon.discount_value} OFF`;
      case 'buy_x_get_y':
        return `Buy ${coupon.discount_value} Get 1 FREE`;
      case 'free_item':
        return 'FREE ITEM';
      default:
        return 'SPECIAL OFFER';
    }
  };

  const getDiscountColor = (coupon: CouponSearchResult) => {
    const value = coupon.discount_value;
    if (coupon.discount_type === 'percentage') {
      if (value >= 50) return 'text-red-600 bg-red-100';
      if (value >= 30) return 'text-orange-600 bg-orange-100';
      if (value >= 20) return 'text-yellow-600 bg-yellow-100';
      return 'text-green-600 bg-green-100';
    }
    if (coupon.discount_type === 'fixed_amount') {
      if (value >= 500) return 'text-red-600 bg-red-100';
      if (value >= 200) return 'text-orange-600 bg-orange-100';
      if (value >= 100) return 'text-yellow-600 bg-yellow-100';
      return 'text-green-600 bg-green-100';
    }
    return 'text-blue-600 bg-blue-100';
  };

  const getDaysUntilExpiry = (validUntil: string) => {
    const expiryDate = new Date(validUntil);
    const now = new Date();
    const diffTime = expiryDate.getTime() - now.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 3600 * 24));
    return diffDays;
  };

  const handleCouponClick = (coupon: CouponSearchResult) => {
    navigate(`/coupon/${coupon.id}`);
  };

  const handleBusinessClick = (businessId: string, businessName?: string) => {
    navigate(getBusinessUrl(businessId, businessName));
  };

  if (isLoading && trendingCoupons.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading trending coupons...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`max-w-7xl mx-auto p-6 ${className}`}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-3 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl text-white">
            <TrendingUp className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Trending Coupons</h1>
            <p className="text-gray-600">
              Discover the hottest deals and most popular offers from local businesses
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center space-x-2">
              <Flame className="w-5 h-5 text-red-500" />
              <div>
                <div className="text-sm text-gray-600">Hot Deals</div>
                <div className="font-semibold text-gray-900">{sortedCoupons.length}</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-orange-500" />
              <div>
                <div className="text-sm text-gray-600">Expiring Soon</div>
                <div className="font-semibold text-gray-900">
                  {trendingCoupons.filter(c => getDaysUntilExpiry(c.valid_until) <= 7).length}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center space-x-2">
              <Percent className="w-5 h-5 text-green-500" />
              <div>
                <div className="text-sm text-gray-600">High Value</div>
                <div className="font-semibold text-gray-900">
                  {trendingCoupons.filter(c =>
                    c.discount_type === 'percentage' ? c.discount_value >= 20 : c.discount_value >= 100
                  ).length}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-500" />
              <div>
                <div className="text-sm text-gray-600">Total Uses</div>
                <div className="font-semibold text-gray-900">
                  {trendingCoupons.reduce((acc, c) => acc + (c.used_count || 0), 0)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div className="flex items-center space-x-4">
          {/* Filter Buttons */}
          <div className="flex border border-gray-200 rounded-lg overflow-hidden">
            {[
              { id: 'all', label: 'All', icon: null },
              { id: 'nearby', label: 'Nearby', icon: <MapPin className="w-4 h-4" /> },
              { id: 'expiring', label: 'Expiring', icon: <Clock className="w-4 h-4" /> },
              { id: 'high-value', label: 'High Value', icon: <Tag className="w-4 h-4" /> }
            ].map(filter => (
              <button
                key={filter.id}
                onClick={() => setFilterBy(filter.id as any)}
                className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium ${filterBy === filter.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                  } border-r border-gray-200 last:border-r-0`}
              >
                {filter.icon}
                <span>{filter.label}</span>
              </button>
            ))}
          </div>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="trending">Most Trending</option>
            <option value="expiry">Expiring Soon</option>
            <option value="value">Highest Value</option>
            <option value="usage">Most Used</option>
          </select>
        </div>

        <div className="flex items-center space-x-3">
          {/* Results count */}
          <span className="text-sm text-gray-600">
            {sortedCoupons.length} coupon{sortedCoupons.length !== 1 ? 's' : ''} found
          </span>

          {/* View mode toggle */}
          <div className="flex border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:text-gray-600'
                }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 border-l border-gray-200 ${viewMode === 'list' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:text-gray-600'
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

      {/* Coupons Grid */}
      {sortedCoupons.length > 0 ? (
        <div className={viewMode === 'grid'
          ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'
          : 'space-y-6'
        }>
          {sortedCoupons.map((coupon, index) => {
            const daysLeft = getDaysUntilExpiry(coupon.valid_until);

            return (
              <div
                key={coupon.id}
                className={`group relative bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 ${viewMode === 'list' ? 'flex' : ''
                  }`}
              >
                {/* Trending Badge */}
                {index < 3 && (
                  <div className="absolute top-3 left-3 z-10 flex items-center space-x-1 px-2 py-1 bg-red-500 text-white text-xs rounded-full font-medium">
                    <Flame className="w-3 h-3" />
                    <span>#{index + 1} Trending</span>
                  </div>
                )}

                {/* Favorite Button */}
                <div className="absolute top-3 right-3 z-10">
                  <SimpleSaveButton
                    itemId={coupon.id}
                    itemType="coupon"
                    itemData={coupon}
                    size="sm"
                  />
                </div>

                {/* Business Logo/Header */}
                <div className="p-6 pb-4">
                  <div className="flex items-center space-x-3 mb-4">
                    {coupon.business_logo && (
                      <img
                        src={coupon.business_logo}
                        alt={coupon.business_name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 group-hover:text-indigo-900 transition-colors">
                        {coupon.business_name}
                      </h3>
                      <p className="text-sm text-gray-600">{coupon.title}</p>
                    </div>
                  </div>

                  {/* Discount Display */}
                  <div className={`inline-flex items-center px-4 py-2 rounded-lg text-lg font-bold mb-4 ${getDiscountColor(coupon)}`}>
                    {getDiscountDisplay(coupon)}
                  </div>

                  {/* Description */}
                  <p className="text-gray-700 text-sm mb-4 line-clamp-2">
                    {coupon.description}
                  </p>

                  {/* Coupon Details */}
                  <div className="space-y-2 mb-4">
                    {coupon.minimum_order_value && (
                      <div className="flex items-center text-sm text-gray-600">
                        <IndianRupee className="w-4 h-4 mr-2" />
                        <span>Min. order: ₹{coupon.minimum_order_value}</span>
                      </div>
                    )}

                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span>
                        Valid until {new Date(coupon.valid_until).toLocaleDateString()}
                        {daysLeft <= 7 && (
                          <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">
                            {daysLeft === 0 ? 'Expires today' : `${daysLeft} days left`}
                          </span>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center text-sm text-gray-600">
                      <Users className="w-4 h-4 mr-2" />
                      <span>
                        {coupon.usage_limit - (coupon.used_count || 0)} uses remaining
                      </span>
                    </div>

                    {/* Popularity indicator */}
                    <div className="flex items-center text-sm text-gray-600">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      <span>{coupon.used_count || 0} people used this</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="px-6 pb-6 pt-0">
                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleCouponClick(coupon)}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 font-medium transition-colors"
                    >
                      Get Coupon
                    </button>
                    <button
                      onClick={() => handleBusinessClick(coupon.business_id)}
                      className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                    <button
                      className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                      onClick={() => navigator.share?.({
                        title: coupon.title,
                        text: `Check out this deal: ${getDiscountDisplay(coupon)} at ${coupon.business_name}`,
                        url: window.location.href
                      })}
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Gradient overlay for visual appeal */}
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              </div>
            );
          })}
        </div>
      ) : !isLoading ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-red-500 to-pink-600 rounded-full flex items-center justify-center text-white">
            <TrendingUp className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No trending coupons found</h3>
          <p className="text-gray-600 mb-6">
            {filterBy !== 'all'
              ? 'Try adjusting your filters to see more coupons'
              : 'Check back later for new trending deals'
            }
          </p>
          <div className="flex justify-center space-x-3">
            <button
              onClick={() => setFilterBy('all')}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
            >
              Show All Coupons
            </button>
            <button
              onClick={() => navigate('/discovery')}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
            >
              Discover Businesses
            </button>
          </div>
        </div>
      ) : null}

      {/* Loading state */}
      {isLoading && (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading more coupons...</p>
        </div>
      )}

      {/* Call to Action */}
      {sortedCoupons.length > 0 && (
        <div className="mt-16 text-center py-12 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl">
          <Gift className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Want more personalized deals?</h3>
          <p className="text-gray-600 mb-8">Explore businesses and add them to your favorites for tailored recommendations</p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => navigate('/discovery')}
              className="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
            >
              Discover Businesses
            </button>
            <button
              onClick={() => navigate('/favorites')}
              className="px-8 py-3 border border-indigo-300 text-indigo-600 rounded-lg hover:bg-indigo-50 font-medium"
            >
              Manage Favorites
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrendingCouponsPage;