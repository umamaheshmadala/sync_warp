// src/components/business/FeaturedOffers.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tag, ChevronRight, Calendar, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Offer } from '@/types/offers';

interface FeaturedOffersProps {
  businessId: string;
  businessName: string;
  isOwner: boolean;
}

export default function FeaturedOffers({ businessId, businessName, isOwner }: FeaturedOffersProps) {
  const navigate = useNavigate();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchOffers();
  }, [businessId]);

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

      // Get first 4 offers
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .eq('business_id', businessId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(4);

      if (error) throw error;
      setOffers(data || []);
    } catch (error) {
      console.error('Error fetching offers:', error);
    } finally {
      setLoading(false);
    }
  };

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

  if (offers.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Tag className="w-5 h-5 mr-2 text-green-600" />
            Current Offers
          </h3>
          {isOwner && (
            <button
              onClick={() => navigate(`/business/${businessId}/offers`)}
              className="flex items-center px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              Manage Offers
              <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          )}
        </div>
        <p className="text-sm text-gray-500 text-center py-8">
          {isOwner 
            ? 'No active offers yet. Create your first promotional offer!' 
            : 'No current offers available.'}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Tag className="w-5 h-5 mr-2 text-green-600" />
          Current Offers {totalCount > 0 && <span className="ml-2 text-sm text-gray-500">({totalCount})</span>}
        </h3>
        <button
          onClick={() => navigate(`/business/${businessId}/offers`)}
          className="flex items-center px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors"
        >
          {totalCount > 4 ? `View All (${totalCount})` : isOwner ? 'Manage Offers' : 'View All'}
          <ChevronRight className="w-4 h-4 ml-1" />
        </button>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        {isOwner 
          ? 'Your active promotional offers. Track performance and manage them anytime.'
          : 'Check out the latest deals and promotions from this business.'}
      </p>

      <div className="space-y-3">
        {offers.map((offer) => (
          <div
            key={offer.id}
            onClick={() => navigate(`/business/${businessId}/offers?highlight=${offer.offer_code}`)}
            className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                  {offer.title}
                </h4>
                {offer.description && (
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {offer.description}
                  </p>
                )}
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  <span className="flex items-center">
                    <Calendar className="w-3 h-3 mr-1" />
                    Valid until {new Date(offer.valid_until).toLocaleDateString()}
                  </span>
                  {isOwner && (
                    <span className="flex items-center">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      {offer.view_count} views
                    </span>
                  )}
                </div>
              </div>
              <div className="ml-4 flex-shrink-0">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {offer.offer_code}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {totalCount > 4 && (
        <button
          onClick={() => navigate(`/business/${businessId}/offers`)}
          className="mt-4 w-full py-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors"
        >
          View {totalCount - 4} more offer{totalCount - 4 !== 1 ? 's' : ''}
        </button>
      )}
    </div>
  );
}
