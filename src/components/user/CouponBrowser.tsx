import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  X,
  SlidersHorizontal,
  RefreshCcw,
  Gift
} from 'lucide-react';
import { UnifiedCouponCard } from '../common/UnifiedCouponCard';
import { 
  Coupon, 
  CouponCategory, 
  CouponType,
  CollectionSource 
} from '../../types/coupon';
import { useCoupons, usePublicCoupons } from '../../hooks/useCoupons';
import { couponService } from '../../services/couponService';
import { toast } from 'react-hot-toast';

interface CouponBrowserProps {
  userId: string;
  userLocation?: { latitude: number; longitude: number };
  onCouponSelect?: (coupon: Coupon) => void;
  className?: string;
}

interface FilterOptions {
  categories: CouponCategory[];
  types: CouponType[];
  minDiscount: number;
  maxDistance: number;
  isActive: boolean;
  hasStock: boolean;
  businessName: string;
  sortBy: 'popular' | 'newest' | 'expiring' | 'discount' | 'distance';
}

interface CouponCardProps {
  coupon: Coupon;
  isCollected: boolean;
  onCollect: (couponId: string) => void;
  onView: (coupon: Coupon) => void;
  distance?: number;
  isLoading?: boolean;
}

const CouponBrowser: React.FC<CouponBrowserProps> = ({
  userId,
  userLocation,
  onCouponSelect,
  className = ''
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CouponCategory | 'all'>('all');
  const [collectedCoupons, setCollectedCoupons] = useState<Set<string>>(new Set());
  const [loadingCollect, setLoadingCollect] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [refreshing, setRefreshing] = useState(false);

  const [filters, setFilters] = useState<FilterOptions>({
    categories: [],
    types: [],
    minDiscount: 0,
    maxDistance: 10, // km
    isActive: true,
    hasStock: true,
    businessName: '',
    sortBy: 'popular'
  });

  const { collectCoupon, getUserCollectedCoupons } = useCoupons();
  const { coupons, loading, fetchPublicCoupons } = usePublicCoupons();

  useEffect(() => {
    if (!userId) return;
    
    const loadData = async () => {
      try {
        await Promise.all([
          fetchPublicCoupons(),
          loadUserCollectedCoupons()
        ]);
      } catch (error) {
        console.error('Load error:', error);
        toast.error('Failed to load coupons');
      }
    };
    loadData();
  }, [userId]);

  // Load user's collected coupons
  const loadUserCollectedCoupons = async () => {
    try {
      const collected = await getUserCollectedCoupons(userId);
      setCollectedCoupons(new Set(collected.map(c => c.coupon_id)));
    } catch (error) {
      console.error('Error loading collected coupons:', error);
    }
  };

  const handleCollectCoupon = useCallback(async (couponId: string) => {
    if (collectedCoupons.has(couponId)) {
      toast.info('Already collected');
      return;
    }

    setLoadingCollect(prev => new Set([...prev, couponId]));
    
    try {
      await collectCoupon(couponId, userId, 'direct_search' as CollectionSource);
      setCollectedCoupons(prev => new Set([...prev, couponId]));
      toast.success('Added to wallet');
    } catch (error) {
      toast.error('Collection failed');
      console.error(error);
    } finally {
      setLoadingCollect(prev => {
        const newSet = new Set(prev);
        newSet.delete(couponId);
        return newSet;
      });
    }
  }, [collectCoupon, userId, collectedCoupons]);

  // Calculate distance between user and business
  const calculateDistance = (businessLat: number, businessLng: number): number => {
    if (!userLocation) return 0;
    
    const R = 6371; // Earth's radius in km
    const dLat = (businessLat - userLocation.latitude) * Math.PI / 180;
    const dLon = (businessLng - userLocation.longitude) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(userLocation.latitude * Math.PI / 180) * Math.cos(businessLat * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const filteredCoupons = useMemo(() => {
    if (!coupons?.length) return [];
    
    const now = Date.now();
    
    return coupons
      .filter(coupon => {
        // Early returns for better performance
        if (filters.isActive && coupon.status !== 'active') return false;
        if (selectedCategory !== 'all' && coupon.category !== selectedCategory) return false;
        const expiryDate = coupon.valid_until || coupon.expires_at;
        if (expiryDate && new Date(expiryDate).getTime() < now) return false;
        if (filters.hasStock && coupon.total_limit && coupon.usage_count >= coupon.total_limit) return false;
        
        // Text search
        if (searchTerm) {
          const query = searchTerm.toLowerCase();
          if (!coupon.title.toLowerCase().includes(query) &&
              !coupon.description?.toLowerCase().includes(query) &&
              !coupon.business_name.toLowerCase().includes(query)) {
            return false;
          }
        }
        
        // Business filter
        if (filters.businessName) {
          const business = filters.businessName.toLowerCase();
          if (!coupon.business_name.toLowerCase().includes(business)) return false;
        }
        
        // Discount filter
        if (filters.minDiscount > 0) {
          const discountValue = coupon.discount_type === 'percentage' ? 
            (coupon.discount_value / 100) * (coupon.min_purchase_amount || 1000) : 
            coupon.discount_value;
          if (discountValue < filters.minDiscount) return false;
        }
        
        return true;
      })

      .sort((a, b) => {
        switch (filters.sortBy) {
          case 'newest':
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          case 'expiring':
            const aExpiry = a.valid_until || a.expires_at;
            const bExpiry = b.valid_until || b.expires_at;
            if (!aExpiry) return 1;
            if (!bExpiry) return -1;
            return new Date(aExpiry).getTime() - new Date(bExpiry).getTime();
          case 'discount':
            return (b.discount_value || 0) - (a.discount_value || 0);
          case 'distance':
            if (!userLocation) return 0;
            const aDistance = calculateDistance(a.business_latitude || 0, a.business_longitude || 0);
            const bDistance = calculateDistance(b.business_latitude || 0, b.business_longitude || 0);
            return aDistance - bDistance;
          default: // popular
            return (b.collection_count || 0) - (a.collection_count || 0);
        }
      });
  }, [coupons, searchTerm, selectedCategory, filters, userLocation]);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchPublicCoupons(),
      loadUserCollectedCoupons()
    ]);
    setRefreshing(false);
    toast.success('Coupons refreshed!');
  };

  // Format discount display
  const formatDiscount = (coupon: Coupon): string => {
    if (coupon.discount_type === 'percentage') {
      return `${coupon.discount_value}% OFF`;
    }
    return `₹${coupon.discount_value} OFF`;
  };

  // Calculate savings
  const calculateSavings = (coupon: Coupon): string => {
    if (coupon.discount_type === 'percentage' && coupon.min_purchase_amount) {
      const maxSaving = (coupon.discount_value / 100) * coupon.min_purchase_amount;
      return `Save up to ₹${Math.round(maxSaving)}`;
    }
    return `Save ₹${coupon.discount_value}`;
  };

  // Get category color
  const getCategoryColor = (category: CouponCategory): string => {
    const colors = {
      food: 'bg-orange-100 text-orange-800',
      shopping: 'bg-purple-100 text-purple-800',
      entertainment: 'bg-pink-100 text-pink-800',
      travel: 'bg-blue-100 text-blue-800',
      health: 'bg-green-100 text-green-800',
      education: 'bg-indigo-100 text-indigo-800',
      services: 'bg-gray-100 text-gray-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const CouponCard: React.FC<CouponCardProps> = ({ 
    coupon, 
    isCollected, 
    onCollect, 
    onView, 
    distance, 
    isLoading 
  }) => {
    const expiryDate = coupon.valid_until || coupon.expires_at;
    const isExpired = expiryDate && new Date(expiryDate).getTime() < Date.now();

    // Debug: Log coupon data in CouponBrowser
    console.log('🌟 [CouponBrowser.CouponCard] Coupon data:', {
      id: coupon.id,
      title: coupon.title,
      business_name: coupon.business_name,
      business: coupon.business,
      full_coupon: coupon
    });

    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
      >
        <UnifiedCouponCard
          coupon={{
            id: coupon.id,
            title: coupon.title,
            description: coupon.description,
            discount_type: coupon.discount_type,
            discount_value: coupon.discount_value,
            expires_at: coupon.valid_until || coupon.expires_at,
            business_name: coupon.business_name || coupon.business?.business_name,
            business: coupon.business,
            isCollected: isCollected
          }}
          onClick={() => onView(coupon)}
          isExpired={isExpired || false}
        />
      </motion.div>
    );
  };

  return (
    <div className={`bg-gray-50 min-h-screen ${className}`}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Gift className="w-7 h-7 text-blue-600" />
              Discover Coupons
            </h1>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCcw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <SlidersHorizontal className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search coupons, businesses, categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-3 border rounded-lg transition-colors flex items-center gap-2 ${
                  showFilters 
                    ? 'border-blue-500 bg-blue-50 text-blue-700' 
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Filter className="w-4 h-4" />
                Filters
                {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {/* Category Quick Filters */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                All
              </button>
              {['food', 'shopping', 'entertainment', 'travel', 'health', 'education', 'services'].map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category as CouponCategory)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === category
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              ))}
            </div>

            {/* Advanced Filters */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-white border border-gray-200 rounded-lg p-4 space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                      <select
                        value={filters.sortBy}
                        onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      >
                        <option value="popular">Most Popular</option>
                        <option value="newest">Newest</option>
                        <option value="expiring">Expiring Soon</option>
                        <option value="discount">Highest Discount</option>
                        {userLocation && <option value="distance">Nearest</option>}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Min Discount (₹)</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={filters.minDiscount || ''}
                        onChange={(e) => setFilters(prev => ({ ...prev, minDiscount: Number(e.target.value) || 0 }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Business Name</label>
                      <input
                        type="text"
                        placeholder="Search businesses..."
                        value={filters.businessName}
                        onChange={(e) => setFilters(prev => ({ ...prev, businessName: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>

                    {userLocation && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Max Distance (km)</label>
                        <input
                          type="number"
                          placeholder="10"
                          value={filters.maxDistance || ''}
                          onChange={(e) => setFilters(prev => ({ ...prev, maxDistance: Number(e.target.value) || 10 }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={filters.isActive}
                          onChange={(e) => setFilters(prev => ({ ...prev, isActive: e.target.checked }))}
                          className="rounded border-gray-300 text-blue-600 mr-2"
                        />
                        <span className="text-sm text-gray-700">Active only</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={filters.hasStock}
                          onChange={(e) => setFilters(prev => ({ ...prev, hasStock: e.target.checked }))}
                          className="rounded border-gray-300 text-blue-600 mr-2"
                        />
                        <span className="text-sm text-gray-700">Available</span>
                      </label>
                    </div>
                    <button
                      onClick={() => setFilters({
                        categories: [],
                        types: [],
                        minDiscount: 0,
                        maxDistance: 10,
                        isActive: true,
                        hasStock: true,
                        businessName: '',
                        sortBy: 'popular'
                      })}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Reset Filters
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Results Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {filteredCoupons.length} Coupons Found
            </h2>
            {searchTerm && (
              <p className="text-sm text-gray-600">
                Results for "{searchTerm}"
              </p>
            )}
          </div>
          
          {collectedCoupons.size > 0 && (
            <div className="text-sm text-green-600 font-medium">
              {collectedCoupons.size} coupons in your wallet
            </div>
          )}
        </div>

        {/* Coupons Grid/List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredCoupons.length > 0 ? (
          <motion.div
            layout
            className={`grid gap-6 ${
              viewMode === 'grid' 
                ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
                : 'grid-cols-1'
            }`}
          >
            <AnimatePresence>
              {filteredCoupons.map((coupon) => (
                <CouponCard
                  key={coupon.id}
                  coupon={coupon}
                  isCollected={collectedCoupons.has(coupon.id)}
                  onCollect={handleCollectCoupon}
                  onView={(coupon) => onCouponSelect?.(coupon)}
                  distance={userLocation ? calculateDistance(
                    coupon.business_latitude || 0, 
                    coupon.business_longitude || 0
                  ) : undefined}
                  isLoading={loadingCollect.has(coupon.id)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <div className="text-center py-12">
            <Gift className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Coupons Found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || selectedCategory !== 'all' ? 
                'Try adjusting your search or filters' : 
                'No active coupons are available right now'
              }
            </p>
            {(searchTerm || selectedCategory !== 'all' || Object.values(filters).some(v => 
              typeof v === 'string' ? v !== '' : 
              typeof v === 'number' ? v > 0 : 
              typeof v === 'boolean' ? !v : 
              Array.isArray(v) ? v.length > 0 : false
            )) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('all');
                  setFilters({
                    categories: [],
                    types: [],
                    minDiscount: 0,
                    maxDistance: 10,
                    isActive: true,
                    hasStock: true,
                    businessName: '',
                    sortBy: 'popular'
                  });
                }}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CouponBrowser;