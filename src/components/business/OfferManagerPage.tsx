// src/components/business/OfferManagerPage.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { useBusinessUrl } from '@/hooks/useBusinessUrl';
import { OffersList, CreateOfferForm, OfferAnalyticsDashboard } from '../offers';
import { ExtendExpiryModal } from '../offers/ExtendExpiryModal';
import { useOffers } from '@/hooks/useOffers';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import type { Offer } from '@/types/offers';
import toast from 'react-hot-toast';

export default function OfferManagerPage() {
  const { businessId } = useParams<{ businessId: string }>();
  const navigate = useNavigate();
  const { getBusinessUrl } = useBusinessUrl();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const [business, setBusiness] = useState<any>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);
  const [analyticsOfferId, setAnalyticsOfferId] = useState<string | null>(null);
  const [extendOffer, setExtendOffer] = useState<Offer | null>(null);
  const [viewDetailsOffer, setViewDetailsOffer] = useState<Offer | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [highlightedOfferCode, setHighlightedOfferCode] = useState<string | null>(null);

  const { extendExpiry, duplicateOffer } = useOffers({
    businessId: businessId || '',
    autoFetch: false,
  });

  // Check ownership
  useEffect(() => {
    const checkOwnership = async () => {
      if (!businessId || !user) {
        setLoading(false);
        return;
      }

      try {
        // Query business by slug
        const { data, error } = await supabase
          .from('businesses')
          .select('id, user_id, business_name')
          .eq('slug', businessId)
          .single();

        if (error) {
          // If slug query fails, try as UUID (for backward compatibility)
          const { data: uuidData, error: uuidError } = await supabase
            .from('businesses')
            .select('id, user_id, business_name')
            .eq('id', businessId)
            .single();

          if (uuidError) throw uuidError;

          setBusiness(uuidData);
          setIsOwner(uuidData.user_id === user.id);
        } else {
          setBusiness(data);
          setIsOwner(data.user_id === user.id);
        }
      } catch (error) {
        console.error('Error checking ownership:', error);
        toast.error('Failed to load business information');
      } finally {
        setLoading(false);
      }
    };

    checkOwnership();
  }, [businessId, user]);

  // Handle offer highlight/open from URL (notification clicks)
  useEffect(() => {
    const offerCode = searchParams.get('offer') || searchParams.get('highlight');
    if (offerCode) {
      setHighlightedOfferCode(offerCode);

      // Fetch and open the offer in modal view
      const fetchAndOpenOffer = async () => {
        try {
          const { data, error } = await supabase
            .from('offers')
            .select('*')
            .eq('business_id', businessId)
            .eq('offer_code', offerCode)
            .single();

          if (error) throw error;
          if (data) {
            setViewDetailsOffer(data);
          }
        } catch (error) {
          console.error('Error fetching offer from notification:', error);
          toast.error('Could not load the offer');
        }
      };

      fetchAndOpenOffer();

      // Clear highlight after 5 seconds (visual feedback)
      setTimeout(() => setHighlightedOfferCode(null), 5000);
    }
  }, [searchParams, businessId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!businessId || !user || !business) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Please log in to view offers</p>
        </div>
      </div>
    );
  }

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(getBusinessUrl(businessId!, business?.business_name))}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {isOwner ? 'Offer Management' : `Offers - ${business.business_name}`}
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  {isOwner
                    ? 'Create and manage promotional offers for your business'
                    : 'Browse current offers and promotions'}
                </p>
              </div>
            </div>
            {isOwner && (
              <button
                onClick={() => {
                  setEditingOfferId(null);
                  setShowCreateForm(true);
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus className="h-5 w-5" />
                <span>Create Offer</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isOwner ? (
          /* Owner View: Full management with OffersList */
          <OffersList
            key={refreshTrigger}
            businessId={businessId}
            onCreateOffer={() => {
              setEditingOfferId(null);
              setShowCreateForm(true);
            }}
            onEditOffer={(offerId) => {
              setEditingOfferId(offerId);
              setShowCreateForm(true);
            }}
            onViewDetails={(offer) => setViewDetailsOffer(offer)}
            onViewAnalytics={(offer) => setAnalyticsOfferId(offer.id)}
            onExtendExpiry={(offer) => setExtendOffer(offer)}
            onDuplicate={async (offer) => {
              const newOffer = await duplicateOffer(offer.id);
              if (newOffer) {
                toast.success('Offer duplicated as draft');
                handleRefresh();
              }
            }}
            showActions={true}
          />
        ) : (
          /* Customer View: Read-only with OffersList (no management actions) */
          <OffersList
            key={refreshTrigger}
            businessId={businessId}
            onCreateOffer={() => { }}
            onEditOffer={() => { }}
            onViewDetails={(offer) => setViewDetailsOffer(offer)}
            onViewAnalytics={() => { }}
            onExtendExpiry={() => { }}
            onDuplicate={() => { }}
            showActions={false}
          />
        )}
      </div>

      {/* Create/Edit Offer Modal - Owner Only */}
      {isOwner && showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <CreateOfferForm
                businessId={businessId}
                userId={user.id}
                offerId={editingOfferId || undefined}
                onComplete={() => {
                  setShowCreateForm(false);
                  setEditingOfferId(null);
                  toast.success('Offer saved successfully!');
                  handleRefresh();
                }}
                onCancel={() => {
                  setShowCreateForm(false);
                  setEditingOfferId(null);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Analytics Modal - Owner Only */}
      {isOwner && analyticsOfferId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Offer Analytics</h2>
              <button
                onClick={() => setAnalyticsOfferId(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>
            <div className="p-6">
              <OfferAnalyticsDashboard offerId={analyticsOfferId} />
            </div>
          </div>
        </div>
      )}

      {/* Extend Expiry Modal - Owner Only */}
      {isOwner && extendOffer && (
        <ExtendExpiryModal
          offer={extendOffer}
          onExtend={async (days) => {
            const success = await extendExpiry(extendOffer.id, days);
            if (success) {
              toast.success(`Offer expiry extended by ${days} days`);
              handleRefresh();
            } else {
              toast.error('Failed to extend offer expiry');
            }
            setExtendOffer(null);
          }}
          onClose={() => setExtendOffer(null)}
        />
      )}

      {/* Offer Details Modal */}
      {viewDetailsOffer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Offer Details</h2>
              <button
                onClick={() => setViewDetailsOffer(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Title and Code */}
              <div>
                <h3 className="text-2xl font-bold text-gray-900">{viewDetailsOffer.title}</h3>
                <p className="text-sm text-gray-500 mt-2">
                  Code: <span className="font-mono font-semibold text-purple-600">{viewDetailsOffer.offer_code}</span>
                </p>
              </div>

              {/* Description */}
              {viewDetailsOffer.description && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Description</h4>
                  <p className="text-gray-600">{viewDetailsOffer.description}</p>
                </div>
              )}

              {/* Terms & Conditions */}
              {viewDetailsOffer.terms_conditions && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Terms & Conditions</h4>
                  <p className="text-gray-600 whitespace-pre-wrap">{viewDetailsOffer.terms_conditions}</p>
                </div>
              )}

              {/* Validity */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Validity Period</h4>
                <p className="text-gray-600">
                  From: {new Date(viewDetailsOffer.valid_from).toLocaleDateString()}<br />
                  Until: {new Date(viewDetailsOffer.valid_until).toLocaleDateString()}
                </p>
              </div>

              {/* Stats */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Performance</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{viewDetailsOffer.view_count}</p>
                    <p className="text-xs text-gray-600 mt-1">Views</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <p className="text-2xl font-bold text-purple-600">{viewDetailsOffer.share_count}</p>
                    <p className="text-xs text-gray-600 mt-1">Shares</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{viewDetailsOffer.click_count}</p>
                    <p className="text-xs text-gray-600 mt-1">Clicks</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
