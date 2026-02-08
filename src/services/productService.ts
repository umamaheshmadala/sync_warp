import { supabase } from '../lib/supabase';
import { Product } from '../types/product';
import { logActivity } from './businessActivityLogService';

export const productService = {
    /**
     * Uploads a product image to the 'product-images' bucket.
     * Path format: {business_id}/{product_id}/{image_id}
     */
    async uploadProductImage(
        file: File,
        businessId: string,
        productId: string
    ): Promise<string> {
        try {
            // Validate inputs
            if (!file || !businessId || !productId) {
                throw new Error('Missing required arguments for image upload');
            }

            const fileExt = file.name.split('.').pop();
            const fileName = `${crypto.randomUUID()}.${fileExt}`; // using uuid for image_id
            const filePath = `${businessId}/${productId}/${fileName}`;

            const { data, error } = await supabase.storage
                .from('business-assets')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) throw error;

            const { data: publicData } = supabase.storage
                .from('business-assets')
                .getPublicUrl(filePath);

            return publicData.publicUrl;
        } catch (error) {
            console.error('Error in uploadProductImage:', error);
            throw error;
        }
    },

    /**
     * Deletes a product image from storage
     */
    async deleteProductImage(path: string): Promise<void> {
        try {
            // Extract path relative to bucket root if full URL is passed?
            // Usually better to passing the path. 
            // If URL: https://.../product-images/businessId/productId/imageId
            // We need businessId/productId/imageId

            let storagePath = path;
            if (path.startsWith('http')) {
                const urlObj = new URL(path);
                // pathname = /storage/v1/object/public/product-images/path/to/file
                const parts = urlObj.pathname.split('/product-images/');
                if (parts.length > 1) {
                    storagePath = parts[1];
                }
            }

            const { error } = await supabase.storage
                .from('product-images')
                .remove([storagePath]);

            if (error) throw error;
        } catch (error) {
            console.error('Error deleting product image:', error);
            throw error;
        }
    },

    /**
     * Get products for a business, sorted: Featured first, then Newest.
     * Only returns 'published' products unless specified.
     */
    /**
     * Get products for a business, sorted: Featured first, then Newest.
     * Only returns 'published' products unless specified.
     */
    async getBusinessProducts(businessId: string, status: string = 'published') {
        try {
            const { data, error } = await supabase
                .from('products')
                .select('id, name, images, tags, status, created_at')
                .eq('business_id', businessId)
                .eq('status', status)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Client-side sorting for "Featured" tag
            // We can't easily order by array contains in standard SQL without complex query
            return (data || []).sort((a, b) => {
                const aFeatured = a.tags?.includes('featured') ? 1 : 0;
                const bFeatured = b.tags?.includes('featured') ? 1 : 0;
                // If both featured or neither, stable sort (which is created_at desc from DB)
                // If one is featured, it comes first
                return bFeatured - aFeatured;
            });
        } catch (error) {
            console.error('Error getting business products:', error);
            throw error;
        }
    },

    /**
     * Archive a product
     */
    async archiveProduct(productId: string, businessId: string): Promise<void> {
        const { data: product } = await supabase
            .from('products')
            .select('name')
            .eq('id', productId)
            .single();

        const { error } = await supabase
            .from('products')
            .update({ status: 'archived' })
            .eq('id', productId);

        if (error) throw error;

        // Log activity
        const { data: { user } } = await supabase.auth.getUser();
        logActivity({
            businessId,
            actionType: 'product_updated',
            actorId: user?.id || null,
            actorType: 'owner',
            metadata: {
                product_id: productId,
                name: product?.name,
                action: 'archived'
            }
        });
    },

    /**
     * Unarchive a product
     */
    async unarchiveProduct(productId: string, businessId: string): Promise<void> {
        const { data: product } = await supabase
            .from('products')
            .select('name')
            .eq('id', productId)
            .single();

        const { error } = await supabase
            .from('products')
            .update({ status: 'published' })
            .eq('id', productId);

        if (error) throw error;

        // Log activity
        const { data: { user } } = await supabase.auth.getUser();
        logActivity({
            businessId,
            actionType: 'product_updated',
            actorId: user?.id || null,
            actorType: 'owner',
            metadata: {
                product_id: productId,
                name: product?.name,
                action: 'unarchived'
            }
        });
    },

    /**
     * Permanently delete a product and its associated images
     */
    async deleteProduct(productId: string, businessId: string): Promise<void> {
        // Get name before deletion
        const { data: product } = await supabase
            .from('products')
            .select('name')
            .eq('id', productId)
            .single();

        // 1. Delete images from storage first (best effort)
        try {
            const { data: listData, error: listError } = await supabase.storage
                .from('product-images')
                .list(`${businessId}/${productId}`);

            if (!listError && listData && listData.length > 0) {
                const filesToRemove = listData.map(f => `${businessId}/${productId}/${f.name}`);
                await supabase.storage
                    .from('product-images')
                    .remove(filesToRemove);
            }
        } catch (e) {
            console.error('Error cleaning up product images, continuing with row deletion', e);
        }

        // 2. Delete the product record
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', productId)
            .eq('business_id', businessId);

        if (error) throw error;

        // 3. Log activity
        const { data: { user } } = await supabase.auth.getUser();
        logActivity({
            businessId,
            actionType: 'product_deleted',
            actorId: user?.id || null,
            actorType: 'owner',
            metadata: {
                product_id: productId,
                name: product?.name
            }
        });
    },

    /**
     * Delete a product draft and its associated images
     */
    async deleteDraft(draftId: string, businessId: string): Promise<void> {
        // Same logic as deleteProduct, but explicit method for clarity/UI
        return this.deleteProduct(draftId, businessId);
    },

    /**
     * Save/Upsert a product draft
     */
    async saveDraft(data: Partial<Product> & { business_id: string }): Promise<Product> {
        const payload = {
            ...data,
            status: 'draft',
            updated_at: new Date().toISOString()
        };

        const { data: result, error } = await supabase
            .from('products')
            .upsert(payload)
            .select()
            .maybeSingle();

        if (error) throw error;
        return result;
    },

    /**
     * Get drafts for a business
     */
    async getDrafts(businessId: string): Promise<Product[]> {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('business_id', businessId)
            .eq('status', 'draft')
            .order('updated_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    /**
     * Publish a draft (Finalize creation)
     */
    async publishDraft(productId: string, businessId: string): Promise<void> {
        const { data: product } = await supabase
            .from('products')
            .select('name')
            .eq('id', productId)
            .single();

        // 1. Update status to 'published'
        const { error } = await supabase
            .from('products')
            .update({
                status: 'published',
                created_at: new Date().toISOString(), // Reset created_at to now for "New" sort
                updated_at: new Date().toISOString()
            })
            .eq('id', productId);

        if (error) throw error;

        // 2. Log activity - product created
        const { data: { user } } = await supabase.auth.getUser();
        logActivity({
            businessId,
            actionType: 'product_created',
            actorId: user?.id || null,
            actorType: 'owner',
            metadata: {
                product_id: productId,
                name: product?.name
            }
        });
    }
};
