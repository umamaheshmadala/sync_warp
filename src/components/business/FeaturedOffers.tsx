// FeaturedOffers.tsx
// Display featured offers on business overview tab (similar to FeaturedProducts)

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tag, ExternalLink, Plus, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import { CompactOfferCard } from '../offers/CompactOfferCard';
import { OfferShareModal } from '../offers/OfferShareModal';
import { OfferDetailModal } from '../offers/OfferDetailModal';
import type { Offer } from '../../types/offers';

interface FeaturedOffersProps {
  businessId: string;
  businessName: string;
  isOwner: boolean;
}

const FeaturedOffers: React.FC<FeaturedOffersProps> = ({
  businessId,
  businessName,
  isOwner,
}) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareOffer, setShareOffer] = useState<Offer | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [showAllOffers, setShowAllOffers] = useState(false);
  const [allOffers, setAllOffers] = useState<Offer[]>([]);

  // Fetch active offers
  useEffect(() => {
    const fetchOffers = async () => {
      try {
        const { data, error } = await supabase
          .from('offers')
          .select('*')
          .eq('business_id', businessId)
          .eq('status', 'active')
          .lte('valid_from', new Date().toISOString())
          .gte('valid_until', new Date().toISOString())
          .order('created_at', { ascending: false });

        if (error) throw error;

        setAllOffers(data || []);
        // Show max 4 offers in overview
        setOffers((data || []).slice(0, 4));

        // Track views for each offer
        if (data && data.length > 0) {
          for (const offer of data) {
            await supabase.rpc('increment_offer_view_count', {
              p_offer_id: offer.id,
              p_user_id: user?.id || null,
            });
          }
        }
      } catch (error) {
        console.error('Error fetching offers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOffers();
  }, [businessId, user?.id]);

  const handleShare = (offer: Offer) => {
    setShareOffer(offer);
  };

  const handleViewOffer = (offer: Offer) => {
    setSelectedOffer(offer);
  };

  const handleManageOffers = () => {
    navigate(`/business/${businessId}/offers`);
  };

  const handleViewAllOffers = () => {
    // Navigate everyone to the offers management page
    navigate(`/business/${businessId}/offers`);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Offers & Promotions</h3>
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  // Don't show section if no offers
  if (offers.length === 0 && !isOwner) {
    return null;
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Tag className="w-5 h-5 text-indigo-600 mr-2" />
            Current Offers & Promotions
          </h3>

          <div className="flex items-center space-x-3">
            {allOffers.length > 0 && (
              <button
                onClick={handleViewAllOffers}
                className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                View All ({allOffers.length})
                <ExternalLink className="w-4 h-4 ml-1" />
              </button>
            )}

            {isOwner && (
              <button
                onClick={handleManageOffers}
                className="inline-flex items-center px-3 py-2 border border-indigo-300 rounded-md text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
              >
                <Tag className="w-4 h-4 mr-2" />
                Manage Offers
              </button>
            )}
          </div>
        </div>

        {offers.length > 0 ? (
          <div className="space-y-4">
            {offers.map((offer, index) => (
              <motion.div
                key={offer.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <CompactOfferCard
                  offer={offer}
                  onShare={handleShare}
                  onClick={handleViewOffer}
                />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="mx-auto h-16 w-16 text-gray-400 mb-4">
              <Tag className="w-full h-full" />
            </div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">No active offers</h3>
            <p className="text-sm text-gray-500 mb-4">
              {isOwner
                ? 'Create your first promotional offer to attract more customers.'
                : "This business doesn't have any active offers at the moment."}
            </p>
            {isOwner && (
              <button
                onClick={handleManageOffers}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Offer
              </button>
            )}
          </div>
        )}
      </div>

      {/* Share Modal */}
      {shareOffer && (
        <OfferShareModal offer={shareOffer} onClose={() => setShareOffer(null)} />
      )}

      {/* Offer Detail Modal */}
      {selectedOffer && (
        <OfferDetailModal
          offer={selectedOffer}
          onClose={() => setSelectedOffer(null)}
          onShare={handleShare}
          showStats={false}
        />
      )}

      {/* View All Offers Modal */}
      <AnimatePresence>
        {showAllOffers && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowAllOffers(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">
                    All Offers - {businessName}
                  </h2>
                  <button
                    onClick={() => setShowAllOffers(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6 max-h-[70vh] overflow-y-auto">
                <div className="space-y-4">
                  {allOffers.map((offer) => (
                    <CompactOfferCard
                      key={offer.id}
                      offer={offer}
                      onShare={handleShare}
                      onClick={(clickedOffer) => {
                        setShowAllOffers(false);
                        handleViewOffer(clickedOffer);
                      }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default FeaturedOffers;
