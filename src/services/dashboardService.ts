import { supabase } from '../lib/supabase';

export interface DashboardStats {
  favoritesCount: number;
  reviewsCount: number;
  collectedCouponsCount: number;
  followingCount: number;
}

export interface SpotlightBusiness {
  id: string;
  name: string;
  category: string;
  location: string;
  rating: number;
  reviewCount: number;
  imageUrl: string | null;
  isPromoted: boolean;
  city: string;
}

export interface HotOffer {
  id: string;
  title: string;
  businessName: string;
  discount: string;
  expiresIn: string;
  imageUrl: string | null;
  validUntil: string;
  discountValue: number;
  businessId: string;
}

export interface TrendingProduct {
  id: string;
  name: string;
  business: string;
  price: string;
  category: string;
  isTrending: boolean;
  imageUrl?: string | null;
}

export const dashboardService = {
  async getDashboardStats(userId: string): Promise<DashboardStats> {
    try {
      // Get favorites count
      const { count: favoritesCount } = await supabase
        .from('business_followers')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Get reviews count
      const { count: reviewsCount } = await supabase
        .from('business_reviews')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Get collected coupons count
      const { count: collectedCouponsCount } = await supabase
        .from('user_coupon_collections')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'active');

      // Get following count (same as favorites for businesses)
      const { count: followingCount } = await supabase
        .from('business_followers')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      return {
        favoritesCount: favoritesCount || 0,
        reviewsCount: reviewsCount || 0,
        collectedCouponsCount: collectedCouponsCount || 0,
        followingCount: followingCount || 0,
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return {
        favoritesCount: 0,
        reviewsCount: 0,
        collectedCouponsCount: 0,
        followingCount: 0,
      };
    }
  },

  async getSpotlightBusinesses(limit = 3): Promise<SpotlightBusiness[]> {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('id, name, category, city, address, average_rating, total_reviews, logo_url, verified')
        .eq('status', 'active')
        .order('average_rating', { ascending: false })
        .order('total_reviews', { ascending: false })
        .limit(limit);

      if (error) throw error;

      if (!data || data.length === 0) {
        // Return dummy data marked as such
        return [];
      }

      return data.map(business => ({
        id: business.id,
        name: business.name,
        category: business.category || 'General',
        location: business.address || business.city,
        rating: Number(business.average_rating) || 0,
        reviewCount: business.total_reviews || 0,
        imageUrl: business.logo_url,
        isPromoted: business.verified || false,
        city: business.city,
      }));
    } catch (error) {
      console.error('Error fetching spotlight businesses:', error);
      return [];
    }
  },

  async getHotOffers(limit = 6): Promise<HotOffer[]> {
    try {
      const { data, error } = await supabase
        .from('offers')
        .select(`
          id,
          title,
          description,
          valid_until,
          business_id,
          status,
          view_count,
          share_count,
          created_at,
          icon_image_url
        `)
        .eq('status', 'active')
        .gte('valid_until', new Date().toISOString())
        // Sorting logic: Most relevant/engaging first
        // 1. Most shared (share_count) - highly viral
        // 2. Most viewed (view_count) - high interest
        // 3. Newest (created_at) - freshness fallback
        .order('share_count', { ascending: false })
        .order('view_count', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      if (!data || data.length === 0) {
        return [];
      }

      // Fetch business names separately since offers might not have foreign key set up for direct join in all generic queries yet
      // Or if relation exists, we could use it. Assuming relation 'business' exists based on schema.
      const businessIds = [...new Set(data.map(o => o.business_id))];
      const { data: businesses } = await supabase
        .from('businesses')
        .select('id, name')
        .in('id', businessIds);

      const businessMap = new Map(businesses?.map(b => [b.id, b.name]));

      return data.map(offer => {
        const validUntil = new Date(offer.valid_until);
        const now = new Date();
        const daysLeft = Math.ceil((validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const businessName = businessMap.get(offer.business_id) || 'Business';

        return {
          id: offer.id,
          title: offer.title,
          businessName: businessName,
          // Offers might not have numeric discount value stored simply, using description or a specialized parsing if available
          // For now, assuming title contains the deal or mapped from description
          discount: 'Offer', // Placeholder, real offers often have discount in title
          expiresIn: daysLeft > 1 ? `${daysLeft} days` : daysLeft === 1 ? '1 day' : 'Expiring soon',
          imageUrl: offer.icon_image_url,
          validUntil: offer.valid_until,
          discountValue: 0, // Offers table doesn't strictly have discount_value like coupons
          businessId: offer.business_id,
        };
      });
    } catch (error) {
      console.error('Error fetching hot offers:', error);
      return [];
    }
  },

  async getTrendingProducts(limit = 6): Promise<TrendingProduct[]> {
    try {
      const { data, error } = await supabase
        .from('business_products')
        .select(`
          id,
          name,
          price,
          category,
          is_trending,
          image_urls,
          businesses!inner(name)
        `)
        .eq('is_available', true)
        // Trending logic: 
        // 1. Most Favorited (favorite_count) - strong signal
        // 2. Most Shared (share_count) - viral signal
        // 3. System marked 'is_trending'
        // 4. Freshness
        .order('favorite_count', { ascending: false })
        .order('share_count', { ascending: false })
        .order('is_trending', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      if (!data || data.length === 0) {
        return [];
      }

      return data.map(product => {
        let businessName = 'Business';
        if (product.businesses) {
          if (Array.isArray(product.businesses) && product.businesses.length > 0) {
            businessName = (product.businesses[0] as any).name;
          } else if ((product.businesses as any).name) {
            businessName = (product.businesses as any).name;
          }
        }

        // Use first image if available
        const imageUrl = product.image_urls && Array.isArray(product.image_urls) && product.image_urls.length > 0
          ? product.image_urls[0]
          : null;

        return {
          id: product.id,
          name: product.name,
          business: businessName,
          price: `₹${Number(product.price).toFixed(0)}`,
          category: product.category || 'General',
          isTrending: product.is_trending || false,
          imageUrl: imageUrl
        };
      });
    } catch (error) {
      console.error('Error fetching trending products:', error);
      return [];
    }
  },
};
