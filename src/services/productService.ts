import { supabase } from '../lib/supabase';

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
                .from('product-images')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) throw error;

            const { data: publicData } = supabase.storage
                .from('product-images')
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
    }
};
