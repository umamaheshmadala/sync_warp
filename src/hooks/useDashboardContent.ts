import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

export interface SpotlightBusiness {
  id: string;
  name: string;
  category: string;
  city: string;
  rating: number;
  review_count: number;
  logo_url: string | null;
  cover_image_url: string | null;
  is_promoted?: boolean;
}

export interface HotOffer {
  id: string;
  title: string;
  business_name: string;
  discount_type: string;
  discount_value: number;
  expires_at: string;
  business_id: string;
}

export interface TrendingProduct {
  id: string;
  name: string;
  business_name: string;
  price: number;
  category: string;
}

export const useDashboardContent = () => {
  const { profile } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [spotlightBusinesses, setSpotlightBusinesses] = useState<SpotlightBusiness[]>([]);
  const [hotOffers, setHotOffers] = useState<HotOffer[]>([]);
  const [trendingProducts, setTrendingProducts] = useState<TrendingProduct[]>([]);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true);
        setError(null);

        const userCity = profile?.city || null;

        // Fetch spotlight businesses (top-rated in user's city)
        const { data: businessesData, error: businessesError } = await supabase
          .from('businesses')
          .select('id, name, category, city, logo_url, cover_image_url')
          .eq('status', 'active')
          .eq('city', userCity || 'Hyderabad') // Fallback to Hyderabad if no city
          .order('created_at', { ascending: false })
          .limit(6);

        if (businessesError) throw businessesError;

        // Transform and add dummy ratings (TODO: add real ratings table)
        const businesses: SpotlightBusiness[] = (businessesData || []).map((b, idx) => ({
          ...b,
          rating: 4.5 + (Math.random() * 0.5), // [DUMMY] Replace with real ratings
          review_count: Math.floor(Math.random() * 100) + 20, // [DUMMY] Replace with real review counts
          is_promoted: idx === 0, // First business is promoted
        }));

        setSpotlightBusinesses(businesses);

        // Fetch hot offers (expiring soon)
        const { data: offersData, error: offersError } = await supabase
          .from('coupons')
          .select(`
            id,
            title,
            discount_type,
            discount_value,
            expires_at,
            business_id,
            businesses!inner (
              name
            )
          `)
          .eq('status', 'active')
          .gte('expires_at', new Date().toISOString())
          .order('expires_at', { ascending: true })
          .limit(4);

        if (offersError) throw offersError;

        const offers: HotOffer[] = (offersData || []).map((o: any) => ({
          id: o.id,
          title: o.title,
          business_name: o.businesses?.name || 'Unknown Business',
          discount_type: o.discount_type,
          discount_value: o.discount_value,
          expires_at: o.expires_at,
          business_id: o.business_id,
        }));

        setHotOffers(offers);

        // Fetch trending products
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select(`
            id,
            name,
            price,
            category,
            business_id,
            businesses!inner (
              name
            )
          `)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(6);

        if (productsError) throw productsError;

        const products: TrendingProduct[] = (productsData || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          business_name: p.businesses?.name || 'Unknown Business',
          price: p.price,
          category: p.category,
        }));

        setTrendingProducts(products);

      } catch (err) {
        console.error('Error fetching dashboard content:', err);
        setError('Failed to load dashboard content');
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [profile?.city]);

  return {
    spotlightBusinesses,
    hotOffers,
    trendingProducts,
    loading,
    error,
  };
};

export default useDashboardContent;