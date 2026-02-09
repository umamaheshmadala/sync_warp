// src/components/business/FeaturedOffers.tsx
import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Tag, ChevronRight, Calendar, TrendingUp, X, Heart, Edit3, CheckCircle, AlertCircle, Plus, Zap, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import type { Offer } from '@/types/offers';
import { useBusinessUrl } from '@/hooks/useBusinessUrl';
import { OfferShareButton } from '@/components/Sharing/OfferShareButton';
import { CreateOfferForm } from '@/components/offers/CreateOfferForm';
import { useAuthStore } from '@/store/authStore';
import { getCategoryIcon } from '@/utils/iconMap';
import { FavoriteOfferButton } from '@/components/favorites/FavoriteOfferButton';
import { OfferCard } from '@/components/offers/OfferCard';
import { OfferActionType } from '@/components/offers/OfferActionsMenu';
import OfferDetailModal from '@/components/offers/OfferDetailModal';
import { OfferAuditLogPanel } from '@/components/offers/OfferAuditLogPanel';
import { useOffers } from '@/hooks/useOffers';
import { OfferActionModal, OfferActionMode } from '@/components/offers/modals/OfferActionModal';




interface FeaturedOffersProps {
  businessId: string;
  businessName: string;
  isOwner: boolean;
  initialOfferId?: string | null;
  shareId?: string | null;
  compact?: boolean;
  onViewAll?: () => void; // Callback to switch to Offers tab
  className?: string;
  showHeading?: boolean;
  showAddButton?: boolean;
}

