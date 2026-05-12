import { supabase } from '../lib/supabase';
import { ProductCategory } from '../types/product';

export interface CategoryOptionGroup {
    l2Id: string;
    l2Name: string;
    options: ProductCategory[];
}

export interface ProductCategorySelection {
    primary?: string;
    secondary?: string;
    tertiary?: string;
    primaryL2Id?: string;
    primaryName?: string;
}

export const productCategoryService = {
    /**
     * Gets Level 3 category options for a business, filtered by their selected Level 2 categories.
     * Groups the Level 3 options by their Level 2 parent.
     */
    async getProductCategoryOptions(businessId: string): Promise<CategoryOptionGroup[]> {
        // 1. Fetch the business's selected L2 categories
        const { data: bpc, error: bpcError } = await supabase
            .from('business_product_categories')
            .select(`
                category_id,
                product_category_master:category_id (name)
            `)
            .eq('business_id', businessId);

        if (bpcError) throw bpcError;
        if (!bpc || bpc.length === 0) return [];

        const l2Ids = bpc.map(item => item.category_id);
        const l2Map = bpc.reduce((acc, item) => {
            acc[item.category_id] = (item.product_category_master as any)?.name || 'Unknown Category';
            return acc;
        }, {} as Record<string, string>);

        // 2. Fetch all active L3 categories that belong to those L2 parents
        const { data: l3Categories, error: l3Error } = await supabase
            .from('product_category_master')
            .select('*')
            .eq('level', 3)
            .eq('is_active', true)
            .in('parent_id', l2Ids)
            .order('sort_order')
            .order('name');

        if (l3Error) throw l3Error;

        // 3. Group by L2 parent
        const grouped: Record<string, CategoryOptionGroup> = {};
        
        l2Ids.forEach(l2Id => {
            grouped[l2Id] = {
                l2Id,
                l2Name: l2Map[l2Id],
                options: []
            };
        });

        (l3Categories || []).forEach(cat => {
            if (cat.parent_id && grouped[cat.parent_id]) {
                grouped[cat.parent_id].options.push(cat);
            }
        });

        // Return only groups that have options, sorted alphabetically by L2 name
        return Object.values(grouped)
            .filter(group => group.options.length > 0)
            .sort((a, b) => a.l2Name.localeCompare(b.l2Name));
    },

    /**
     * Gets the selected categories for a specific product.
     */
    async getProductCategories(productId: string): Promise<ProductCategorySelection> {
        const { data, error } = await supabase
            .from('product_categories')
            .select(`
                category_id,
                rank,
                product_category_master!inner (name, parent_id)
            `)
            .eq('product_id', productId);

        if (error) throw error;

        const selection: ProductCategorySelection = {};

        data?.forEach(row => {
            if (row.rank === 1) {
                selection.primary = row.category_id;
                selection.primaryL2Id = (row.product_category_master as any).parent_id;
                selection.primaryName = (row.product_category_master as any).name;
            } else if (row.rank === 2) {
                selection.secondary = row.category_id;
            } else if (row.rank === 3) {
                selection.tertiary = row.category_id;
            }
        });

        return selection;
    },

    /**
     * Saves category selections for a product. Replaces any existing categories.
     */
    async saveProductCategories(productId: string, selections: { primary: string; secondary?: string; tertiary?: string }) {
        if (!selections.primary) throw new Error('Primary category is required');

        // Prepare rows adhering to the unique constraints and rank
        const rowsToInsert = [
            { product_id: productId, category_id: selections.primary, rank: 1 }
        ];

        // Ensure secondary and tertiary are distinct from primary and each other
        const set = new Set([selections.primary]);
        
        if (selections.secondary && !set.has(selections.secondary)) {
            rowsToInsert.push({ product_id: productId, category_id: selections.secondary, rank: 2 });
            set.add(selections.secondary);
        }
        
        if (selections.tertiary && !set.has(selections.tertiary)) {
            rowsToInsert.push({ product_id: productId, category_id: selections.tertiary, rank: 3 });
        }

        // Delete existing and insert new
        const { error: deleteError } = await supabase
            .from('product_categories')
            .delete()
            .eq('product_id', productId);

        if (deleteError) throw deleteError;

        const { error: insertError } = await supabase
            .from('product_categories')
            .insert(rowsToInsert);

        if (insertError) throw insertError;
    }
};
