import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { OfferCategory, OfferType } from '../types/offers';

export const useOfferMetadata = () => {
    const [categories, setCategories] = useState<OfferCategory[]>([]);
    const [offerTypes, setOfferTypes] = useState<OfferType[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                // Fetch categories and types in parallel
                const [catsResponse, typesResponse] = await Promise.all([
                    supabase
                        .from('offer_categories')
                        .select('*')
                        .eq('is_active', true)
                        .order('display_order'),
                    supabase
                        .from('offer_types')
                        .select('*')
                        .eq('is_active', true)
                        .order('display_order') // Sort by popularity/priority
                ]);

                if (catsResponse.error) throw catsResponse.error;
                if (typesResponse.error) throw typesResponse.error;

                setCategories(catsResponse.data as OfferCategory[]);
                setOfferTypes(typesResponse.data as OfferType[]);
            } catch (err: any) {
                console.error('Error fetching offer metadata:', err);
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchMetadata();
    }, []);

    return { categories, offerTypes, isLoading, error };
};
