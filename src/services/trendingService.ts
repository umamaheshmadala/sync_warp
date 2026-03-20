import { supabase } from '../lib/supabase';

export interface TrendingProduct {
  product_id: string;
  product_name: string;
  image_url: string;
  business_name: string;
  l3_category: string;
  trending_score: number;
  rank: number;
}

export interface ProductTrendingRank {
  rank: number | null;
  l2_category_id: string | null;
  l2_category_name: string | null;
}

export const trendingService = {
  /**
   * Retrieves top trending products for a specific L2 category.
   */
  async getTrendingProducts(l2CategoryId: string, limit: number = 100): Promise<TrendingProduct[]> {
    const { data, error } = await supabase.rpc('get_trending_products_by_category', {
      p_l2_category_id: l2CategoryId,
      p_limit: limit
    });

    if (error) {
      console.error('[TrendingService] Error fetching trending products:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Retrieves the trending rank and category context for a specific product.
   */
  async getProductTrendingRank(productId: string): Promise<ProductTrendingRank> {
    const { data, error } = await supabase.rpc('get_product_trending_rank', {
      p_product_id: productId
    });

    if (error) {
      console.error('[TrendingService] Error fetching product trending rank:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      return { rank: null, l2_category_id: null, l2_category_name: null };
    }

    return {
      rank: data[0].rank,
      l2_category_id: data[0].l2_category_id || null,
      l2_category_name: data[0].l2_category_name || null
    };
  }
};
