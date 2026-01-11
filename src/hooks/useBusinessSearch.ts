/**
 * useBusinessSearch Hook
 * Story 4C.1: Google Places API Integration
 * 
 * Provides debounced business search with autocomplete suggestions
 * and place details fetching for form pre-fill.
 */

import { useState, useCallback, useEffect } from 'react';
import { useDebounce } from './useDebounce';
import {
    searchBusinesses,
    getBusinessSearchResult,
    isApiConfigured,
    PlacePrediction,
    BusinessSearchResult
} from '../services/businessSearchService';

interface UseBusinessSearchReturn {
    // State
    query: string;
    suggestions: PlacePrediction[];
    isLoading: boolean;
    error: string | null;
    isApiAvailable: boolean;

    // Actions
    setQuery: (query: string) => void;
    selectPlace: (placeId: string) => Promise<BusinessSearchResult | null>;
    clearSuggestions: () => void;
    clearError: () => void;
}

export function useBusinessSearch(): UseBusinessSearchReturn {
    const [query, setQueryState] = useState('');
    const [suggestions, setSuggestions] = useState<PlacePrediction[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isApiAvailable] = useState(isApiConfigured());

    // Debounce the query with 300ms delay
    const debouncedQuery = useDebounce(query, 300);

    // Effect to perform search when debounced query changes
    useEffect(() => {
        const performSearch = async () => {
            if (!debouncedQuery || debouncedQuery.length < 3) {
                setSuggestions([]);
                return;
            }

            setIsLoading(true);
            setError(null);

            try {
                const results = await searchBusinesses(debouncedQuery);
                setSuggestions(results);
            } catch (err) {
                console.error('Search error:', err);
                setError('Search temporarily unavailable');
                setSuggestions([]);
            } finally {
                setIsLoading(false);
            }
        };

        performSearch();
    }, [debouncedQuery]);

    // Set query
    const setQuery = useCallback((newQuery: string) => {
        setQueryState(newQuery);
    }, []);

    // Select a place and get full details
    const selectPlace = useCallback(async (
        placeId: string
    ): Promise<BusinessSearchResult | null> => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await getBusinessSearchResult(placeId);
            setSuggestions([]); // Clear suggestions after selection
            return result;
        } catch (err) {
            console.error('Place details error:', err);
            setError('Could not load business details');
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Clear suggestions
    const clearSuggestions = useCallback(() => {
        setSuggestions([]);
    }, []);

    // Clear error
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        query,
        suggestions,
        isLoading,
        error,
        isApiAvailable,
        setQuery,
        selectPlace,
        clearSuggestions,
        clearError
    };
}
