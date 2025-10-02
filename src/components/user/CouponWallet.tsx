import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  Search,
  Filter,
  Clock,
  Star,
  MapPin,
  Share2,
  Gift,
  QrCode,
  Trash2,
  Eye,
  ShoppingBag,
  Calendar,
  Zap,
  AlertTriangle,
  CheckCircle,
  X,
  ChevronDown,
  ChevronUp,
  Store,
  Tag,
  Percent,
  Users,
  RefreshCcw,
  SortAsc,
  Heart,
  ExternalLink
} from 'lucide-react';
import { 
  UserCouponCollection,
  Coupon, 
  CouponCategory,
  CouponRedemption
} from '../../types/coupon';
import { useUserCoupons } from '../../hooks/useCoupons';
import { couponService } from '../../services/couponService';
import { useSharingLimits } from '../../hooks/useSharingLimits';
import ShareCouponModal from '../Sharing/ShareCouponModal';
import { toast } from 'react-hot-toast';

interface CouponWalletProps {
  userId: string;
  onCouponRedeem?: (coupon: Coupon) => void;
  onCouponSelect?: (coupon: Coupon) => void;
  className?: string;
}

interface WalletFilters {
  category: CouponCategory | 'all';
  status: 'all' | 'active' | 'expiring' | 'expired' | 'redeemed';
  acquisition: 'all' | 'collected' | 'shared_received' | 'shareable';
  sortBy: 'added' | 'expiry' | 'value' | 'business';
  businessName: string;
}

interface CouponWalletCardProps {
  collection: UserCouponCollection;
  coupon: Coupon;
  onRedeem: (couponId: string) => void;
  onRemove: (collectionId: string) => void;
  onView: (coupon: Coupon) => void;
  onShare: (couponId: string, collectionId: string) => void;
  isLoading?: boolean;
  isShareable?: boolean;
}

