// src/components/business/FeaturedOffers.tsx
import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Tag, ChevronRight, Calendar, TrendingUp, X, Heart, Edit3, CheckCircle, AlertCircle, Plus, Zap } from 'lucide-react';
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
import OfferDetailModal from '@/components/offers/OfferDetailModal';




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
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();

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
        .eq('status', 'active');

      setTotalCount(count || 0);

      // Get offers - fetch active and expired (for display)
      // Get offers - fetch active and expired (for display)
      let query = supabase
        .from('offers')
        .select(`
          *,
          offer_type:offer_types(
            *,
            category:offer_categories(*)
          )
        `)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (isOwner) {
        // Show Active, Draft, and Paused, but exclude Expired.
        // Also filter out offers that have passed their validity date
        query = query.in('status', ['active', 'draft', 'paused'])
          .gte('valid_until', new Date().toISOString());
      } else {
        // Consumers see only active, non-expired offers
        query = query.eq('status', 'active')
          .gte('valid_until', new Date().toISOString());
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

  // Sort offers: Active first (sorted by date desc), then expired (sorted by date desc)
  const sortedOffers = useMemo(() => {
    return [...offers].sort((a, b) => {
      const aExpired = isOfferExpired(a);
      const bExpired = isOfferExpired(b);

      // Active offers come first
      if (aExpired !== bExpired) {
        return aExpired ? 1 : -1;
      }

      // Within same status, sort by created_at (newest first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [offers]);

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
    if (offers.length === 0) {
      return (
        <p className="text-sm text-gray-500 text-center py-8">
          {isOwner
            ? 'No active offers yet. Create your first promotional offer!'
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sortedOffers.map((offer) => {
            const expired = isOfferExpired(offer);
            return (
              <div key={offer.id} className={`relative w-full ${expired ? 'opacity-75 grayscale-[0.5]' : ''}`}>
                <OfferCard
                  offer={offer}
                  onViewDetails={(o) => setSelectedOffer(o)}
                  onEdit={(o) => setEditingOffer(o)}
                  onViewAnalytics={isOwner ? (o) => console.log('View analytics', o.id) : undefined}
                  showActions={isOwner}
                  showStats={isOwner}
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

        {/* Manage Offers Button - show if owner and NOT compact */}
        {!compact && isOwner && showAddButton && (
          <button
            onClick={() => navigate(`${getBusinessUrl(businessId, businessName)}/offers`)}
            className="mt-4 w-full py-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors"
          >
            Manage Offers
          </button>
        )}
      </div>
    );
  };

  return (
    <div className={className}>
      {(showHeading || (isOwner && showAddButton)) && (
        <div className={`flex items-center mb-4 ${showHeading ? 'justify-between' : 'justify-end'}`}>
          {showHeading && (
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Tag className="w-5 h-5 mr-2 text-green-600" />
              Current Offers {totalCount > 0 && <span className="ml-2 text-sm text-gray-500">({totalCount})</span>}
            </h3>
          )}
          {isOwner && showAddButton && (
            <button
              onClick={() => {
                console.log('[FeaturedOffers] New Offer Button Clicked');
                setShowCreateForm(true);
              }}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Offer
            </button>
          )}
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
    </div >
  );
}
