// useProducts.ts
// Custom hook for managing product-related data and operations
// Following the pattern established in useBusiness.ts

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { toast } from 'react-hot-toast';
import { Product, ProductFormData, ProductFilters, PRODUCT_LIMITS } from '../types/product';
import { followedBusinessNotificationTrigger } from '../services/followedBusinessNotificationTrigger';

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

      // Use the logic from productService for consistency with new Epic 12 requirements
      // Filters are slightly different now (tags based vs columns)
      // For now, mapping old filters to new structure where possible

      let query = supabase
        .from('products') // Updated table name
        .select('*, businesses(business_name, logo_url)')
        .eq('business_id', businessIdToUse);

      // Simple implementation of filters for the new schema
      // Note: 'category' field is hidden/legacy, 'is_available' mapped to status?
      // For Epic 12.12 we rely on 'status' field primarily.

      const { data, error: fetchError } = await query.order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Client side sort for featured tags if needed, or rely on productService.getBusinessProducts
      // Let's implement the sort here to match the grid requirement: Featured first.
      const sortedData = (data || []).sort((a: any, b: any) => {
        const aFeatured = a.tags?.includes('featured') ? 1 : 0;
        const bFeatured = b.tags?.includes('featured') ? 1 : 0;
        return bFeatured - aFeatured;
      });

      setProducts(sortedData as unknown as Product[]);
      return sortedData;
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
        .from('products')
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

      // Verify product count limit
      const { count, error: countError } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', businessIdToUse);

      if (countError) throw countError;

      if (count !== null && count >= PRODUCT_LIMITS.MAX_PRODUCTS_PER_BUSINESS) {
        throw new Error(`Maximum ${PRODUCT_LIMITS.MAX_PRODUCTS_PER_BUSINESS} products allowed per business`);
      }

      // Map form data to new schema
      // New schema expects images as JSONB array, status instead of is_available, tags for featured
      const imagesPayload = (productData.image_urls || []).map((url, index) => ({
        url,
        order: index,
        alt_text: productData.name
      }));

      // Start with manual tags
      const tags = [...(productData.tags || [])];

      // Ensure 'featured' tag logic syncs with boolean
      if (productData.is_featured && !tags.includes('featured')) {
        tags.push('featured');
      } else if (!productData.is_featured && tags.includes('featured')) {
        // If is_featured is false, ensure tag is removed (though UI typically handles this via tag selector, explicit syncing is safer)
        const idx = tags.indexOf('featured');
        if (idx > -1) tags.splice(idx, 1);
      }

      const { data, error: createError } = await supabase
        .from('products')
        .insert([{
          business_id: businessIdToUse,
          name: productData.name,
          description: productData.description,
          price: productData.price || 0,
          category: productData.category,
          status: productData.is_available ? 'published' : 'sold_out',
          tags: tags,
          images: imagesPayload,
          // Legacy/Fallback for other parts of app? No, schema doesn't have image_urls anymore
          display_order: productData.display_order || 0
        }])
        .select()
        .single();

      if (createError) throw createError;

      // Notify followers (Fire and forget)
      followedBusinessNotificationTrigger.notifyNewProduct(businessIdToUse, data as Product).catch(console.error);

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
        .from('products')
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

      // Construct update payload
      const updatePayload: any = {
        updated_at: new Date().toISOString()
      };

      if (updates.name !== undefined) updatePayload.name = updates.name;
      if (updates.description !== undefined) updatePayload.description = updates.description;
      if (updates.price !== undefined) updatePayload.price = updates.price;
      if (updates.category !== undefined) updatePayload.category = updates.category;

      if (updates.is_available !== undefined) {
        updatePayload.status = updates.is_available ? 'published' : 'sold_out';
      }

      if (updates.is_featured !== undefined) {
        // We need to carefully handle tags update - likely need to fetch existing tags first or complex logic
        // Simplified: Just toggle 'featured' in the tags array
        const currentTags = productData.tags || [];
        const hasFeatured = currentTags.includes('featured');
        let newTags = [...currentTags];

        if (updates.is_featured && !hasFeatured) {
          newTags.push('featured');
        } else if (!updates.is_featured && hasFeatured) {
          newTags = newTags.filter((t: string) => t !== 'featured');
        }
        updatePayload.tags = newTags;
      }

      if (updates.image_urls !== undefined) {
        updatePayload.images = updates.image_urls.map((url, index) => ({
          url,
          order: index,
          alt_text: updates.name || productData.name
        }));
      }

      const { data, error: updateError } = await supabase
        .from('products')
        .update(updatePayload)
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
        .from('products')
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
        .from('products')
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
          .from('products')
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

  // Update product notification settings
  const updateNotificationSetting = async (productId: string, enabled: boolean) => {
    try {
      const { error: updateError } = await supabase
        .from('products')
        .update({ notifications_enabled: enabled })
        .eq('id', productId);

      if (updateError) throw updateError;

      // Update local state
      setProducts(prev => prev.map(p =>
        p.id === productId ? { ...p, notifications_enabled: enabled } : p
      ));

      if (product?.id === productId) {
        setProduct({ ...product, notifications_enabled: enabled });
      }

      return true;
    } catch (err) {
      console.error('Error updating notification settings:', err);
      return false;
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
    updateNotificationSetting,

    // Utilities
    setProducts,
    setProduct,
    setLoading,
    setError
  };
};