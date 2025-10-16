import { useNavigate } from 'react-router-dom';
import { Package } from 'lucide-react';
import { useProductDisplay } from '../../hooks/useProductDisplay';
import { ProductCard } from './ProductCard';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';

interface ProductGridProps {
  businessId: string;
  limit?: number;
  showViewAll?: boolean;
  onProductClick?: (productId: string) => void;
}

export function ProductGrid({
  businessId,
  limit = 4,
  showViewAll = true,
  onProductClick
}: ProductGridProps) {
  const navigate = useNavigate();
  const { products, loading, error, hasMore } = useProductDisplay({
    businessId,
    limit
  });

  const handleViewAll = () => {
    navigate(`/business/${businessId}/products`);
  };

  const handleProductClick = (productId: string) => {
    if (onProductClick) {
      onProductClick(productId);
    }
  };

  // Loading State
  if (loading) {
    return (
      <div className="space-y-4" data-testid="product-grid-loading">
        <h2 className="text-xl font-bold">Featured Products</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: limit }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-56 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-600">Failed to load products. Please try again later.</p>
      </div>
    );
  }

  // Empty State
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
        <Package className="h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-semibold text-gray-900">No products yet</h3>
        <p className="mt-2 text-sm text-gray-600">
          This business hasn't added any products yet. Check back later!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="product-grid">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Featured Products</h2>
        {showViewAll && hasMore && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleViewAll}
            className="text-primary hover:text-primary/80"
          >
            View All →
          </Button>
        )}
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            size="medium"
            showActions={true}
            onClick={() => handleProductClick(product.id)}
          />
        ))}
      </div>

      {/* View All Button (bottom) */}
      {showViewAll && hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            onClick={handleViewAll}
            className="w-full md:w-auto"
          >
            View All {hasMore ? 'Products' : ''}
          </Button>
        </div>
      )}
    </div>
  );
}
