// BusinessOffers.tsx
// Display and filter offers on business storefront Offers tab

import React, { useState, useEffect } from 'react';
import { Filter, Search, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { OfferShareModal } from '../offers/OfferShareModal';
import { OfferDetailModal } from '../offers/OfferDetailModal';
import { CompactOfferCard } from '../offers/CompactOfferCard';
import { useNavigate } from 'react-router-dom';
import type { Offer } from '../../types/offers';

interface BusinessOffersProps {
  businessId: string;
  businessName: string;
  isOwner: boolean;
  highlightedOfferCode?: string | null;
}

export const BusinessOffers: React.FC<BusinessOffersProps> = ({
  businessId,
  businessName,
  isOwner,
  highlightedOfferCode,
}) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [allOffers, setAllOffers] = useState<Offer[]>([]);
  const [filteredOffers, setFilteredOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareOffer, setShareOffer] = useState<Offer | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired'>('active');

  // Fetch all offers
  useEffect(() => {
    const fetchOffers = async () => {
      try {
        let query = supabase
          .from('offers')
          .select('*')
          .eq('business_id', businessId)
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        const { data, error } = await query;

        if (error) throw error;

        setAllOffers(data || []);

        // Track views for each offer
        if (data && data.length > 0 && !isOwner) {
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
  }, [businessId, user?.id, isOwner]);

  // Filter offers based on search and status
  useEffect(() => {
    let filtered = [...allOffers];

    // Status filter
    const now = new Date().toISOString();
    if (statusFilter === 'active') {
      filtered = filtered.filter(
        (offer) => 
          new Date(offer.valid_from).toISOString() <= now && 
          new Date(offer.valid_until).toISOString() >= now
      );
    } else if (statusFilter === 'expired') {
      filtered = filtered.filter(
        (offer) => new Date(offer.valid_until).toISOString() < now
      );
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (offer) =>
          offer.title.toLowerCase().includes(query) ||
          offer.description?.toLowerCase().includes(query) ||
          offer.offer_code.toLowerCase().includes(query)
      );
    }

    setFilteredOffers(filtered);
  }, [allOffers, searchQuery, statusFilter]);

  // Auto-scroll to highlighted offer
  useEffect(() => {
    if (highlightedOfferCode && allOffers.length > 0) {
      const offer = allOffers.find(o => o.offer_code === highlightedOfferCode);
      if (offer) {
        setTimeout(() => {
          const element = document.getElementById(`offer-${offer.id}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 500);
      }
    }
  }, [highlightedOfferCode, allOffers]);

  const handleShare = (offer: Offer) => {
    setShareOffer(offer);
  };

  const handleViewOffer = (offer: Offer) => {
    setSelectedOffer(offer);
  };

  const handleManageOffers = () => {
    navigate(`/business/${businessId}/offers`);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('active');
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Header with filters */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Offers & Promotions</h2>
            <p className="text-sm text-gray-600 mt-1">
              {filteredOffers.length} {filteredOffers.length === 1 ? 'offer' : 'offers'} found
            </p>
          </div>

          {isOwner && (
            <button
              onClick={handleManageOffers}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
            >
              Manage Offers
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search offers by title, description, or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'active'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter('expired')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'expired'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Expired
            </button>
          </div>

          {(searchQuery || statusFilter !== 'active') && (
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Offers List */}
      {filteredOffers.length > 0 ? (
        <div className="space-y-4">
          {filteredOffers.map((offer) => (
            <div key={offer.id} id={`offer-${offer.id}`}>
              <CompactOfferCard
                offer={offer}
                onShare={handleShare}
                onClick={handleViewOffer}
                highlighted={
                  highlightedOfferCode
                    ? offer.offer_code === highlightedOfferCode
                    : false
                }
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
          <Filter className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No offers found
          </h3>
          <p className="text-gray-600 mb-4">
            {searchQuery || statusFilter !== 'active'
              ? 'Try adjusting your filters to see more results.'
              : 'This business has no active offers at the moment.'}
          </p>
          {(searchQuery || statusFilter !== 'active') && (
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      )}

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
          showStats={isOwner}
        />
      )}
    </>
  );
};

export default BusinessOffers;
