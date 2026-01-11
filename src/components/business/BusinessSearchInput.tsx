/**
 * BusinessSearchInput Component
 * Story 4C.1: Google Places API Integration
 * 
 * Autocomplete search input for finding businesses from Google Places.
 * Uses Google Maps JavaScript SDK with Places Library.
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Building2, MapPin, Loader2, AlertCircle, Plus } from 'lucide-react';
import { useJsApiLoader } from '@react-google-maps/api';
import { useBusinessSearch } from '@/hooks/useBusinessSearch';
import { PlacePrediction, BusinessSearchResult, initPlacesServices } from '@/services/businessSearchService';

// Libraries needed for Places autocomplete
const GOOGLE_MAPS_LIBRARIES: ("places")[] = ['places'];

interface BusinessSearchInputProps {
    onBusinessSelect: (business: BusinessSearchResult) => void;
    onManualEntry: (businessName: string) => void;
    className?: string;
}

export function BusinessSearchInput({
    onBusinessSelect,
    onManualEntry,
    className = ''
}: BusinessSearchInputProps) {
    // Load Google Maps JavaScript API
    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
        libraries: GOOGLE_MAPS_LIBRARIES
    });

    const {
        query,
        suggestions,
        isLoading,
        error,
        isApiAvailable,
        setQuery,
        selectPlace,
        clearSuggestions,
        clearError
    } = useBusinessSearch();

    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isSelecting, setIsSelecting] = useState(false);
    const [placesInitialized, setPlacesInitialized] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Initialize Places services when Google Maps is loaded
    useEffect(() => {
        if (isLoaded && !placesInitialized) {
            const initialized = initPlacesServices();
            setPlacesInitialized(initialized);
        }
    }, [isLoaded, placesInitialized]);

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Show suggestions when we have results
    useEffect(() => {
        if (suggestions.length > 0) {
            setShowSuggestions(true);
        }
    }, [suggestions]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setQuery(value);
        clearError();

        if (value.length < 3) {
            setShowSuggestions(false);
        }
    };

    const handleSelectSuggestion = async (suggestion: PlacePrediction) => {
        setIsSelecting(true);
        setShowSuggestions(false);

        try {
            const result = await selectPlace(suggestion.place_id);

            if (result) {
                onBusinessSelect(result);
            } else {
                // If we couldn't get details, proceed with manual entry using the name
                onManualEntry(suggestion.structured_formatting.main_text);
            }
        } catch (err) {
            console.error('Error selecting business:', err);
            // Fallback to manual entry
            onManualEntry(suggestion.structured_formatting.main_text);
        } finally {
            setIsSelecting(false);
        }
    };

    const handleManualEntry = () => {
        setShowSuggestions(false);
        onManualEntry(query);
    };

    const handleFocus = () => {
        if (suggestions.length > 0 || query.length >= 3) {
            setShowSuggestions(true);
        }
    };

    // Show loading state while Google Maps is loading
    if (!isLoaded) {
        return (
            <div className={`space-y-3 ${className}`}>
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                    <span className="ml-3 text-gray-600">Loading search...</span>
                </div>
            </div>
        );
    }

    // If API failed to load or key is not configured, show simplified input
    if (loadError || !isApiAvailable) {
        return (
            <div className={`space-y-3 ${className}`}>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm text-amber-800 font-medium">Search unavailable</p>
                            <p className="text-sm text-amber-700 mt-1">
                                {loadError ? 'Failed to load Google Maps' : 'Enter your business details manually below.'}
                            </p>
                        </div>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => onManualEntry('')}
                    className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                    Enter Details Manually
                </button>
            </div>
        );
    }

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            {/* Search Input */}
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    {isLoading || isSelecting ? (
                        <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                    ) : (
                        <Search className="w-5 h-5 text-gray-400" />
                    )}
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={handleInputChange}
                    onFocus={handleFocus}
                    placeholder="Search for your business..."
                    className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-lg transition-shadow"
                    disabled={isSelecting || !placesInitialized}
                />
            </div>

            {/* Helper text */}
            <p className="mt-2 text-sm text-gray-500">
                {placesInitialized
                    ? "Start typing to search Google's business directory"
                    : "Initializing search..."
                }
            </p>

            {/* Error state */}
            {error && (
                <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm text-red-800">{error}</p>
                            <button
                                type="button"
                                onClick={handleManualEntry}
                                className="text-sm text-red-700 underline mt-1 hover:text-red-800"
                            >
                                Enter details manually instead
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Suggestions Dropdown */}
            <AnimatePresence>
                {showSuggestions && (suggestions.length > 0 || query.length >= 3) && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
                    >
                        {/* Suggestions List */}
                        {suggestions.slice(0, 5).map((suggestion) => (
                            <button
                                key={suggestion.place_id}
                                type="button"
                                onClick={() => handleSelectSuggestion(suggestion)}
                                className="w-full px-4 py-3 hover:bg-gray-50 flex items-start gap-3 text-left transition-colors border-b border-gray-100 last:border-b-0"
                                disabled={isSelecting}
                            >
                                <Building2 className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-900 truncate">
                                        {suggestion.structured_formatting.main_text}
                                    </p>
                                    <p className="text-sm text-gray-500 truncate flex items-center gap-1">
                                        <MapPin className="w-3 h-3" />
                                        {suggestion.structured_formatting.secondary_text}
                                    </p>
                                </div>
                            </button>
                        ))}

                        {/* Add as New Business Option */}
                        {query.length >= 3 && (
                            <button
                                type="button"
                                onClick={handleManualEntry}
                                className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center gap-3 text-left transition-colors"
                                disabled={isSelecting}
                            >
                                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                                    <Plus className="w-4 h-4 text-indigo-600" />
                                </div>
                                <div>
                                    <p className="font-medium text-indigo-600">
                                        Add "{query}" as new business
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        Not finding your business? Add it manually
                                    </p>
                                </div>
                            </button>
                        )}

                        {/* No Results State */}
                        {suggestions.length === 0 && query.length >= 3 && !isLoading && !error && (
                            <div className="px-4 py-3 text-center text-gray-500">
                                <p className="text-sm">No businesses found matching "{query}"</p>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default BusinessSearchInput;
