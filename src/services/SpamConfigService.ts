import { supabase } from '../lib/supabase';

interface SpamKeyword {
    keyword: string;
    severity: 'low' | 'medium' | 'high';
}

class SpamConfigService {
    private keywords: SpamKeyword[] = [];
    private trustedDomains: string[] = [];
    private lastFetch: number = 0;
    private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    /**
     * Fetch spam keywords from database
     */
    async fetchKeywords(): Promise<SpamKeyword[]> {
        const now = Date.now();

        // Return cached if still valid
        if (this.keywords.length > 0 && now - this.lastFetch < this.CACHE_DURATION) {
            return this.keywords;
        }

        const { data, error } = await supabase
            .from('spam_keywords')
            .select('keyword, severity')
            .eq('is_active', true);

        if (error) {
            console.error('Failed to fetch spam keywords:', error);
            return this.keywords; // Return cached on error (or empty if first load fails)
        }

        this.keywords = data || [];
        this.lastFetch = now;

        return this.keywords;
    }

    /**
     * Fetch trusted domains
     */
    async fetchTrustedDomains(): Promise<string[]> {
        const now = Date.now();

        // We share the cache timer for simplicity, or we could track separately
        if (this.trustedDomains.length > 0 && now - this.lastFetch < this.CACHE_DURATION) {
            return this.trustedDomains;
        }

        const { data, error } = await supabase
            .from('trusted_domains')
            .select('domain')
            .eq('is_active', true);

        if (error) {
            console.error('Failed to fetch trusted domains:', error);
            return this.trustedDomains;
        }

        this.trustedDomains = data?.map(d => d.domain) || [];

        return this.trustedDomains;
    }

    /**
     * Initialize config on app startup
     */
    async initialize(): Promise<void> {
        try {
            await Promise.all([
                this.fetchKeywords(),
                this.fetchTrustedDomains()
            ]);

            console.log('✅ Spam config initialized:', {
                keywords: this.keywords.length,
                trustedDomains: this.trustedDomains.length
            });
        } catch (error) {
            console.error('Failed to initialize spam config:', error);
        }
    }

    /**
     * Force refresh config
     */
    async refresh(): Promise<void> {
        this.lastFetch = 0; // Invalidate cache
        await this.initialize();
    }
}

export const spamConfigService = new SpamConfigService();
