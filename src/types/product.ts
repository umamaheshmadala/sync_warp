// Product-related TypeScript interfaces
// Following the database schema from business_products table

export interface Product {
  id: string;
  business_id: string;
  name: string;
  description?: string;
  category?: string;
  price?: number;
  currency: string;
  is_available: boolean;
  is_featured: boolean; // Featured products show in storefront
  display_order: number; // Only used for trending products
  image_urls: string[];
  last_updated_at?: string; // For auto-deletion tracking
  created_at: string;
  updated_at: string;
  business?: {
    name: string;
  };
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
  { value: 'INR', label: '₹ Indian Rupee', symbol: '₹' },
  { value: 'USD', label: '$ US Dollar', symbol: '$' },
  { value: 'EUR', label: '€ Euro', symbol: '€' }
] as const;

// Product limits
export const PRODUCT_LIMITS = {
  MAX_PRODUCTS_PER_BUSINESS: 100,
  AUTO_DELETE_DAYS: 365,
  MAX_IMAGES_PER_PRODUCT: 5
} as const;
