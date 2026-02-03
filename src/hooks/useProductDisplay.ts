import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Product } from '../types/product';

interface UseProductDisplayProps {
  businessId: string;
  limit?: number;
}

interface UseProductDisplayReturn {
  products: Product[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
}

export function useProductDisplay({
  businessId,
  limit = 4
}: UseProductDisplayProps): UseProductDisplayReturn {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    async function fetchProducts() {
      if (!businessId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch products with priority:
        // 1. is_featured = true
        // 2. created_at DESC (newest)
        // 3. LIMIT specified
        const { data, error: fetchError, count } = await supabase
          .from('products')
          .select('*', { count: 'exact' })
          .eq('business_id', businessId)
          .eq('status', 'published')
          .order('is_featured', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(limit);

        if (fetchError) throw fetchError;

        if (!isCancelled) {
          const mappedData = (data || []).map(p => {
            // Extract image URLs form images JSONB
            let imageUrls: string[] = [];
            if (p.images && Array.isArray(p.images)) {
              imageUrls = p.images.map((img: any) =>
                typeof img === 'string' ? img : img.url
              ).filter(Boolean);
            }
            return {
              ...p,
              image_urls: imageUrls,
              is_available: p.status === 'published'
            }
          });
          setProducts(mappedData as unknown as Product[]);
          setHasMore((count || 0) > limit);
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error('Error fetching products:', err);
          setError(err.message || 'Failed to load products');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    fetchProducts();

    return () => {
      isCancelled = true;
    };
  }, [businessId, limit]);

  return {
    products,
    loading,
    error,
    hasMore
  };
}
