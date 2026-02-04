/**
 * Optimizes image URLs using a free image CDN proxy (wsrv.nl)
 * This allows resizing, WebP conversion, and caching without Supabase Pro tier.
 * 
 * Strategy: "Use a Dedicated Image CDN" (Option 1 from research)
 * Service: wsrv.nl (Open source, powered by Cloudflare)
 * Privacy: Only suitable for public images (Products, Business Logos)
 */
export const getOptimizedImageUrl = (
    url: string | undefined,
    width: number = 400,
    format: 'origin' | 'webp' = 'webp'
): string => {
    if (!url) return '/placeholder-product.jpg';
    if (typeof url !== 'string') return '/placeholder-product.jpg';
    if (url.startsWith('/')) return url;
    if (url.includes('placeholder')) return url;

    // Check if it's a Supabase Storage URL
    if (url.includes('supabase.co') && url.includes('/storage/v1/object/public')) {
        try {
            // Use wsrv.nl as a free CDN/Proxy for optimization
            // This replaces the Supabase Transformation API
            const baseUrl = 'https://wsrv.nl/';
            const params = new URLSearchParams({
                url: url,           // The original Supabase URL
                w: width.toString(), // Desired width
                fit: 'contain',      // Maintain aspect ratio
                q: '75',             // Quality
                output: 'webp'       // Always convert to WebP for performance
            });

            return `${baseUrl}?${params.toString()}`;
        } catch (e) {
            console.error('Error optimizing image URL:', e);
            return url;
        }
    }

    return url;
};
