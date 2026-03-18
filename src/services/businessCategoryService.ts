import { supabase } from '../lib/supabase';
import { ProductCategory } from '../types/product';

/**
 * Service for managing business product categories
 * Story 12.20b
 */
export const BusinessCategoryService = {
  /**
   * Fetches the selected product categories for a given business.
   * Only returns Level 2 categories as per scope requirements.
   */
  async getBusinessCategories(businessId: string): Promise<ProductCategory[]> {
    const { data, error } = await supabase
      .from('business_product_categories')
      .select(`
        category_id,
        product_category_master (*)
      `)
      .eq('business_id', businessId);

    if (error) {
      console.error('Error fetching business categories:', error);
      throw error;
    }

    if (!data) return [];

    // Map through the join result to extract the actual category objects
    // The query returns { category_id: string, product_category_master: ProductCategory }
    return data
      .map(item => item.product_category_master as unknown as ProductCategory)
      .filter(category => category && category.level === 2)
      .sort((a, b) => a.sort_order - b.sort_order);
  },

  /**
   * Updates the selected categories for a business
   * Implementation deletes existing and inserts new array to avoid complex diffing
   */
  async updateBusinessCategories(businessId: string, categoryIds: string[]): Promise<void> {
    // 1. Delete all existing categories for this business
    const { error: deleteError } = await supabase
      .from('business_product_categories')
      .delete()
      .eq('business_id', businessId);

    if (deleteError) {
      console.error('Error removing old business categories:', deleteError);
      throw deleteError;
    }

    // 2. If the new array is empty, we are done
    if (!categoryIds || categoryIds.length === 0) {
      return;
    }

    // 3. Insert the new categories array
    const insertPayload = categoryIds.map(categoryId => ({
      business_id: businessId,
      category_id: categoryId
    }));

    const { error: insertError } = await supabase
      .from('business_product_categories')
      .insert(insertPayload);

    if (insertError) {
      console.error('Error assigning new business categories:', insertError);
      throw insertError;
    }
  },

  /**
   * Helper function to get all available categories
   */
  async getAvailableCategories(): Promise<ProductCategory[]> {
    const { data, error } = await supabase
      .from('product_category_master')
      .select('*')
      .eq('level', 2)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching available categories:', error);
      throw error;
    }

    return data as ProductCategory[];
  },

  /**
   * Helper function to get all L1 and L2 categories grouped together 
   * for picking interfaces
   */
  async getSelectableHierarchy() {
    // This fetches L1 and L2 natively
    const { data, error } = await supabase
      .from('product_category_master')
      .select('*')
      .in('level', [1, 2])
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching taxonomy hierarchy:', error);
      throw error;
    }

    // Process flat data into a grouped structure: { L1: [L2, L2...] }
    const level1Categories = (data as ProductCategory[]).filter(c => c.level === 1);
    const level2Categories = (data as ProductCategory[]).filter(c => c.level === 2);

    return level1Categories.map(parent => ({
      ...parent,
      subcategories: level2Categories.filter(child => child.parent_id === parent.id)
    }));
  }
};
