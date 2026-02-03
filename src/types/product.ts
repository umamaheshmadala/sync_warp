// Product-related TypeScript interfaces
// Following the database schema from products table (formerly business_products)

export interface Product {
  id: string;
  business_id: string;
  name: string;
  description?: string;
  category?: string; // Legacy?
  price?: number;
  currency: string;
  is_available: boolean; // Legacy? Mapped to status
  is_featured: boolean; // Legacy? Mapped to tags
  display_order: number;

  // New Epic 12 fields
  images?: any[]; // Allow object array from JSONB or strings
  tags?: string[];
  status?: string; // 'published', 'draft', 'sold_out', etc.
  like_count?: number;
  comment_count?: number;
  share_count?: number;

  image_urls: string[]; // Legacy
  image_url?: string; // Legacy
  last_updated_at?: string;
  created_at: string;
  updated_at: string;
  business?: {
    name: string;
    slug?: string;
  };
  businesses?: {
    business_name: string;
    slug?: string;
    logo_url?: string;
  } | { business_name: string; slug?: string }[]; // Handle array or single depending on query
}

export interface ProductFormData {
  name: string;
  description?: string;
  category?: string;
  price?: number;
  currency: string;
  is_available: boolean;
  is_featured: boolean; // Featured products show in storefront
  display_order: number; // Only used for trending products
  image_urls?: string[];
  status?: string;
  tags?: string[];
}

export interface ProductCategory {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  icon_name?: string;
  parent_category_id?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface ProductFilters {
  category?: string;
  availability?: boolean;
  featured?: boolean; // Filter by featured products
  sortBy?: 'name' | 'created_at' | 'display_order';
  sortOrder?: 'asc' | 'desc';
}

export interface ProductUpload {
  images: File[];
  video?: File;
}

// Simplified currency options
export const CURRENCIES = [
  { value: 'INR', label: '₹ Indian Rupee', symbol: '₹' }
] as const;

// Product limits
export const PRODUCT_LIMITS = {
  MAX_PRODUCTS_PER_BUSINESS: 100,
  AUTO_DELETE_DAYS: 365,
  MAX_IMAGES_PER_PRODUCT: 5
} as const;
