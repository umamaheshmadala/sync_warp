import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  Search,
  Filter,

  SortAsc,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { UnifiedCouponCard } from '../common/UnifiedCouponCard';
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
import CouponDetailsModal from '../modals/CouponDetailsModal';
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
  const {
    userCoupons: collectedCoupons,
    loading: couponsLoading,
    fetchUserCoupons: refreshCoupons,
    redeemCoupon,
    removeCouponCollection
  } = useUserCoupons();

  const [redemptions, setRedemptions] = useState<CouponRedemption[]>([]);
  const [redemptionsLoading, setRedemptionsLoading] = useState(true);

  const [loadingActions, setLoadingActions] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [filters, setFilters] = useState<WalletFilters>({
    category: 'all',
    status: 'all',
    acquisition: 'all',
    sortBy: 'added',
    businessName: ''
  });

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

  // State for details modal
  const [selectedCouponForView, setSelectedCouponForView] = useState<Coupon | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Load redemptions independently
  useEffect(() => {
    const loadRedemptions = async () => {
      try {
        setRedemptionsLoading(true);
        const userRedemptions = await couponService.getUserRedemptions(userId);
        setRedemptions(userRedemptions);
      } catch (error) {
        console.error('Error loading redemptions:', error);
      } finally {
        setRedemptionsLoading(false);
      }
    };

    if (userId) {
      loadRedemptions();
    }
  }, [userId]);


  // derived loading state (only block if no coupons AND loading)
  const loading = couponsLoading && collectedCoupons.length === 0;

  // Handle coupon redemption
  const handleRedeemCoupon = async (couponId: string) => {
    const collection = collectedCoupons.find(c => c.coupon_id === couponId);
    if (!collection) return;

    setLoadingActions(prev => new Set([...prev, couponId]));

    try {
      await redeemCoupon(couponId, userId, collection.business_id);
      refreshCoupons(); // Refresh data
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
      console.log('🗑️ [CouponWallet] Removing coupon collection:', collectionId);
      const success = await removeCouponCollection(collectionId);

      if (success) {
        // Immediately update local state for instant UI feedback
        // setCollectedCoupons handled by optimistic update in hook
        console.log('✅ [CouponWallet] Coupon removed successfully');
        // Don't show duplicate toast - hook already shows one
      }
    } catch (error) {
      console.error('❌ [CouponWallet] Error removing coupon:', error);
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

    if (coupon.valid_until) {
      const now = new Date();
      const expiryDate = new Date(coupon.valid_until);
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntilExpiry < 0) return 'expired';
      if (daysUntilExpiry <= 3) return 'expiring';
    }

    if (coupon.total_limit && coupon.usage_count >= coupon.total_limit) return 'expired';
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

      // Skip collections with undefined coupons
      if (!coupon) {
        console.warn('⚠️ [CouponWallet] Collection missing coupon data:', collection.id);
        return false;
      }

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

    // Sort coupons - ALWAYS move expired to bottom
    filtered.sort((a, b) => {
      const statusA = getCouponStatus(a.coupon, a);
      const statusB = getCouponStatus(b.coupon, b);

      // Always push expired/redeemed coupons to bottom
      if ((statusA === 'expired' || statusA === 'redeemed') && (statusB !== 'expired' && statusB !== 'redeemed')) {
        return 1; // a goes to bottom
      }
      if ((statusB === 'expired' || statusB === 'redeemed') && (statusA !== 'expired' && statusA !== 'redeemed')) {
        return -1; // b goes to bottom
      }

      // If both expired or both active, then apply user's sort preference
      switch (filters.sortBy) {
        case 'expiry':
          if (!a.coupon.valid_until && !b.coupon.valid_until) return 0;
          if (!a.coupon.valid_until) return 1;
          if (!b.coupon.valid_until) return -1;
          return new Date(a.coupon.valid_until).getTime() - new Date(b.coupon.valid_until).getTime();
        case 'value':
          const aValue = a.coupon.type === 'percentage' ? a.coupon.discount_value : a.coupon.discount_value;
          const bValue = b.coupon.type === 'percentage' ? b.coupon.discount_value : b.coupon.discount_value;
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
    // Filter out collections with undefined coupons first
    const validCoupons = collectedCoupons.filter(c => c.coupon != null);

    const total = validCoupons.length;
    const active = validCoupons.filter(c => getCouponStatus(c.coupon, c) === 'active').length;
    const expiring = validCoupons.filter(c => getCouponStatus(c.coupon, c) === 'expiring').length;
    const expired = validCoupons.filter(c => getCouponStatus(c.coupon, c) === 'expired').length;
    const redeemed = validCoupons.filter(c => getCouponStatus(c.coupon, c) === 'redeemed').length;
    const shareable = validCoupons.filter(c => isCouponShareable(c)).length;
    const shared = validCoupons.filter(c => (c as any).acquisition_method === 'shared_received').length;

    const totalSavingsPotential = validCoupons
      .filter(c => getCouponStatus(c.coupon, c) === 'active')
      .reduce((sum, c) => {
        const coupon = c.coupon;
        if (coupon.type === 'percentage' && coupon.minimum_purchase) {
          return sum + (coupon.discount_value / 100) * coupon.minimum_purchase;
        }
        return sum + coupon.discount_value;
      }, 0);

    return { total, active, expiring, expired, redeemed, shareable, shared, totalSavingsPotential };
  }, [collectedCoupons, redemptions]);

  // Format discount display
  const formatDiscount = (coupon: Coupon): string => {
    if (coupon.type === 'percentage') {
      return `${coupon.discount_value}% OFF`;
    }
    return `₹${coupon.discount_value} OFF`;
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
    const isExpired = status === 'expired';

    // Debug: Log coupon data to see what's available
    console.log('🎫 [CouponWalletCard] Coupon data:', {
      id: coupon.id,
      title: coupon.title,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      business: coupon.business_name,
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
            expires_at: coupon.valid_until || coupon.valid_until,
            business_name: coupon.business_name,
            business: (coupon.business_id && coupon.business_name) ? {
              id: coupon.business_id,
              business_name: coupon.business_name
            } : undefined
          }}
          onClick={() => onView(coupon)}
          isExpired={isExpired}
          isRedeemed={isRedeemed}
          showStatusBadge={true}
          statusText={status}
        />
      </motion.div>
    );
  };

  return (
    <div className={`bg-gray-50 min-h-screen ${className}`}>
      {/* Search and Filters Unified Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 relative z-10">
        {/* Search and Filters */}
        <div className="flex flex-row items-center gap-2 mb-6">
          {/* Search */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search coupons..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Unified Filter Dropdown */}
            <div className="relative">
              <Select
                value={
                  filters.status !== 'all' ? filters.status :
                    filters.acquisition !== 'all' ? filters.acquisition :
                      'all'
                }
                onValueChange={(val) => {
                  if (['active', 'expiring', 'expired', 'redeemed'].includes(val)) {
                    setFilters(prev => ({ ...prev, status: val as any, acquisition: 'all' }));
                  } else if (['shareable', 'collected', 'shared_received'].includes(val)) {
                    setFilters(prev => ({ ...prev, status: 'all', acquisition: val as any }));
                  } else {
                    setFilters(prev => ({ ...prev, status: 'all', acquisition: 'all' }));
                  }
                }}
              >
                <SelectTrigger className="w-[180px] bg-white">
                  <SelectValue placeholder="All Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All ({walletStats.total})</SelectItem>
                  <SelectItem value="active">Active ({walletStats.active})</SelectItem>
                  <SelectItem value="expiring">Expiring ({walletStats.expiring})</SelectItem>
                  <SelectItem value="expired">Expired ({walletStats.expired})</SelectItem>
                  <SelectItem value="redeemed">Redeemed ({walletStats.redeemed})</SelectItem>
                  <SelectItem value="shareable">🎁 Can Share ({walletStats.shareable})</SelectItem>
                  <SelectItem value="collected">📥 Collected ({collectedCoupons.filter(c => (c as any).acquisition_method === 'collected').length})</SelectItem>
                  <SelectItem value="shared_received">🤝 Received ({walletStats.shared})</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
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
        {loading && collectedCoupons.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredCoupons.length > 0 ? (
          <motion.div
            layout
            className={`grid gap-6 ${viewMode === 'grid'
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
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
                  onView={(coupon) => {
                    setSelectedCouponForView(coupon);
                    setShowDetailsModal(true);
                  }}
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
            refreshCoupons();
            refreshSharingStats();
          }}
        />
      )}

      {/* Coupon Details Modal */}
      {showDetailsModal && selectedCouponForView && (
        <CouponDetailsModal
          coupon={selectedCouponForView}
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedCouponForView(null);
          }}
          showCollectButton={false}  // Already collected
          showShareButton={true}
          showRedeemButton={true}  // Show redeem in wallet
          showRemoveButton={true}  // Show remove in wallet
          collectionId={collectedCoupons.find(c => c.coupon_id === selectedCouponForView.id)?.id}
          isRedeemed={redemptions.some(r => r.coupon_id === selectedCouponForView.id)}
          onShare={(couponId) => {
            // Find the collection for this coupon
            const collection = collectedCoupons.find(c => c.coupon_id === couponId);
            if (collection && isCouponShareable(collection)) {
              handleShareCoupon(couponId, collection.id);
              setShowDetailsModal(false);
            } else {
              toast.error('This coupon cannot be shared');
            }
          }}
          onRedeem={(couponId) => {
            handleRedeemCoupon(couponId);
          }}
          onRemove={(collectionId) => {
            handleRemoveCoupon(collectionId);
          }}
        />
      )}
    </div>
  );
};

export default CouponWallet;
