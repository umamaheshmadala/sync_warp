// WishlistPage.tsx
// Page for viewing user's wishlist products

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { List, ArrowLeft, Package, Sparkles } from 'lucide-react';
import { useSimpleProductSocial } from '../hooks/useSimpleProductSocial';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { ProductCard } from '../components/products/ProductCard';
import { supabase } from '../lib/supabase';
import type { Product } from '../types/product';

export default function WishlistPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { isInWishlist, wishlistCount } = useSimpleProductSocial();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadWishlistProducts();
  }, [user, wishlistCount]);

  const loadWishlistProducts = async () => {
    try {
      setLoading(true);
      
      // Get wishlist product IDs from localStorage
      const stored = localStorage.getItem(`wishlist_${user?.id}`);
      if (!stored) {
        setProducts([]);
        setLoading(false);
        return;
      }

      const wishlistIds: string[] = JSON.parse(stored);
      
      if (wishlistIds.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }

      // Fetch products from database
      const { data, error } = await supabase
        .from('business_products')
        .select('*')
        .in('id', wishlistIds);

      if (error) throw error;

      setProducts(data || []);
    } catch (error) {
      console.error('Failed to load wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="container mx-auto max-w-7xl p-4">
        <Skeleton className="mb-4 h-10 w-32" />
        <Skeleton className="mb-8 h-12 w-64" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-80 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl p-4">
      {/* Header */}
      <Button
        variant="ghost"
        onClick={handleBack}
        className="mb-4"
        data-testid="back-button"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold">
            <List className="h-8 w-8 text-blue-600" />
            My Wishlist
          </h1>
          <p className="mt-2 text-muted-foreground">
            {wishlistCount === 0
              ? 'Your wishlist is empty'
              : `${wishlistCount} ${wishlistCount === 1 ? 'item' : 'items'} in your wishlist`}
          </p>
        </div>
      </div>

      {/* Empty State */}
      {products.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <div className="mb-4 rounded-full bg-blue-50 p-4">
            <Package className="h-12 w-12 text-blue-600" />
          </div>
          <h3 className="mb-2 text-xl font-semibold text-gray-900">
            Your wishlist is empty
          </h3>
          <p className="mb-6 max-w-md text-sm text-gray-600">
            Start adding products you love to your wishlist. They'll appear here for easy access later!
          </p>
          <Button
            onClick={() => navigate('/')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Discover Products
          </Button>
        </div>
      )}

      {/* Product Grid */}
      {products.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              size="medium"
              showActions={true}
            />
          ))}
        </div>
      )}

      {/* Info Banner */}
      {products.length > 0 && (
        <div className="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                💡 Tip: Your wishlist is saved locally on this device
              </p>
              <p className="mt-1 text-xs text-gray-600">
                Products in your wishlist are stored in your browser. Clear your browser data and they'll be removed.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
