import { useState, useEffect } from 'react';
import { Product } from '../../types/product';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, SlidersHorizontal } from 'lucide-react';
import { useProducts } from '../../hooks/useProducts';
import { ProductCard } from './ProductCard';
import { LazyRender } from '../common/LazyRender';
import { Button } from '../ui/button';
import { useBusinessUrl } from '../../hooks/useBusinessUrl';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Skeleton } from '../ui/skeleton';
import * as ReactWindow from 'react-window';
const gridKey = 'FixedSizeGrid';
const FixedSizeGrid = (ReactWindow as any)[gridKey];
import AutoSizer from 'react-virtualized-auto-sizer';

type SortOption = 'newest' | 'price-low' | 'price-high' | 'name-asc' | 'name-desc';

// Virtualization constants
const GUTTER_SIZE = 6;
const CARD_HEIGHT = 224;

interface CellProps {
  columnIndex: number;
  rowIndex: number;
  style: React.CSSProperties;
  data: {
    products: Product[];
    columnCount: number;
  };
}

const Cell = ({ columnIndex, rowIndex, style, data }: CellProps) => {
  const { products, columnCount } = data;
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
      />
    </div>
  );
};

export function AllProducts() {
  const { businessId } = useParams<{ businessId: string }>();
  const navigate = useNavigate();
  const { getBusinessUrl } = useBusinessUrl();
  const { products, loading, error, fetchProducts } = useProducts(businessId);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  // const PRODUCTS_PER_PAGE = 12; // Removed in favor of virtualization

  // Extract unique categories from products
  const categories = ['all', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];

  // Fetch products on mount
  useEffect(() => {
    if (businessId) {
      fetchProducts(businessId);
    }
  }, [businessId]);

  // Apply filters and sorting
  useEffect(() => {
    let filtered = [...products];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(term) ||
        product.description?.toLowerCase().includes(term) ||
        product.category?.toLowerCase().includes(term)
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'price-low':
          return (a.price || 0) - (b.price || 0);
        case 'price-high':
          return (b.price || 0) - (a.price || 0);
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        default:
          return 0;
      }
    });

    setFilteredProducts(filtered);
    setFilteredProducts(filtered);
    // setCurrentPage(1); // Virtualization doesn't need pages
  }, [products, searchTerm, selectedCategory, sortBy]);

  // Pagination removal - verify usage of filteredProducts directly
  const currentProducts = filteredProducts; // Use all filtered products for virtualization

  const handleBack = () => {
    // Extract business name from first product if available
    const businessName = products.length > 0 ? products[0].business?.name : undefined;
    navigate(getBusinessUrl(businessId!, businessName));
  };

  // Pagination handled by virtualization

  // Loading State
  if (loading) {
    return (
      <div className="container mx-auto max-w-7xl p-4">
        <Skeleton className="mb-4 h-10 w-32" />
        <Skeleton className="mb-6 h-12 w-full" />
        <div className="mb-6 flex gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5">
          {Array.from({ length: 12 }).map((_, i) => (
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
      <div className="container mx-auto max-w-7xl p-4">
        <Button variant="ghost" onClick={handleBack} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Store
        </Button>
        <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-sm text-red-600">Failed to load products. Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl p-4">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={handleBack} className="mb-4" data-testid="back-button">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Store
        </Button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">All Products</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'} found
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="search-input"
          />
        </div>

        {/* Filters and Sort */}
        <div className="flex flex-wrap gap-3">
          {/* Category Filter */}
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full md:w-48" data-testid="category-filter">
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category === 'all' ? 'All Categories' : category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sort Options */}
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
            <SelectTrigger className="w-full md:w-48" data-testid="sort-select">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
              <SelectItem value="name-asc">Name: A to Z</SelectItem>
              <SelectItem value="name-desc">Name: Z to A</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Products Grid */}
      {currentProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <Search className="h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">No products found</h3>
          <p className="mt-2 text-sm text-gray-600">
            Try adjusting your search or filter to find what you're looking for.
          </p>
          {(searchTerm || selectedCategory !== 'all') && (
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="h-[calc(100vh-280px)] w-full min-h-[500px]" data-testid="products-grid">
            <AutoSizer>
              {({ height, width }) => {
                // Responsive column count
                let columnCount = 3;
                if (width >= 1024) columnCount = 5; // lg
                else if (width >= 768) columnCount = 4; // md

                const columnWidth = width / columnCount;
                const rowCount = Math.ceil(currentProducts.length / columnCount);

                return (
                  <FixedSizeGrid
                    columnCount={columnCount}
                    columnWidth={columnWidth}
                    height={height}
                    rowCount={rowCount}
                    rowHeight={CARD_HEIGHT + GUTTER_SIZE}
                    width={width}
                    itemData={{ products: currentProducts, columnCount }}
                    className="scrollbar-hide"
                    overscanRowCount={5}
                  >
                    {Cell}
                  </FixedSizeGrid>
                );
              }}
            </AutoSizer>
          </div>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Showing {currentProducts.length} products
          </p>
        </>
      )}
    </div>
  );
}