const CouponWallet: React.FC<CouponWalletProps> = ({
  userId,
  onCouponRedeem,
  onCouponSelect,
  className = ''
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [collectedCoupons, setCollectedCoupons] = useState<UserCouponCollection[]>([]);
  const [redemptions, setRedemptions] = useState<CouponRedemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingActions, setLoadingActions] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [filters, setFilters] = useState<WalletFilters>({
    category: 'all',
    status: 'all',
    acquisition: 'all',
    sortBy: 'added',
    businessName: ''
  });

  const { getUserCollectedCoupons, redeemCoupon, removeCouponCollection } = useUserCoupons();
  
  // Sharing limits integration
  const {
    stats: sharingStats,
    limits: sharingLimits,
    loading: sharingLoading,
    canShareMore,
    refreshStats: refreshSharingStats
  } = useSharingLimits();
  
  // State for share modal
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedCouponForShare, setSelectedCouponForShare] = useState<{
    couponId: string;
    collectionId: string;
    coupon: Coupon;
  } | null>(null);

  // Load user's wallet data
  useEffect(() => {
    loadWalletData();
  }, [userId]);

  const loadWalletData = async () => {
    try {
      setLoading(true);
      const [collections, userRedemptions] = await Promise.all([
        getUserCollectedCoupons(userId),
        couponService.getUserRedemptions(userId)
      ]);
      setCollectedCoupons(collections);
      setRedemptions(userRedemptions);
    } catch (error) {
      console.error('Error loading wallet data:', error);
      toast.error('Failed to load your coupons');
    } finally {
      setLoading(false);
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadWalletData();
    setRefreshing(false);
    toast.success('Wallet refreshed!');
  };

  // Handle coupon redemption
  const handleRedeemCoupon = async (couponId: string) => {
    const collection = collectedCoupons.find(c => c.coupon_id === couponId);
    if (!collection) return;

    setLoadingActions(prev => new Set([...prev, couponId]));
    
    try {
      await redeemCoupon(couponId, userId, collection.business_id);
      await loadWalletData(); // Refresh data
      toast.success('Coupon redeemed successfully!');
      onCouponRedeem?.(collection.coupon);
    } catch (error) {
      console.error('Error redeeming coupon:', error);
      toast.error('Failed to redeem coupon');
    } finally {
      setLoadingActions(prev => {
        const newSet = new Set(prev);
        newSet.delete(couponId);
        return newSet;
      });
    }
  };

  // Handle coupon removal
  const handleRemoveCoupon = async (collectionId: string) => {
    setLoadingActions(prev => new Set([...prev, collectionId]));
    
    try {
      await removeCouponCollection(collectionId);
      setCollectedCoupons(prev => prev.filter(c => c.id !== collectionId));
      toast.success('Coupon removed from wallet');
    } catch (error) {
      console.error('Error removing coupon:', error);
      toast.error('Failed to remove coupon');
    } finally {
      setLoadingActions(prev => {
        const newSet = new Set(prev);
        newSet.delete(collectionId);
        return newSet;
      });
    }
  };
  
  // Handle coupon sharing
  const handleShareCoupon = (couponId: string, collectionId: string) => {
    const collection = collectedCoupons.find(c => c.id === collectionId);
    if (!collection) return;
    
    // Check if user can share more
    if (!canShareMore) {
      toast.error('You have reached your daily sharing limit');
      return;
    }
    
    // Open share modal with coupon details
    setSelectedCouponForShare({
      couponId,
      collectionId,
      coupon: collection.coupon
    });
    setShowShareModal(true);
  };

  // Get coupon status
  const getCouponStatus = (coupon: Coupon, collection: UserCouponCollection) => {
    const isRedeemed = redemptions.some(r => r.coupon_id === coupon.id);
    if (isRedeemed) return 'redeemed';
    
    if (coupon.expires_at) {
      const now = new Date();
      const expiryDate = new Date(coupon.expires_at);
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry < 0) return 'expired';
      if (daysUntilExpiry <= 3) return 'expiring';
    }
    
    if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) return 'expired';
    if (coupon.status !== 'active') return 'expired';
    
    return 'active';
  };
  
  // Check if coupon is shareable
  const isCouponShareable = (collection: any) => {
    // Check if collection has sharing-related fields
    const isShareable = collection.is_shareable !== false;
    const hasBeenShared = collection.has_been_shared === true;
    const isActive = getCouponStatus(collection.coupon, collection) === 'active';
    
    return isShareable && !hasBeenShared && isActive;
  };

  // Filter and sort coupons
  const filteredCoupons = useMemo(() => {
    let filtered = collectedCoupons.filter(collection => {
      const coupon = collection.coupon;
      const status = getCouponStatus(coupon, collection);

      // Search filter
      if (searchTerm && 
          !coupon.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !coupon.description?.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !coupon.business_name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      // Category filter
      if (filters.category !== 'all' && coupon.category !== filters.category) {
        return false;
      }

      // Status filter
      if (filters.status !== 'all' && status !== filters.status) {
        return false;
      }
      
      // Acquisition filter
      if (filters.acquisition !== 'all') {
        if (filters.acquisition === 'shareable') {
          if (!isCouponShareable(collection)) return false;
        } else {
          const acquisitionMethod = (collection as any).acquisition_method || 'collected';
          if (acquisitionMethod !== filters.acquisition) return false;
        }
      }

      // Business name filter
      if (filters.businessName && 
          !coupon.business_name.toLowerCase().includes(filters.businessName.toLowerCase())) {
        return false;
      }

      return true;
    });

    // Sort coupons
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'expiry':
          if (!a.coupon.expires_at && !b.coupon.expires_at) return 0;
          if (!a.coupon.expires_at) return 1;
          if (!b.coupon.expires_at) return -1;
          return new Date(a.coupon.expires_at).getTime() - new Date(b.coupon.expires_at).getTime();
        case 'value':
          const aValue = a.coupon.type === 'percentage' ? a.coupon.value : a.coupon.value;
          const bValue = b.coupon.type === 'percentage' ? b.coupon.value : b.coupon.value;
          return bValue - aValue;
        case 'business':
          return a.coupon.business_name.localeCompare(b.coupon.business_name);
        case 'added':
        default:
          return new Date(b.collected_at).getTime() - new Date(a.collected_at).getTime();
      }
    });

    return filtered;
  }, [collectedCoupons, searchTerm, filters, redemptions]);

  // Get wallet statistics
  const walletStats = useMemo(() => {
    const total = collectedCoupons.length;
    const active = collectedCoupons.filter(c => getCouponStatus(c.coupon, c) === 'active').length;
    const expiring = collectedCoupons.filter(c => getCouponStatus(c.coupon, c) === 'expiring').length;
    const expired = collectedCoupons.filter(c => getCouponStatus(c.coupon, c) === 'expired').length;
    const redeemed = collectedCoupons.filter(c => getCouponStatus(c.coupon, c) === 'redeemed').length;
    const shareable = collectedCoupons.filter(c => isCouponShareable(c)).length;
    const shared = collectedCoupons.filter(c => (c as any).acquisition_method === 'shared_received').length;
    
    const totalSavingsPotential = collectedCoupons
      .filter(c => getCouponStatus(c.coupon, c) === 'active')
      .reduce((sum, c) => {
        const coupon = c.coupon;
        if (coupon.type === 'percentage' && coupon.minimum_purchase) {
          return sum + (coupon.value / 100) * coupon.minimum_purchase;
        }
        return sum + coupon.value;
      }, 0);

    return { total, active, expiring, expired, redeemed, shareable, shared, totalSavingsPotential };
  }, [collectedCoupons, redemptions]);

  // Format discount display
  const formatDiscount = (coupon: Coupon): string => {
    if (coupon.type === 'percentage') {
      return `${coupon.value}% OFF`;
    }
    return `₹${coupon.value} OFF`;
  };

  // Get status color
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'expiring': return 'bg-yellow-100 text-yellow-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'redeemed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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

  const CouponWalletCard: React.FC<CouponWalletCardProps> = ({
    collection,
    coupon,
    onRedeem,
    onRemove,
    onView,
    onShare,
    isLoading,
    isShareable = false
  }) => {
    const status = getCouponStatus(coupon, collection);
    const isRedeemed = redemptions.some(r => r.coupon_id === coupon.id);
    const daysUntilExpiry = coupon.expires_at ? 
      Math.ceil((new Date(coupon.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        whileHover={{ y: -2 }}
        className={`bg-white rounded-xl border-2 overflow-hidden transition-all duration-300 cursor-pointer w-full max-w-full ${
          status === 'expired' || isRedeemed 
            ? 'border-gray-200 opacity-75' 
            : status === 'expiring'
            ? 'border-yellow-300 shadow-md'
            : 'border-gray-200 hover:border-blue-300 hover:shadow-lg'
        }`}
        onClick={() => onView(coupon)}
      >
        {/* Header */}
        <div className="relative">
          {coupon.image_url && (
            <img
              src={coupon.image_url}
              alt={coupon.title}
              className={`w-full h-32 object-cover ${
                status === 'expired' || isRedeemed ? 'grayscale' : ''
              }`}
            />
          )}
          
          {/* Status and Category Badges */}
          <div className="absolute top-3 left-3 flex items-center space-x-2">
            {coupon.category && (
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(coupon.category)}`}>
                {coupon.category.toUpperCase()}
              </span>
            )}
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
              {status.toUpperCase()}
            </span>
          </div>

          {/* Discount Badge */}
          <div className="absolute -bottom-4 left-4">
            <div className={`px-4 py-2 rounded-lg font-bold text-lg shadow-lg ${
              status === 'expired' || isRedeemed 
                ? 'bg-gray-400 text-gray-600'
                : 'bg-gradient-to-r from-red-500 to-pink-500 text-white'
            }`}>
              {formatDiscount(coupon)}
            </div>
          </div>

          {/* Expiry Warning */}
          {status === 'expiring' && (
            <div className="absolute top-3 right-3 bg-yellow-500 text-white p-2 rounded-full">
              <AlertTriangle className="w-4 h-4" />
            </div>
          )}

          {/* Redeemed Check */}
          {isRedeemed && (
            <div className="absolute top-3 right-3 bg-green-500 text-white p-2 rounded-full">
              <CheckCircle className="w-4 h-4" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 pt-8 w-full overflow-hidden">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-gray-900 text-lg leading-tight flex-1 min-w-0 truncate">{coupon.title}</h3>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(collection.id);
              }}
              className="text-gray-400 hover:text-red-500 transition-colors ml-2"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          
          <p className="text-sm text-gray-600 mb-3 line-clamp-2 break-words">{coupon.description}</p>

          {/* Business Info */}
          <div className="flex items-center text-sm text-gray-500 mb-3 min-w-0">
            <Store className="w-4 h-4 mr-1 flex-shrink-0" />
            <span className="truncate">{coupon.business_name}</span>
            {coupon.business_rating && (
              <>
                <div className="mx-2 w-1 h-1 bg-gray-300 rounded-full" />
                <Star className="w-4 h-4 mr-1 text-yellow-500" />
                <span>{coupon.business_rating}</span>
              </>
            )}
          </div>

          {/* Terms & Conditions */}
          <div className="space-y-2 mb-4">
            {coupon.minimum_purchase && (
              <div className="text-xs text-gray-500">
                Min. purchase: ₹{coupon.minimum_purchase}
              </div>
            )}
            {coupon.maximum_discount && coupon.type === 'percentage' && (
              <div className="text-xs text-gray-500">
                Max. discount: ₹{coupon.maximum_discount}
              </div>
            )}
            {coupon.usage_limit && (
              <div className="text-xs text-gray-500">
                {coupon.usage_limit - (coupon.used_count || 0)} uses remaining
              </div>
            )}
          </div>

          {/* Collection & Expiry Info */}
          <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
            <div className="flex items-center">
              <Calendar className="w-3 h-3 mr-1" />
              Added {new Date(collection.collected_at).toLocaleDateString()}
            </div>
            <div className="flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              {daysUntilExpiry !== null ? (
                daysUntilExpiry > 0 ? (
                  `${daysUntilExpiry} days left`
                ) : (
                  <span className="text-red-500 font-medium">Expired</span>
                )
              ) : (
                'No expiry'
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2 w-full">
            {!isRedeemed && status === 'active' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRedeem(coupon.id);
                }}
                disabled={isLoading}
                className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg font-medium hover:from-green-600 hover:to-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Redeeming...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <ShoppingBag className="w-4 h-4 mr-2" />
                    Redeem Now
                  </div>
                )}
              </button>
            )}
            
            {/* Share button - only show if shareable */}
            {isShareable && !isRedeemed && status === 'active' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onShare(coupon.id, collection.id);
                }}
                className="px-3 py-2 bg-blue-50 border border-blue-300 rounded-lg text-blue-600 hover:bg-blue-100 transition-colors flex items-center gap-1"
                title="Share with a friend"
              >
                <Gift className="w-4 h-4" />
                <span className="text-xs font-medium">Share</span>
              </button>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                onView(coupon);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>

          {/* Redemption Info */}
          {isRedeemed && (
            <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center text-sm text-green-700">
                <CheckCircle className="w-4 h-4 mr-2" />
                <span>Redeemed successfully</span>
              </div>
            </div>
          )}
        </div>
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
              <Wallet className="w-7 h-7 text-blue-600" />
              My Coupon Wallet
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
                <SortAsc className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Wallet Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
            <div className="bg-blue-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600">{walletStats.total}</div>
              <div className="text-xs text-blue-600">Total</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">{walletStats.active}</div>
              <div className="text-xs text-green-600">Active</div>
            </div>
            <div className="bg-yellow-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-yellow-600">{walletStats.expiring}</div>
              <div className="text-xs text-yellow-600">Expiring</div>
            </div>
            <div className="bg-red-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-600">{walletStats.expired}</div>
              <div className="text-xs text-red-600">Expired</div>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600">{walletStats.shareable}</div>
              <div className="text-xs text-blue-600">Can Share</div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg text-center">
              <div className="text-xl font-bold text-purple-600">₹{Math.round(walletStats.totalSavingsPotential)}</div>
              <div className="text-xs text-purple-600">Potential Savings</div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search your coupons..."
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

            {/* Quick Filters */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-2">
              {/* Status Filters */}
              {['all', 'active', 'expiring', 'expired', 'redeemed'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilters(prev => ({ ...prev, status: status as any }))}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    filters.status === status
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                  {status !== 'all' && (
                    <span className="ml-1 text-xs">
                      ({status === 'active' ? walletStats.active : 
                        status === 'expiring' ? walletStats.expiring :
                        status === 'expired' ? walletStats.expired :
                        status === 'redeemed' ? walletStats.redeemed : 0})
                    </span>
                  )}
                </button>
              ))}
              
              {/* Acquisition Filters */}
              <div className="w-px h-8 bg-gray-300" />
              {['shareable', 'collected', 'shared_received'].map((acquisition) => (
                <button
                  key={acquisition}
                  onClick={() => setFilters(prev => ({ ...prev, acquisition: acquisition as any }))}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    filters.acquisition === acquisition
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {acquisition === 'shareable' ? '🎁 Can Share' : 
                   acquisition === 'collected' ? '📥 Collected' : '🤝 Received'}
                  <span className="ml-1 text-xs">
                    ({acquisition === 'shareable' ? walletStats.shareable : 
                      acquisition === 'shared_received' ? walletStats.shared : 
                      collectedCoupons.filter(c => (c as any).acquisition_method === 'collected').length})
                  </span>
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                      <select
                        value={filters.category}
                        onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value as any }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      >
                        <option value="all">All Categories</option>
                        <option value="food">Food</option>
                        <option value="shopping">Shopping</option>
                        <option value="entertainment">Entertainment</option>
                        <option value="travel">Travel</option>
                        <option value="health">Health</option>
                        <option value="education">Education</option>
                        <option value="services">Services</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                      <select
                        value={filters.sortBy}
                        onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      >
                        <option value="added">Recently Added</option>
                        <option value="expiry">Expiring Soon</option>
                        <option value="value">Highest Value</option>
                        <option value="business">Business Name</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Business Name</label>
                      <input
                        type="text"
                        placeholder="Filter by business..."
                        value={filters.businessName}
                        onChange={(e) => setFilters(prev => ({ ...prev, businessName: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => setFilters({
                        category: 'all',
                        status: 'all',
                        acquisition: 'all',
                        sortBy: 'added',
                        businessName: ''
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

      {/* Wallet Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Results Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {filteredCoupons.length} Coupons in Wallet
            </h2>
            {searchTerm && (
              <p className="text-sm text-gray-600">
                Results for "{searchTerm}"
              </p>
            )}
          </div>
        </div>

        {/* Coupons Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredCoupons.length > 0 ? (
          <motion.div
            layout
            className={`grid gap-6 w-full ${
              viewMode === 'grid' 
                ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 auto-rows-fr' 
                : 'grid-cols-1'
            }`}
          >
            <AnimatePresence>
              {filteredCoupons.map((collection) => (
                <CouponWalletCard
                  key={collection.id}
                  collection={collection}
                  coupon={collection.coupon}
                  onRedeem={handleRedeemCoupon}
                  onRemove={handleRemoveCoupon}
                  onView={(coupon) => onCouponSelect?.(coupon)}
                  onShare={handleShareCoupon}
                  isLoading={loadingActions.has(collection.coupon_id)}
                  isShareable={isCouponShareable(collection)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <div className="text-center py-12">
            <Wallet className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || filters.category !== 'all' || filters.status !== 'all' 
                ? 'No Matching Coupons' 
                : 'Your Wallet is Empty'
              }
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || filters.category !== 'all' || filters.status !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Start collecting coupons to save on your purchases!'
              }
            </p>
            {(searchTerm || filters.category !== 'all' || filters.status !== 'all' || filters.businessName) ? (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilters({
                    category: 'all',
                    status: 'all',
                    acquisition: 'all',
                    sortBy: 'added',
                    businessName: ''
                  });
                }}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Clear all filters
              </button>
            ) : (
              <button
                onClick={() => window.location.href = '/discover'}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Discover Coupons
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Share Coupon Modal */}
      {showShareModal && selectedCouponForShare && (
        <ShareCouponModal
          isOpen={showShareModal}
          onClose={() => {
            setShowShareModal(false);
            setSelectedCouponForShare(null);
          }}
          coupon={selectedCouponForShare.coupon}
          couponId={selectedCouponForShare.couponId}
          collectionId={selectedCouponForShare.collectionId}
          currentUserId={userId}
          onShareSuccess={() => {
            // Refresh wallet after successful share
            loadWalletData();
            refreshSharingStats();
          }}
        />
      )}
    </div>
  );
};

export default CouponWallet;
