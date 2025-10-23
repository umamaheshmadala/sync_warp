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

  async getHotOffers(limit = 2): Promise<HotOffer[]> {
    try {
      const { data, error } = await supabase
        .from('business_coupons')
        .select(`
          id,
          title,
          discount_value,
          discount_type,
          valid_until,
          business_id,
          businesses!inner(name)
        `)
        .eq('status', 'active')
        .eq('is_public', true)
        .gte('valid_until', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      if (!data || data.length === 0) {
        return [];
      }

      return data.map(coupon => {
        const validUntil = new Date(coupon.valid_until);
        const now = new Date();
        const daysLeft = Math.ceil((validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        return {
          id: coupon.id,
          title: coupon.title,
          businessName: coupon.businesses?.name || 'Business',
          discount: coupon.discount_type === 'percentage' 
            ? `${coupon.discount_value}%` 
            : `₹${coupon.discount_value}`,
          expiresIn: daysLeft > 1 ? `${daysLeft} days` : daysLeft === 1 ? '1 day' : 'Expiring soon',
          imageUrl: null,
          validUntil: coupon.valid_until,
          discountValue: Number(coupon.discount_value),
          businessId: coupon.business_id,
        };
      });
    } catch (error) {
      console.error('Error fetching hot offers:', error);
      return [];
    }
  },

  async getTrendingProducts(limit = 3): Promise<TrendingProduct[]> {
    try {
      const { data, error } = await supabase
        .from('business_products')
        .select(`
          id,
          name,
          price,
          category,
          is_trending,
          businesses!inner(name)
        `)
        .eq('is_available', true)
        .order('is_trending', { ascending: false })
        .order('display_order', { ascending: false })
        .limit(limit);

      if (error) throw error;

      if (!data || data.length === 0) {
        return [];
      }

      return data.map(product => ({
        id: product.id,
        name: product.name,
        business: product.businesses?.name || 'Business',
        price: `₹${Number(product.price).toFixed(0)}`,
        category: product.category || 'General',
        isTrending: product.is_trending || false,
      }));
    } catch (error) {
      console.error('Error fetching trending products:', error);
      return [];
    }
  },
};
