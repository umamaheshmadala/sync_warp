import { useNavigate } from 'react-router-dom';
import { Package } from 'lucide-react';
import { useProductDisplay } from '../../hooks/useProductDisplay';
import { ProductCard } from './ProductCard';
import { LazyRender } from '../common/LazyRender';
import * as ReactWindow from 'react-window';
const gridKey = 'FixedSizeGrid';
const FixedSizeGrid = (ReactWindow as any)[gridKey];
import AutoSizer from 'react-virtualized-auto-sizer';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { useBusinessUrl } from '../../hooks/useBusinessUrl';

interface ProductGridProps {
  businessId: string;
  limit?: number;
  showViewAll?: boolean;
  onProductClick?: (productId: string) => void;
}

// Virtualization constants
const GUTTER_SIZE = 6;
const CARD_HEIGHT = 224;

interface CellProps {
  columnIndex: number;
  rowIndex: number;
  style: React.CSSProperties;
  data: {
    products: any[];
    columnCount: number;
    onProductClick?: (id: string) => void;
  };
}

const Cell = ({ columnIndex, rowIndex, style, data }: CellProps) => {
  const { products, columnCount, onProductClick } = data;
  const index = rowIndex * columnCount + columnIndex;
  const product = products[index];

  if (!product) return null;

  // Adjust style for gutter
  const left = parseFloat(style.left as string) + GUTTER_SIZE;
  const top = parseFloat(style.top as string) + GUTTER_SIZE;
  const width = parseFloat(style.width as string) - GUTTER_SIZE;
  const height = parseFloat(style.height as string) - GUTTER_SIZE;

  return (
    <div style={{ ...style, left, top, width, height }}>
      <ProductCard
        product={product}
        size="medium"
        showActions={true}
        onClick={() => onProductClick && onProductClick(product.id)}
      />
    </div>
  );
};

export function ProductGrid({
  businessId,
  limit = 4,
  showViewAll = true,
  onProductClick
}: ProductGridProps) {
  const navigate = useNavigate();
  const { getBusinessUrl } = useBusinessUrl();
  const { products, loading, error, hasMore } = useProductDisplay({
    businessId,
    limit
  });

  const handleViewAll = () => {
    // Extract business name from first product if available
    const businessName = products.length > 0 ? products[0].business?.name : undefined;
    navigate(`${getBusinessUrl(businessId, businessName)}/products/catalog`);
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
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5">
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
      <div className="h-[500px] w-full">
        <AutoSizer>
          {({ height, width }) => {
            // Responsive column count
            let columnCount = 3;
            if (width >= 1024) columnCount = 5; // lg
            else if (width >= 768) columnCount = 4; // md

            const columnWidth = width / columnCount;
            const rowCount = Math.ceil(products.length / columnCount);

            return (
              <FixedSizeGrid
                columnCount={columnCount}
                columnWidth={columnWidth}
                height={height}
                rowCount={rowCount}
                rowHeight={CARD_HEIGHT + GUTTER_SIZE}
                width={width}
                itemData={{ products, columnCount, onProductClick: handleProductClick }}
                className="scrollbar-hide"
                overscanRowCount={5}
              >
                {Cell}
              </FixedSizeGrid>
            );
          }}
        </AutoSizer>
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
