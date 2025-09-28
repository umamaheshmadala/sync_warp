import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Filter,
  Grid3X3,
  List,
  MoreVertical,
  Edit3,
  Trash2,
  Play,
  Pause,
  BarChart3,
  Eye,
  EyeOff,
  Calendar,
  Users,
  Target,
  Copy,
  QrCode,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  FileText,
  FilePlus
} from 'lucide-react';
import { 
  Coupon, 
  CouponFilters, 
  CouponStatus,
  CouponType,
  CouponAnalytics 
} from '../../types/coupon';
import { useCoupons } from '../../hooks/useCoupons';
import { useCouponDrafts } from '../../hooks/useCouponDrafts';
import CouponCreator from './CouponCreator';
import { toast } from 'react-hot-toast';

interface CouponManagerProps {
  businessId: string;
  businessName: string;
  isOwner: boolean;
}

const CouponManager: React.FC<CouponManagerProps> = ({
  businessId,
  businessName,
  isOwner
}) => {
  const { coupons, loading, deleteCoupon, toggleCouponStatus, refreshCoupons, fetchCouponAnalytics } = useCoupons(businessId);
  const { drafts, loading: draftsLoading, deleteDraft, loadDraft } = useCouponDrafts(businessId);
  
  const [activeTab, setActiveTab] = useState<'coupons' | 'drafts'>(drafts.length > 0 ? 'drafts' : 'coupons');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCreator, setShowCreator] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [editingDraft, setEditingDraft] = useState<any | null>(null);
  const [filters, setFilters] = useState<CouponFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<Record<string, CouponAnalytics>>({});

  // Auto-switch to drafts tab if there are drafts but no published coupons
  useEffect(() => {
    if (drafts.length > 0 && coupons.length === 0 && activeTab === 'coupons') {
      setActiveTab('drafts');
    }
  }, [drafts.length, coupons.length, activeTab]);

  // Filter coupons based on search and filters
  const filteredCoupons = useMemo(() => {
    if (!coupons?.length) return [];
    
    return coupons.filter(coupon => {
      const titleMatch = !searchQuery || coupon.title.toLowerCase().includes(searchQuery.toLowerCase());
      const descMatch = !searchQuery || coupon.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const statusMatch = !filters.status?.length || filters.status.includes(coupon.status);
      const typeMatch = !filters.type?.length || filters.type.includes(coupon.type);
      
      return (titleMatch || descMatch) && statusMatch && typeMatch;
    });
  }, [coupons, searchQuery, filters]);

  // Get statistics for dashboard cards
  const getStatsCards = () => {
    const totalCoupons = coupons.length;
    const activeCoupons = coupons.filter(c => c.status === 'active').length;
    const totalDrafts = drafts.length;
    const totalRedemptions = coupons.reduce((sum, c) => sum + (c.usage_count || 0), 0);
    const totalCollections = coupons.reduce((sum, c) => sum + (c.collection_count || 0), 0);

    return [
      {
        title: 'Total Coupons',
        value: totalCoupons,
        icon: Target,
        color: 'bg-blue-500',
        trend: '+2 this week'
      },
      {
        title: 'Active',
        value: activeCoupons,
        icon: CheckCircle,
        color: 'bg-green-500',
        trend: `${activeCoupons > 0 ? Math.round((activeCoupons / totalCoupons) * 100) : 0}% active`
      },
      {
        title: 'Draft Coupons',
        value: totalDrafts,
        icon: FileText,
        color: 'bg-orange-500',
        trend: `${totalDrafts} in progress`
      },
      {
        title: 'Total Redemptions',
        value: totalRedemptions,
        icon: TrendingUp,
        color: 'bg-purple-500',
        trend: '+15% vs last month'
      }
    ];
  };

  const handleCreateCoupon = () => {
    setEditingCoupon(null);
    setShowCreator(true);
  };

  const handleEditCoupon = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setEditingDraft(null);
    setShowCreator(true);
  };

  const handleEditDraft = (draft: any) => {
    // Convert draft to coupon format for the creator
    const draftAsCoupon = {
      ...draft.form_data,
      id: draft.id,
      business_id: draft.business_id,
      title: draft.form_data.title || draft.draft_name,
      status: 'draft' as CouponStatus
    };
    setEditingCoupon(draftAsCoupon);
    setEditingDraft(draft);
    setShowCreator(true);
  };

  const handleDeleteDraft = useCallback(async (draftId: string, draftName: string) => {
    if (!window.confirm(`Delete draft "${draftName}"?`)) return;
    
    try {
      await deleteDraft(draftId);
      toast.success('Draft deleted successfully');
    } catch (error) {
      toast.error('Failed to delete draft');
      console.error(error);
    }
  }, [deleteDraft]);

  const handleDeleteCoupon = useCallback(async (couponId: string, couponTitle: string) => {
    if (!window.confirm(`Delete "${couponTitle}"?`)) return;
    
    try {
      await deleteCoupon(couponId);
      toast.success('Deleted');
    } catch (error) {
      toast.error('Delete failed');
      console.error(error);
    }
  }, [deleteCoupon]);

  const handleToggleStatus = useCallback(async (couponId: string, currentStatus: CouponStatus) => {
    try {
      await toggleCouponStatus(couponId);
      const newStatus = currentStatus === 'active' ? 'paused' : 'active';
      toast.success(newStatus === 'active' ? 'Activated' : 'Paused');
    } catch (error) {
      toast.error('Status update failed');
      console.error(error);
    }
  }, [toggleCouponStatus]);

  const handleViewAnalytics = async (couponId: string) => {
    try {
      const analyticsData = await fetchCouponAnalytics(couponId);
      if (analyticsData) {
        setAnalytics(prev => ({ ...prev, [couponId]: analyticsData }));
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics');
    }
  };

  const copyCouponCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Coupon code copied to clipboard!');
  };

  const clearFilters = () => {
    setFilters({});
    setSearchQuery('');
  };

  const getStatusColor = (status: CouponStatus) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'exhausted':
        return 'bg-purple-100 text-purple-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: CouponStatus) => {
    switch (status) {
      case 'active':
        return CheckCircle;
      case 'paused':
        return Pause;
      case 'expired':
        return Clock;
      case 'exhausted':
        return XCircle;
      case 'draft':
        return AlertCircle;
      case 'cancelled':
        return XCircle;
      default:
        return AlertCircle;
    }
  };

  const formatDiscountDisplay = (coupon: Coupon) => {
    switch (coupon.type) {
      case 'percentage':
        return `${coupon.discount_value}% OFF`;
      case 'fixed_amount':
        return `₹${coupon.discount_value} OFF`;
      case 'buy_x_get_y':
        return `BUY ${Math.floor(coupon.discount_value)} GET 1 FREE`;
      case 'free_item':
        return 'FREE ITEM';
      default:
        return 'SPECIAL OFFER';
    }
  };

  const CouponCard: React.FC<{ coupon: Coupon; isGridView: boolean }> = ({ coupon, isGridView }) => {
    const [showDropdown, setShowDropdown] = useState(false);
    const StatusIcon = getStatusIcon(coupon.status);

    if (isGridView) {
      return (
        <motion.div
          layout
          className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200"
        >
          {/* Coupon Header */}
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4 text-white">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium opacity-90">{businessName}</div>
              <div className="relative">
                {isOwner && (
                  <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="p-1 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                )}
                
                {showDropdown && (
                  <div className="absolute right-0 top-8 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          handleEditCoupon(coupon);
                          setShowDropdown(false);
                        }}
                        className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Edit3 className="w-4 h-4 mr-3" />
                        Edit Coupon
                      </button>
                      <button
                        onClick={() => {
                          handleToggleStatus(coupon.id, coupon.status);
                          setShowDropdown(false);
                        }}
                        className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        {coupon.status === 'active' ? (
                          <>
                            <Pause className="w-4 h-4 mr-3" />
                            Pause Coupon
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-3" />
                            Activate Coupon
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          handleViewAnalytics(coupon.id);
                          setShowDropdown(false);
                        }}
                        className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <BarChart3 className="w-4 h-4 mr-3" />
                        View Analytics
                      </button>
                      <button
                        onClick={() => copyCouponCode(coupon.coupon_code)}
                        className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Copy className="w-4 h-4 mr-3" />
                        Copy Code
                      </button>
                      <hr className="my-1" />
                      <button
                        onClick={() => {
                          handleDeleteCoupon(coupon.id, coupon.title);
                          setShowDropdown(false);
                        }}
                        className="w-full flex items-center px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-3" />
                        Delete Coupon
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold mb-1">{formatDiscountDisplay(coupon)}</div>
              <div className="text-sm opacity-90 mb-2">{coupon.title}</div>
              <div className="text-xs font-mono bg-white bg-opacity-20 px-2 py-1 rounded">
                {coupon.coupon_code}
              </div>
            </div>
          </div>

          {/* Coupon Details */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(coupon.status)}`}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {coupon.status.charAt(0).toUpperCase() + coupon.status.slice(1)}
              </div>
              
              <div className="text-right">
                <div className="text-xs text-gray-500">Expires</div>
                <div className="text-xs font-medium text-gray-900">
                  {new Date(coupon.valid_until).toLocaleDateString()}
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-3 line-clamp-2">{coupon.description}</p>

            <div className="grid grid-cols-2 gap-4 mb-3 text-center">
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-lg font-semibold text-gray-900">{coupon.usage_count || 0}</div>
                <div className="text-xs text-gray-500">Used</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-lg font-semibold text-gray-900">{coupon.collection_count || 0}</div>
                <div className="text-xs text-gray-500">Collected</div>
              </div>
            </div>

            <div className="text-xs text-gray-500">
              <div>Target: {coupon.target_audience.replace('_', ' ')}</div>
              <div>Created: {new Date(coupon.created_at).toLocaleDateString()}</div>
            </div>
          </div>

          {/* Click overlay to close dropdown */}
          {showDropdown && (
            <div
              className="fixed inset-0 z-0"
              onClick={() => setShowDropdown(false)}
            />
          )}
        </motion.div>
      );
    }

    // List view
    return (
      <motion.div
        layout
        className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow duration-200"
      >
        <div className="flex items-center space-x-4">
          {/* Coupon Preview */}
          <div className="flex-shrink-0">
            <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white">
              <div className="text-center">
                <div className="text-xs font-bold">{formatDiscountDisplay(coupon).split(' ')[0]}</div>
                <div className="text-xs">{formatDiscountDisplay(coupon).split(' ').slice(1).join(' ')}</div>
              </div>
            </div>
          </div>

          {/* Coupon Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">{coupon.title}</h3>
                  <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(coupon.status)}`}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {coupon.status.charAt(0).toUpperCase() + coupon.status.slice(1)}
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-2 line-clamp-1">{coupon.description}</p>

                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <QrCode className="w-4 h-4" />
                    <span className="font-mono">{coupon.coupon_code}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>Expires {new Date(coupon.valid_until).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Users className="w-4 h-4" />
                    <span>{coupon.usage_count || 0} used</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              {isOwner && (
                <div className="relative">
                  <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {showDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-10">
                      <div className="py-1">
                        <button
                          onClick={() => {
                            handleEditCoupon(coupon);
                            setShowDropdown(false);
                          }}
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                        >
                          <Edit3 className="w-4 h-4 mr-3" />
                          Edit Coupon
                        </button>
                        <button
                          onClick={() => {
                            handleToggleStatus(coupon.id, coupon.status);
                            setShowDropdown(false);
                          }}
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                        >
                          {coupon.status === 'active' ? (
                            <>
                              <Pause className="w-4 h-4 mr-3" />
                              Pause Coupon
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 mr-3" />
                              Activate Coupon
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            handleViewAnalytics(coupon.id);
                            setShowDropdown(false);
                          }}
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                        >
                          <BarChart3 className="w-4 h-4 mr-3" />
                          View Analytics
                        </button>
                        <button
                          onClick={() => copyCouponCode(coupon.coupon_code)}
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                        >
                          <Copy className="w-4 h-4 mr-3" />
                          Copy Code
                        </button>
                        <hr className="my-1" />
                        <button
                          onClick={() => {
                            handleDeleteCoupon(coupon.id, coupon.title);
                            setShowDropdown(false);
                          }}
                          className="flex items-center px-4 py-2 text-sm text-red-700 hover:bg-red-50 w-full text-left"
                        >
                          <Trash2 className="w-4 h-4 mr-3" />
                          Delete Coupon
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  // Draft Card Component
  const DraftCard: React.FC<{ draft: any; isGridView: boolean }> = ({ draft, isGridView }) => {
    const [showDropdown, setShowDropdown] = useState(false);

    const getCompletionPercentage = (step: number) => {
      return Math.round((step / 6) * 100);
    };

    const getCompletionColor = (step: number) => {
      if (step <= 2) return 'bg-red-400';
      if (step <= 4) return 'bg-yellow-400';
      return 'bg-green-400';
    };

    if (isGridView) {
      return (
        <motion.div
          layout
          className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl shadow-sm border border-orange-200 overflow-hidden hover:shadow-md transition-shadow duration-200"
        >
          {/* Draft Header */}
          <div className="bg-gradient-to-r from-orange-400 to-amber-400 p-4 text-white">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium opacity-90">Draft Coupon</div>
              <div className="relative">
                {isOwner && (
                  <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="p-1 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                )}
                
                {showDropdown && (
                  <div className="absolute right-0 top-8 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          handleEditDraft(draft);
                          setShowDropdown(false);
                        }}
                        className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Edit3 className="w-4 h-4 mr-3" />
                        Continue Editing
                      </button>
                      <hr className="my-1" />
                      <button
                        onClick={() => {
                          handleDeleteDraft(draft.id, draft.draft_name);
                          setShowDropdown(false);
                        }}
                        className="w-full flex items-center px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-3" />
                        Delete Draft
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-bold mb-1">{draft.draft_name}</div>
              <div className="text-xs opacity-90 mb-2">Step {draft.step_completed}/6 Complete</div>
              <div className="w-full bg-white bg-opacity-20 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${getCompletionColor(draft.step_completed)}`}
                  style={{ width: `${getCompletionPercentage(draft.step_completed)}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Draft Details */}
          <div className="p-4">
            <div className="text-sm text-gray-600 mb-3">
              {draft.form_data?.title ? (
                <div className="mb-2">
                  <strong>Coupon Title:</strong> {draft.form_data.title}
                </div>
              ) : null}
              {draft.form_data?.type ? (
                <div className="mb-2">
                  <strong>Type:</strong> {draft.form_data.type.replace('_', ' ').toUpperCase()}
                </div>
              ) : null}
              {draft.form_data?.discount_value ? (
                <div className="mb-2">
                  <strong>Discount:</strong> {draft.form_data.discount_type === 'percentage' ? `${draft.form_data.discount_value}%` : `₹${draft.form_data.discount_value}`}
                </div>
              ) : null}
            </div>

            <div className="text-xs text-gray-500">
              <div>Created: {new Date(draft.created_at).toLocaleDateString()}</div>
              <div>Updated: {new Date(draft.updated_at).toLocaleDateString()}</div>
            </div>

            <button
              onClick={() => handleEditDraft(draft)}
              className="w-full mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
            >
              Continue Editing
            </button>
          </div>

          {/* Click overlay to close dropdown */}
          {showDropdown && (
            <div
              className="fixed inset-0 z-0"
              onClick={() => setShowDropdown(false)}
            />
          )}
        </motion.div>
      );
    }

    // List view
    return (
      <motion.div
        layout
        className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-200 p-4 hover:shadow-md transition-shadow duration-200"
      >
        <div className="flex items-center space-x-4">
          {/* Progress Circle */}
          <div className="flex-shrink-0">
            <div className="w-16 h-16 relative">
              <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-orange-200"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-orange-500"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="none"
                  strokeDasharray={`${getCompletionPercentage(draft.step_completed)}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-semibold text-orange-600">{draft.step_completed}/6</span>
              </div>
            </div>
          </div>

          {/* Draft Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">{draft.draft_name}</h3>
                  <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    <FileText className="w-3 h-3 mr-1" />
                    Draft
                  </div>
                </div>

                {draft.form_data?.title && (
                  <p className="text-sm text-gray-600 mb-2">Coupon: {draft.form_data.title}</p>
                )}

                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>Updated {new Date(draft.updated_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span>{getCompletionPercentage(draft.step_completed)}% Complete</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              {isOwner && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleEditDraft(draft)}
                    className="px-3 py-1 bg-orange-500 text-white rounded text-sm hover:bg-orange-600 transition-colors"
                  >
                    Continue
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => setShowDropdown(!showDropdown)}
                      className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {showDropdown && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-10">
                        <div className="py-1">
                          <button
                            onClick={() => {
                              handleEditDraft(draft);
                              setShowDropdown(false);
                            }}
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                          >
                            <Edit3 className="w-4 h-4 mr-3" />
                            Continue Editing
                          </button>
                          <button
                            onClick={() => {
                              handleDeleteDraft(draft.id, draft.draft_name);
                              setShowDropdown(false);
                            }}
                            className="flex items-center px-4 py-2 text-sm text-red-700 hover:bg-red-50 w-full text-left"
                          >
                            <Trash2 className="w-4 h-4 mr-3" />
                            Delete Draft
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  if (loading && coupons.length === 0) {
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
              <Target className="w-7 h-7 text-purple-600" />
              Coupon Manager
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Create and manage coupons for {businessName}
            </p>
          </div>
          
          {isOwner && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleCreateCoupon}
              className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Coupon
            </motion.button>
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
                  <div className="text-xs text-gray-400">{stat.trend}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mt-6">
          <button
            onClick={() => setActiveTab('coupons')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'coupons'
                ? 'bg-purple-100 text-purple-700 border border-purple-200'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Target className="w-4 h-4 mr-2 inline" />
            Published Coupons ({coupons.length})
          </button>
          <button
            onClick={() => setActiveTab('drafts')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'drafts'
                ? 'bg-orange-100 text-orange-700 border border-orange-200'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <FileText className="w-4 h-4 mr-2 inline" />
            Draft Coupons ({drafts.length})
          </button>
        </div>
      </div>

      {/* Search and Filters - Only for Coupons tab */}
      {activeTab === 'coupons' && (
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search coupons..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md ${
                viewMode === 'grid' 
                  ? 'bg-purple-100 text-purple-600' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Grid3X3 className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md ${
                viewMode === 'list' 
                  ? 'bg-purple-100 text-purple-600' 
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
            {(Object.keys(filters).length > 0 || searchQuery) && (
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                {Object.keys(filters).length + (searchQuery ? 1 : 0)}
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    multiple
                    value={filters.status || []}
                    onChange={(e) => setFilters({ 
                      ...filters, 
                      status: Array.from(e.target.selectedOptions, option => option.value) as CouponStatus[]
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="expired">Expired</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>

                {/* Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    multiple
                    value={filters.type || []}
                    onChange={(e) => setFilters({ 
                      ...filters, 
                      type: Array.from(e.target.selectedOptions, option => option.value) as CouponType[]
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="percentage">Percentage Off</option>
                    <option value="fixed_amount">Fixed Amount</option>
                    <option value="buy_x_get_y">Buy X Get Y</option>
                    <option value="free_item">Free Item</option>
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
      )}

      {/* Tab Content */}
      {activeTab === 'coupons' ? (
        /* Coupons Display */
        filteredCoupons.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto h-24 w-24 text-gray-400 mb-4">
              <Target className="w-full h-full" />
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No coupons found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {coupons.length === 0 
                ? isOwner 
                  ? 'Get started by creating your first coupon.'
                  : 'This business hasn\'t created any coupons yet.'
                : 'Try adjusting your search or filters.'
              }
            </p>
            {isOwner && coupons.length === 0 && (
              <div className="mt-6">
                <button
                  onClick={handleCreateCoupon}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Coupon
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className={`${
            viewMode === 'grid' 
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
              : 'space-y-4'
          }`}>
            {filteredCoupons.map((coupon, index) => (
              <motion.div
                key={coupon.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <CouponCard coupon={coupon} isGridView={viewMode === 'grid'} />
              </motion.div>
            ))}
          </div>
        )
      ) : (
        /* Drafts Display */
        drafts.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto h-24 w-24 text-orange-400 mb-4">
              <FileText className="w-full h-full" />
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No draft coupons</h3>
            <p className="mt-1 text-sm text-gray-500">
              {isOwner 
                ? 'Start creating a coupon to see it saved as a draft here.'
                : 'This business doesn\'t have any coupon drafts.'
              }
            </p>
            {isOwner && (
              <div className="mt-6">
                <button
                  onClick={handleCreateCoupon}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                >
                  <FilePlus className="w-4 h-4 mr-2" />
                  Start Creating Coupon
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className={`${
            viewMode === 'grid' 
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
              : 'space-y-4'
          }`}>
            {drafts.map((draft, index) => (
              <motion.div
                key={draft.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <DraftCard draft={draft} isGridView={viewMode === 'grid'} />
              </motion.div>
            ))}
          </div>
        )
      )}

      {/* Coupon Creator Modal */}
      <CouponCreator
        businessId={businessId}
        businessName={businessName}
        isOpen={showCreator}
        onClose={() => {
          setShowCreator(false);
          setEditingCoupon(null);
        }}
        onSuccess={() => {
          refreshCoupons();
        }}
        editingCoupon={editingCoupon}
      />
    </div>
  );
};

export default CouponManager;