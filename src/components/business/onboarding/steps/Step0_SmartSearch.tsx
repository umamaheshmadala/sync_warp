import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Store, MapPin, Plus, AlertCircle, Loader2 } from 'lucide-react';
import { useJsApiLoader } from '@react-google-maps/api';
import { useBusinessSearch } from '@/hooks/useBusinessSearch';
import { PlacePrediction, initPlacesServices } from '@/services/businessSearchService';
import { cn } from '@/lib/utils';

// Libraries needed for Places autocomplete
const GOOGLE_MAPS_LIBRARIES: ("places")[] = ['places'];

export interface BusinessPrefillData {
    name: string;
    phone: string;
    website: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    latitude: number;
    longitude: number;
    googlePlaceId: string;
    category?: string;
}

interface Step0_SmartSearchProps {
    onBusinessSelected: (data: BusinessPrefillData) => void;
    onAddNewBusiness: (name: string) => void;
    onSkipToManual: () => void;
}

export function Step0_SmartSearch({
    onBusinessSelected,
    onAddNewBusiness,
    onSkipToManual
}: Step0_SmartSearchProps) {
    // Load Google Maps JavaScript API
    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
        libraries: GOOGLE_MAPS_LIBRARIES,
        id: 'google-maps-script'
    });

    const {
        query,
        suggestions,
        isLoading,
        error,
        isApiAvailable,
        setQuery,
        selectPlace,
        clearSuggestions
    } = useBusinessSearch();

    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectingPlace, setSelectingPlace] = useState(false);
    const [placesInitialized, setPlacesInitialized] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Initialize Places services when Google Maps is loaded
    useEffect(() => {
        if (isLoaded && !placesInitialized) {
            const initialized = initPlacesServices();
            setPlacesInitialized(initialized);
            console.log('[Step0] Places initialized:', initialized);
        }
    }, [isLoaded, placesInitialized]);

    // Focus input on mount (after script loads)
    useEffect(() => {
        if (isLoaded) {
            inputRef.current?.focus();
        }
    }, [isLoaded]);

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle input change
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(e.target.value);
        setShowSuggestions(true);
    };

    // Handle suggestion selection
    const handleSelectSuggestion = async (suggestion: PlacePrediction) => {
        setSelectingPlace(true);
        setShowSuggestions(false);

        try {
            const details = await selectPlace(suggestion.place_id);

            if (details) {
                onBusinessSelected({
                    name: details.name,
                    phone: details.phone,
                    website: details.website,
                    address: details.address,
                    city: details.city,
                    state: details.state,
                    postalCode: details.postalCode,
                    latitude: details.latitude,
                    longitude: details.longitude,
                    googlePlaceId: details.googlePlaceId,
                    category: details.category
                });
            }
        } catch (err) {
            console.error('Error selecting place:', err);
        } finally {
            setSelectingPlace(false);
        }
    };

    // Handle "Add new business"
    const handleAddNew = () => {
        clearSuggestions();
        setShowSuggestions(false);
        onAddNewBusiness(query);
    };

    // Show loading state while Google Maps is loading
    if (!isLoaded && !loadError) {
        return (
            <div className="max-w-lg mx-auto">
                <div className="flex flex-col items-center justify-center py-16">
                    <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
                    <p className="text-gray-600">Loading search...</p>
                </div>
            </div>
        );
    }

    // If API failed to load, show error with manual entry option
    if (loadError || !isApiAvailable) {
        return (
            <div className="max-w-lg mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8"
                >
                    <div className="w-16 h-16 bg-indigo-100 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                        <Store className="w-8 h-8 text-indigo-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        Let's find your business!
                    </h1>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-4 bg-amber-50 border border-amber-200 rounded-xl"
                >
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
                        <div>
                            <p className="font-medium text-amber-800">
                                Search is temporarily unavailable
                            </p>
                            <p className="text-sm text-amber-700 mt-1">
                                {loadError ? 'Google Maps failed to load. ' : ''}
                                You can still register your business by entering details manually.
                            </p>
                            <button
                                onClick={onSkipToManual}
                                className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                            >
                                Continue with manual entry →
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="max-w-lg mx-auto">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-8"
            >
                <div className="w-16 h-16 bg-indigo-100 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                    <Store className="w-8 h-8 text-indigo-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    Let's find your business!
                </h1>
                <p className="text-gray-600">
                    Search for your business below and we'll help you set it up quickly.
                </p>
            </motion.div>

            {/* Search Input */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="relative"
                ref={dropdownRef}
            >
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={handleInputChange}
                        onFocus={() => setShowSuggestions(true)}
                        placeholder="Search your business name..."
                        className={cn(
                            "w-full pl-12 pr-4 py-4 text-lg border-2 rounded-2xl transition-all outline-none",
                            "focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500",
                            showSuggestions && (suggestions.length > 0 || query.length >= 3)
                                ? "rounded-b-none border-indigo-500"
                                : "border-gray-200"
                        )}
                        disabled={selectingPlace || !placesInitialized}
                    />
                    {(isLoading || selectingPlace) && (
                        <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500 animate-spin" />
                    )}
                </div>

                {/* Helper text */}
                {!placesInitialized && (
                    <p className="mt-2 text-sm text-gray-500">Initializing search...</p>
                )}

                {/* Suggestions Dropdown */}
                <AnimatePresence>
                    {showSuggestions && query.length >= 3 && !selectingPlace && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute w-full bg-white border-2 border-t-0 border-indigo-500 rounded-b-2xl shadow-lg z-50 overflow-hidden"
                        >
                            {/* API Error State */}
                            {error && (
                                <div className="p-4 bg-amber-50 border-b border-amber-100">
                                    <div className="flex items-center gap-2 text-amber-700">
                                        <AlertCircle className="w-4 h-4" />
                                        <span className="text-sm">{error}</span>
                                    </div>
                                </div>
                            )}

                            {/* Suggestions List */}
                            {suggestions.length > 0 && (
                                <ul className="divide-y divide-gray-100">
                                    {suggestions.slice(0, 5).map((suggestion) => (
                                        <li key={suggestion.place_id}>
                                            <button
                                                onClick={() => handleSelectSuggestion(suggestion)}
                                                className="w-full px-4 py-3 text-left hover:bg-indigo-50 transition-colors flex items-start gap-3"
                                            >
                                                <MapPin className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                                                <div>
                                                    <p className="font-medium text-gray-900">
                                                        {suggestion.structured_formatting.main_text}
                                                    </p>
                                                    <p className="text-sm text-gray-500 truncate">
                                                        {suggestion.structured_formatting.secondary_text}
                                                    </p>
                                                </div>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}

                            {/* No Results */}
                            {suggestions.length === 0 && !isLoading && !error && (
                                <div className="p-4 text-center text-gray-500">
                                    No businesses found matching "{query}"
                                </div>
                            )}

                            {/* Add New Business Option */}
                            <div className="border-t border-gray-100">
                                <button
                                    onClick={handleAddNew}
                                    className="w-full px-4 py-3 text-left hover:bg-green-50 transition-colors flex items-center gap-3 text-green-700"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                                        <Plus className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-medium">
                                            Add "{query}" as a new business
                                        </p>
                                        <p className="text-sm text-green-600">
                                            Your business not in the list? Add it manually
                                        </p>
                                    </div>
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Statistics Banner */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-12 flex items-center justify-center gap-2 text-gray-500"
            >
                <Store className="w-5 h-5" />
                <span className="text-sm">
                    Join <strong>12,000+</strong> businesses already on SynC
                </span>
            </motion.div>

            {/* Skip to Manual Entry Link */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-4 text-center"
            >
                <button
                    onClick={onSkipToManual}
                    className="text-sm text-gray-500 hover:text-gray-700 underline"
                >
                    Can't find your business? Enter details manually
                </button>
            </motion.div>
        </div>
    );
}

export default Step0_SmartSearch;
