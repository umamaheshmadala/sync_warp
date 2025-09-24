// useProducts.ts
// Custom hook for managing product-related data and operations
// Following the pattern established in useBusiness.ts

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { toast } from 'react-hot-toast';
import { Product, ProductFormData, ProductFilters, PRODUCT_LIMITS } from '../types/product';

export const useProducts = (businessId?: string) => {
  const { user } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialLoadComplete = useRef(false);
  const lastBusinessId = useRef<string | undefined>(undefined);

  // Fetch products for a specific business
  const fetchProducts = async (targetBusinessId?: string, filters?: ProductFilters) => {
    const businessIdToUse = targetBusinessId || businessId;
    if (!businessIdToUse) return [];

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('business_products')
        .select('*')
        .eq('business_id', businessIdToUse);

      // Apply filters
      if (filters) {
        if (filters.category) {
          query = query.eq('category', filters.category);
        }
        if (filters.availability !== undefined) {
          query = query.eq('is_available', filters.availability);
        }
        if (filters.featured !== undefined) {
          query = query.eq('is_featured', filters.featured);
        }

        // Apply sorting
        const sortBy = filters.sortBy || 'created_at';
        const sortOrder = filters.sortOrder || 'desc';
        
        // Special sorting logic for featured products
        if (filters.featured) {
          query = query.order('display_order', { ascending: true })
                      .order('created_at', { ascending: false });
        } else {
          query = query.order(sortBy, { ascending: sortOrder === 'asc' });
        }
      } else {
        // Default sort: featured products first (by display_order), then by newest
        query = query.order('is_featured', { ascending: false })
                     .order('display_order', { ascending: true })
                     .order('created_at', { ascending: false });
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setProducts(data || []);
      return data || [];
    } catch (err) {
      console.error('Error fetching products:', err);
      setError(err.message);
      toast.error('Failed to load products');
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Fetch single product
  const fetchProduct = async (productId: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('business_products')
        .select('*')
        .eq('id', productId)
        .single();

      if (fetchError) throw fetchError;

      setProduct(data);
      return data;
    } catch (err) {
      console.error('Error fetching product:', err);
      setError(err.message);
      toast.error('Failed to load product');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Create new product
  const createProduct = async (productData: ProductFormData, targetBusinessId?: string) => {
    const businessIdToUse = targetBusinessId || businessId;
    if (!businessIdToUse) {
      toast.error('Business ID is required');
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      // Verify business ownership
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('user_id')
        .eq('id', businessIdToUse)
        .single();

      if (businessError) throw businessError;
      if (business.user_id !== user?.id) {
        throw new Error('You can only add products to your own businesses');
      }

      // Check product count limit
      const { data: existingProducts, error: countError } = await supabase
        .from('business_products')
        .select('id')
        .eq('business_id', businessIdToUse);

      if (countError) throw countError;
      
      if (existingProducts && existingProducts.length >= PRODUCT_LIMITS.MAX_PRODUCTS_PER_BUSINESS) {
        throw new Error(`Maximum ${PRODUCT_LIMITS.MAX_PRODUCTS_PER_BUSINESS} products allowed per business`);
      }

      const { data, error: createError } = await supabase
        .from('business_products')
        .insert([{
          ...productData,
          business_id: businessIdToUse,
          image_urls: productData.image_urls || [],
          currency: productData.currency || 'INR',
          price: productData.price || 0
        }])
        .select()
        .single();

      if (createError) throw createError;

      // Refresh products list
      fetchProducts(businessIdToUse);
      
      toast.success('Product created successfully!');
      return data;
    } catch (err) {
      console.error('Error creating product:', err);
      setError(err.message);
      toast.error(err.message || 'Failed to create product');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Update product
  const updateProduct = async (productId: string, updates: Partial<ProductFormData>) => {
    try {
      setLoading(true);
      setError(null);

      // Verify ownership through business
      const { data: productData, error: productError } = await supabase
        .from('business_products')
        .select(`
          *,
          businesses!inner(user_id)
        `)
        .eq('id', productId)
        .single();

      if (productError) throw productError;
      if (productData.businesses.user_id !== user?.id) {
        throw new Error('You can only update your own products');
      }

      const { data, error: updateError } = await supabase
        .from('business_products')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', productId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Update local state
      setProducts(prev => prev.map(p => p.id === productId ? data : p));
      if (product?.id === productId) {
        setProduct(data);
      }

      toast.success('Product updated successfully!');
      return data;
    } catch (err) {
      console.error('Error updating product:', err);
      setError(err.message);
      toast.error(err.message || 'Failed to update product');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Delete product
  const deleteProduct = async (productId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Verify ownership through business
      const { data: productData, error: productError } = await supabase
        .from('business_products')
        .select(`
          *,
          businesses!inner(user_id)
        `)
        .eq('id', productId)
        .single();

      if (productError) throw productError;
      if (productData.businesses.user_id !== user?.id) {
        throw new Error('You can only delete your own products');
      }

      const { error: deleteError } = await supabase
        .from('business_products')
        .delete()
        .eq('id', productId);

      if (deleteError) throw deleteError;

      // Update local state
      setProducts(prev => prev.filter(p => p.id !== productId));
      if (product?.id === productId) {
        setProduct(null);
      }

      toast.success('Product deleted successfully!');
      return true;
    } catch (err) {
      console.error('Error deleting product:', err);
      setError(err.message);
      toast.error(err.message || 'Failed to delete product');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Upload product images
  const uploadProductImage = async (file: File, productId?: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `products/${productId || 'temp'}/${fileName}`;

      const { data, error } = await supabase.storage
        .from('business-assets')
        .upload(filePath, file);

      if (error) throw error;

      const { data: publicData } = supabase.storage
        .from('business-assets')
        .getPublicUrl(filePath);

      return publicData.publicUrl;
    } catch (err) {
      console.error('Error uploading image:', err);
      toast.error('Failed to upload image');
      return null;
    }
  };

  // Update product display order
  const updateDisplayOrder = async (productUpdates: { id: string; display_order: number }[]) => {
    try {
      setLoading(true);
      setError(null);

      // Update display order for multiple products
      const updates = productUpdates.map(update =>
        supabase
          .from('business_products')
          .update({ display_order: update.display_order })
          .eq('id', update.id)
      );

      await Promise.all(updates);

      // Refresh products list
      if (businessId) {
        fetchProducts(businessId);
      }

      toast.success('Product order updated successfully!');
      return true;
    } catch (err) {
      console.error('Error updating display order:', err);
      setError(err.message);
      toast.error('Failed to update product order');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Load products on hook initialization with cleanup and auto-reload prevention
  useEffect(() => {
    let isCancelled = false;
    
    const loadProducts = async () => {
      // Only load if:
      // 1. We have a businessId
      // 2. Request wasn't cancelled
      // 3. Either it's the first load, or businessId changed
      if (businessId && !isCancelled && 
          (!initialLoadComplete.current || lastBusinessId.current !== businessId)) {
        
        lastBusinessId.current = businessId;
        await fetchProducts(businessId);
        initialLoadComplete.current = true;
      }
    };
    
    loadProducts();
    
    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]); // Only re-run when businessId changes

  // Refresh products manually
  const refreshProducts = async () => {
    if (businessId) {
      await fetchProducts(businessId);
    }
  };

  return {
    // State
    products,
    product,
    loading,
    error,

    // Actions
    fetchProducts,
    fetchProduct,
    createProduct,
    updateProduct,
    deleteProduct,
    uploadProductImage,
    updateDisplayOrder,
    refreshProducts,

    // Utilities
    setProducts,
    setProduct,
    setLoading,
    setError
  };
};