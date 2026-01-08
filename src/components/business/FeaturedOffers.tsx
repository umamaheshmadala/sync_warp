// src/components/business/FeaturedOffers.tsx
import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Tag, ChevronRight, Calendar, TrendingUp, X, Heart, Edit3, CheckCircle, AlertCircle, Plus, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import type { Offer } from '@/types/offers';
import { useBusinessUrl } from '@/hooks/useBusinessUrl';
import { ShareDeal } from '@/components/ShareDeal';
import { CreateOfferForm } from '@/components/offers/CreateOfferForm';
import { useAuthStore } from '@/store/authStore';
import { getCategoryIcon } from '@/utils/iconMap';




interface FeaturedOffersProps {
  businessId: string;
  businessName: string;
  isOwner: boolean;
  initialOfferId?: string | null;
  shareId?: string | null;
  compact?: boolean;
  onViewAll?: () => void; // Callback to switch to Offers tab
}

export default function FeaturedOffers({
  businessId,
  businessName,
  isOwner,
  initialOfferId,
  shareId,
  compact = false,
  onViewAll
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
        query = query.in('status', ['active', 'expired', 'draft', 'paused']);
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
      setOffers(data || []);
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
      <div className="bg-white rounded-lg shadow-sm border p-6">
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
        <p className="hidden md:block text-sm text-gray-600 mb-4">
          {isOwner
            ? 'Your active promotional offers. Track performance and manage them anytime.'
            : 'Check out the latest deals and promotions from this business.'}
        </p>

        <div className="space-y-3">
          {sortedOffers.map((offer) => {
            const expired = isOfferExpired(offer);
            return (
              <div
                key={offer.id}
                onClick={() => setSelectedOffer(offer)}
                className={`border rounded-xl p-4 hover:shadow-md transition-all cursor-pointer group ${expired
                  ? 'border-gray-200 bg-gray-50 opacity-75'
                  : 'border-gray-200 hover:border-indigo-300 bg-white'
                  }`}
              >
                <div className="flex items-start gap-4">
                  {/* Left Column: Dedicated Icon Space */}
                  <div className="flex-shrink-0">
                    <div className={`w-12 h-12 md:w-16 md:h-16 rounded-lg flex items-center justify-center border ${expired ? 'bg-gray-100 border-gray-200' : 'bg-indigo-50 border-indigo-100'
                      }`}>
                      {expired ? (
                        <AlertCircle className="w-6 h-6 md:w-8 md:h-8 text-gray-400" />
                      ) : offer.offer_type?.category ? (
                        (() => {
                          const Icon = getCategoryIcon(offer.offer_type.category.icon_name);
                          return <Icon className="w-6 h-6 md:w-8 md:h-8 text-indigo-600" />;
                        })()
                      ) : (
                        <CheckCircle className="w-6 h-6 md:w-8 md:h-8 text-indigo-600" />
                      )}
                    </div>
                  </div>

                  {/* Right Column: Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className={`font-semibold text-lg leading-tight mb-1 ${expired
                          ? 'text-gray-500'
                          : 'text-gray-900 group-hover:text-indigo-600 transition-colors'
                          }`}>
                          {offer.title}
                        </h4>
                        {offer.description && (
                          <p className="text-sm text-gray-600 mb-2 hidden lg:line-clamp-2">
                            {offer.description}
                          </p>
                        )}
                      </div>

                      {/* Status / Type Badge */}
                      <div className="flex-shrink-0 flex flex-col items-end gap-2">
                        {offer.offer_type && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100 whitespace-nowrap">
                            {offer.offer_type.offer_name}
                          </span>
                        )}
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${expired
                          ? 'bg-gray-100 text-gray-600'
                          : 'bg-green-100 text-green-700'
                          }`}>
                          {expired ? 'Expired' : 'Active'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center flex-wrap gap-4 mt-1 text-xs text-gray-500">
                      <span className="flex items-center">
                        <Calendar className="w-3.5 h-3.5 mr-1.5" />
                        {expired ? 'Expired' : `Valid until ${new Date(offer.valid_until).toLocaleDateString()}`}
                      </span>
                      {isOwner && (
                        <span className="flex items-center">
                          <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
                          {offer.view_count} views
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
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
        {!compact && isOwner && (
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
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Tag className="w-5 h-5 mr-2 text-green-600" />
          Current Offers {totalCount > 0 && <span className="ml-2 text-sm text-gray-500">({totalCount})</span>}
        </h3>
        {isOwner && (
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

      {renderContent()}

      {/* Offer Details Modal */}
      {selectedOffer && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Offer Details</h2>
              <div className="flex items-center gap-2">
                {isOwner && (
                  <button
                    onClick={() => {
                      setEditingOffer(selectedOffer);
                      setSelectedOffer(null);
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  >
                    <Edit3 className="h-4 w-4" />
                    Edit
                  </button>
                )}
                <button
                  onClick={handleCloseModal}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-600" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Title and Code */}
              <div>
                <h3 className="text-2xl font-bold text-gray-900">{selectedOffer.title}</h3>
                <p className="text-sm text-gray-500 mt-2">
                  Code: <span className="font-mono font-semibold text-purple-600">{selectedOffer.offer_code}</span>
                </p>
              </div>

              {/* Description */}
              {selectedOffer.description && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Description</h4>
                  <p className="text-gray-600">{selectedOffer.description}</p>
                </div>
              )}

              {/* Terms & Conditions */}
              {selectedOffer.terms_conditions && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Terms & Conditions</h4>
                  <p className="text-gray-600 whitespace-pre-wrap">{selectedOffer.terms_conditions}</p>
                </div>
              )}

              {/* Validity */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Validity Period</h4>
                <p className="text-gray-600">
                  From: {new Date(selectedOffer.valid_from).toLocaleDateString()}<br />
                  Until: {new Date(selectedOffer.valid_until).toLocaleDateString()}
                </p>
              </div>

              {/* Share Section */}
              <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Share this Offer</h4>
                  <ShareDeal deal={selectedOffer} variant="default" size="default" />
                </div>

                {/* Save Deal Button */}
                {!isOwner && (
                  <button
                    onClick={async () => {
                      toast.success('Deal saved!');
                      if (shareId && initialOfferId === selectedOffer.id) {
                        const { trackShareConversion } = await import('@/services/analyticsService');
                        trackShareConversion(shareId, selectedOffer.id, 'save');
                      }
                    }}
                    className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <Heart className="w-4 h-4 mr-2" />
                    Save Deal
                  </button>
                )}
              </div>

              {/* Stats */}
              {isOwner && (
                <div className="pt-4 border-t border-gray-100">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Performance</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">{selectedOffer.view_count}</p>
                      <p className="text-xs text-gray-600 mt-1">Views</p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <p className="text-2xl font-bold text-purple-600">{selectedOffer.share_count}</p>
                      <p className="text-xs text-gray-600 mt-1">Shares</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">{selectedOffer.click_count}</p>
                      <p className="text-xs text-gray-600 mt-1">Clicks</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        , document.body)}

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