export default function FeaturedOffers({
  businessId,
  businessName,
  isOwner,
  initialOfferId,
  shareId,
  compact = false,
  onViewAll,
  className = "bg-white rounded-lg shadow-sm border p-6", // Default padding
  showHeading = true,
  showAddButton = true
}: FeaturedOffersProps) {
  const navigate = useNavigate();
  const { getBusinessUrl } = useBusinessUrl();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  // Tab Filter State
  type FilterType = 'all' | 'active' | 'draft' | 'paused' | 'expired' | 'archived' | 'terminated';
  const [activeFilter, setActiveFilter] = useState<FilterType>('active');

  // Delete Modal State
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();

  // Audit Log State
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyOffer, setHistoryOffer] = useState<Offer | null>(null);

  // Action Modal State
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionModalMode, setActionModalMode] = useState<OfferActionMode>('delete');
  const [actionTargetOffer, setActionTargetOffer] = useState<Offer | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Use hook for actions
  const { toggleFeatured, pauseOffer, resumeOffer, terminateOffer, archiveOffer, deleteOffer, duplicateOffer } = useOffers({
    businessId,
    autoFetch: false
  });

  const handleAction = async (action: OfferActionType, offer: Offer) => {
    switch (action) {
      case 'edit':
        setEditingOffer(offer);
        break;
      case 'duplicate':
        const newOffer = await duplicateOffer(offer.id);
        if (newOffer) {
          setOffers(prev => [newOffer, ...prev]);
          toast.success('Offer duplicated! You can now edit the copy.');

          await supabase.rpc('log_offer_action', {
            p_offer_id: offer.id,
            p_action: 'duplicated'
          });

          // Req #8: Opens edit mode
          setEditingOffer(newOffer);
        }
        break;
      case 'pause':
        setActionTargetOffer(offer);
        setActionModalMode('pause');
        setActionModalOpen(true);
        break;
      case 'resume':
        const resumed = await resumeOffer(offer.id);
        if (resumed) {
          setOffers(prev => prev.map(o => o.id === offer.id ? { ...o, status: 'active' } : o));
          toast.success('Offer resumed');

          await supabase.rpc('log_offer_action', {
            p_offer_id: offer.id,
            p_action: 'resumed'
          });
        }
        break;
      case 'terminate':
        setActionTargetOffer(offer);
        setActionModalMode('terminate');
        setActionModalOpen(true);
        break;
      case 'archive':
        setActionTargetOffer(offer);
        setActionModalMode('archive');
        setActionModalOpen(true);
        break;
      case 'delete':
        setActionTargetOffer(offer);
        setActionModalMode('delete');
        setActionModalOpen(true);
        break;
      case 'toggle_featured':
        const newFeaturedState = !offer.is_featured;
        const featured = await toggleFeatured(offer.id, newFeaturedState);
        if (featured) {
          setOffers(prev => prev.map(o => o.id === offer.id ? { ...o, is_featured: newFeaturedState } : o));
          await supabase.rpc('log_offer_action', {
            p_offer_id: offer.id,
            p_action: newFeaturedState ? 'featured' : 'unfeatured'
          });
        }
        break;
      case 'view_history':
        setHistoryOffer(offer);
        setHistoryOpen(true);
        break;
      case 'view_details':
        setSelectedOffer(offer);
        break;
    }
  };

  const handleModalConfirm = async (reason?: string) => {
    if (!actionTargetOffer) return;

    setIsProcessingAction(true);
    try {
      let success = false;
      const offerId = actionTargetOffer.id;

      switch (actionModalMode) {
        case 'pause':
          success = await pauseOffer(offerId, reason);
          if (success) {
            setOffers(prev => prev.map(o => o.id === offerId ? { ...o, status: 'paused' } : o));
            toast.success('Offer paused');
            await supabase.rpc('log_offer_action', {
              p_offer_id: offerId,
              p_action: 'paused',
              p_reason: reason
            });
          }
          break;
        case 'terminate':
          success = await terminateOffer(offerId, reason);
          if (success) {
            setOffers(prev => prev.filter(o => o.id !== offerId));
            toast.success('Offer terminated');
            await supabase.rpc('log_offer_action', {
              p_offer_id: offerId,
              p_action: 'terminated',
              p_reason: reason
            });
          }
          break;
        case 'archive':
          success = await archiveOffer(offerId);
          if (success) {
            setOffers(prev => prev.filter(o => o.id !== offerId));
            toast.success('Offer archived');
            await supabase.rpc('log_offer_action', {
              p_offer_id: offerId,
              p_action: 'archived'
            });
          }
          break;
        case 'delete':
          success = await deleteOffer(offerId);
          if (success) {
            const isDraft = actionTargetOffer.status === 'draft';
            setOffers(prev => prev.filter(o => o.id !== offerId));
            setTotalCount(prev => prev - 1);
            toast.success(isDraft ? 'Draft deleted successfully' : 'Offer deleted successfully');
            await supabase.rpc('log_offer_action', {
              p_offer_id: offerId,
              p_action: 'deleted'
            });
          }
          break;
      }
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setIsProcessingAction(false);
      setActionModalOpen(false);
      setActionTargetOffer(null);
    }
  };

  // Helper to calculate days remaining
  const getDaysRemaining = (dateString: string) => {
    const validUntil = new Date(dateString);
    const today = new Date();
    // Set both dates to start of day to avoid time component issues
    validUntil.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const diffTime = validUntil.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  // Helper to clear URL params when closing modal
  const handleCloseModal = () => {
    setSelectedOffer(null);

    // Clear offer params from URL to prevent auto-reopening
    if (searchParams.get('offer') || searchParams.get('offerId') || searchParams.get('share_id')) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('offer');
      newParams.delete('offerId');
      newParams.delete('share_id');
      setSearchParams(newParams, { replace: true });
    }
  };



  useEffect(() => {
    fetchOffers();
  }, [businessId]);

  // Handle deep linking to specific offer
  useEffect(() => {
    const handleDeepLink = async () => {
      if (initialOfferId) {
        // Check if offer is already in the list
        const existingOffer = offers.find(o => o.id === initialOfferId);

        if (existingOffer) {
          setSelectedOffer(existingOffer);
          handleShareTracking();
        } else {
          // Fetch specific offer if not in list
          try {
            const { data, error } = await supabase
              .from('offers')
              .select('*')
              .eq('id', initialOfferId)
              .single();

            if (data && !error) {
              setSelectedOffer(data);
              handleShareTracking();
            }
          } catch (err) {
            console.error('Error fetching deep linked offer:', err);
          }
        }
      }
    };

    if (!loading) {
      handleDeepLink();
    }
  }, [initialOfferId, loading, offers]);

  const handleShareTracking = async () => {
    if (shareId && initialOfferId) {
      // Import dynamically to avoid circular dependencies if any
      const { trackShareClick } = await import('@/services/analyticsService');
      trackShareClick(shareId, initialOfferId);
    }
  };

  const fetchOffers = async () => {
    try {
      setLoading(true);

      // Get total count
      const { count } = await supabase
        .from('offers')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .eq('status', 'active')
        .is('deleted_at', null);

      setTotalCount(count || 0);

      // Get offers - fetch active and expired (for display)
      // Get offers - fetch active and expired (for display)
      let query = supabase
        .from('offers')
        .select(`
          *,
          is_featured,
          featured_priority,
          audit_code,
          offer_type:offer_types(
            *,
            category:offer_categories(*)
          )
        `)
        .eq('business_id', businessId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (isOwner && !compact) {
        // Owner View (Management Tab): Fetch EVERYTHING to allow client-side filtering via tabs
        // We exclude soft-deleted items via .is('deleted_at', null) which is already applied above
        // No status filter = get all statuses
      } else {
        // Consumer View OR Owner Compact View (Overview): See only ACTIVE, non-expired offers
        // Allow valid_until to be future date OR null (no expiry)
        query = query.eq('status', 'active')
          .or(`valid_until.gte.${new Date().toISOString()},valid_until.is.null`);
      }

      if (compact) {
        query = query.limit(5);
      }

      const { data, error } = await query;

      if (error) throw error;
      if (error) throw error;

      // Inject business details since we already know them from context
      // This ensures OfferCard displays the correct business name instead of "Sync Business"
      const offersWithBusiness = data?.map(offer => ({
        ...offer,
        business: {
          id: businessId,
          business_name: businessName,
          name: businessName
        }
      })) || [];

      setOffers(offersWithBusiness);
    } catch (error) {
      console.error('Error fetching offers:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper: Check if an offer is expired based on valid_until date
  const isOfferExpired = (offer: Offer): boolean => {
    return new Date(offer.valid_until) < new Date() || offer.status === 'expired';
  };

  // Filter offers based on active tab
  const filteredOffers = useMemo(() => {
    return offers.filter(offer => {
      // If consumer or compact view, we already filtered at DB level, but safe to check 'active'
      if (!isOwner || compact) return offer.status === 'active';

      switch (activeFilter) {
        case 'active': return offer.status === 'active';
        case 'draft': return offer.status === 'draft';
        case 'paused': return offer.status === 'paused';
        case 'archived': return offer.status === 'archived';
        case 'terminated': return offer.status === 'terminated';
        case 'expired': return isOfferExpired(offer); // Use helper for expired
        case 'all': default: return true;
      }
    });
  }, [offers, activeFilter, isOwner, compact]);

  // Sort offers: Active first (sorted by date desc), then expired (sorted by date desc)
  const sortedOffers = useMemo(() => {
    return [...filteredOffers].sort((a, b) => {
      const aExpired = isOfferExpired(a);
      const bExpired = isOfferExpired(b);

      // Featured active offers come first (Story 4.18)
      // Only prioritize featured for Active offers
      const aFeatured = a.is_featured && !aExpired && a.status === 'active';
      const bFeatured = b.is_featured && !bExpired && b.status === 'active';

      if (aFeatured !== bFeatured) {
        return aFeatured ? -1 : 1;
      }

      // If both featured, sort by priority
      if (aFeatured && bFeatured) {
        if (a.featured_priority !== b.featured_priority) {
          return (b.featured_priority || 0) - (a.featured_priority || 0);
        }
      }

      // Active offers come first
      if (aExpired !== bExpired) {
        return aExpired ? 1 : -1;
      }

      // Within same status, sort by created_at (newest first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [filteredOffers]);

  if (loading) {
    return (
      <div className={className}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-100 rounded"></div>
            <div className="h-20 bg-gray-100 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // No early return for empty state - handle it in the main render
  const renderContent = () => {
    if (sortedOffers.length === 0) {
      return (
        <p className="text-sm text-gray-500 text-center py-8">
          {isOwner
            ? (offers.length === 0 && activeFilter === 'all'
              ? 'No offers found. Create your first promotional offer!'
              : `No ${activeFilter} offers found.`)
            : 'No current offers available.'}
        </p>
      );
    }

    return (
      <div className="space-y-3">
        {showHeading && (
          <p className="hidden md:block text-sm text-gray-600 mb-4">
            {isOwner
              ? 'Your active promotional offers. Track performance and manage them anytime.'
              : 'Check out the latest deals and promotions from this business.'}
          </p>
        )}

        {/* Tabs moved to header */}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sortedOffers.map((offer) => {
            const expired = isOfferExpired(offer);
            return (
              <div key={offer.id} className={`relative w-full ${expired ? 'opacity-75 grayscale-[0.5]' : ''}`}>
                <OfferCard
                  offer={offer}
                  onViewDetails={(o) => setSelectedOffer(o)}
                  onAction={isOwner ? handleAction : undefined}
                  showActions={false} // User requested moving actions to modal only
                />
              </div>
            );
          })}
        </div>


        {/* View All / Manage Offers Button - Only show if owner or if we want a dedicated page link */}
        {/* View All Button - Only show in compact mode */}
        {compact && totalCount > 5 && (
          <button
            onClick={() => {
              // Use callback if provided (preferred for tab switching)
              if (onViewAll) {
                onViewAll();
              } else {
                // Fallback to navigation
                navigate(`${getBusinessUrl(businessId, businessName)}/offers`);
              }
            }}
            className="mt-4 w-full py-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors"
          >
            View All ({totalCount})
          </button>
        )}


      </div>
    );
  };

  return (
    <div className={className}>
      {(showHeading || (isOwner && showAddButton)) && (

        <div className="flex flex-col md:flex-row md:items-center mb-4 justify-between gap-4">
          <div className="flex items-center gap-4">
            {showHeading && (
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Tag className="w-5 h-5 mr-2 text-green-600" />
                Current Offers {totalCount > 0 && <span className="ml-2 text-sm text-gray-500">({totalCount})</span>}
              </h3>
            )}

            {isOwner && showAddButton && (
              <button
                onClick={() => {
                  console.log('[FeaturedOffers] New Offer Button Clicked (Desktop)');
                  setShowCreateForm(true);
                }}
                className="hidden md:flex items-center gap-1 px-3 h-9 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors whitespace-nowrap shadow-sm"
              >
                <Plus className="w-4 h-4" />
                New Offer
              </button>
            )}
          </div>

          {/* Right Group: Filter Dropdown (+ Mobile New Offer Button) */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            {isOwner && showAddButton && (
              <button
                onClick={() => {
                  console.log('[FeaturedOffers] New Offer Button Clicked (Mobile)');
                  setShowCreateForm(true);
                }}
                className="flex md:hidden flex-1 items-center justify-center gap-1 px-3 h-9 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors whitespace-nowrap shadow-sm"
              >
                <Plus className="w-4 h-4" />
                New Offer
              </button>
            )}

            {isOwner && !compact && (
              <div className="relative flex-1 md:flex-none">
                <select
                  value={activeFilter}
                  onChange={(e) => setActiveFilter(e.target.value as FilterType)}
                  className="appearance-none w-full md:w-40 h-9 bg-gray-100 border-none text-gray-700 pl-3 pr-8 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer hover:bg-gray-200 transition-colors shadow-sm"
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="draft">Drafts</option>
                  <option value="archived">Archived</option>
                  <option value="terminated">Terminated</option>
                  <option value="expired">Expired</option>
                  <option value="all">All Offers</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              </div>
            )}
          </div>
        </div>
      )}

      {renderContent()}

      {/* Shared Offer Detail Modal */}
      {selectedOffer && (
        <div style={{ position: 'relative', zIndex: 9999 }}>
          {createPortal(
            <OfferDetailModal
              offer={selectedOffer}
              onClose={handleCloseModal}
              onEdit={isOwner ? (o) => {
                setEditingOffer(o);
                setSelectedOffer(null);
              } : undefined}
              showStats={isOwner}
              isOwner={isOwner}
              onAction={isOwner ? handleAction : undefined}
            // onShare logic is handled internally by OfferDetailModal's OfferShareButton
            />,
            document.body
          )}
        </div>
      )}

      {/* Edit Offer Modal */}
      {editingOffer && user && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto relative">
            <CreateOfferForm
              businessId={businessId}
              userId={user.id}
              offerId={editingOffer.id}
              onComplete={() => {
                setEditingOffer(null);
                fetchOffers(); // Refresh offers list
                toast.success('Offer updated successfully!');
              }}
              onCancel={() => setEditingOffer(null)}
            />
          </div>
        </div>
        , document.body)}

      {/* Create New Offer Modal */}
      {showCreateForm && user && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto relative">
            <CreateOfferForm
              businessId={businessId}
              userId={user.id}
              onComplete={() => {
                setShowCreateForm(false);
                fetchOffers(); // Refresh offers list
                toast.success('Offer created successfully!');
              }}
              onCancel={() => setShowCreateForm(false)}
            />
          </div>
        </div>
        , document.body)}

      {/* Audit History Panel */}
      {historyOffer && (
        <OfferAuditLogPanel
          isOpen={historyOpen}
          onClose={() => { setHistoryOpen(false); setHistoryOffer(null); }}
          offerId={historyOffer.id}
        />
      )}

      {/* Unified Action Modal (Pause, Terminate, Archive, Delete) */}
      {actionTargetOffer && createPortal(
        <OfferActionModal
          isOpen={actionModalOpen}
          mode={actionModalMode}
          offer={actionTargetOffer}
          onClose={() => {
            if (!isProcessingAction) {
              setActionModalOpen(false);
              setActionTargetOffer(null);
            }
          }}
          onConfirm={handleModalConfirm}
          isProcessing={isProcessingAction}
        />,
        document.body
      )}
    </div >
  );
}
