# Story 4C.3: Smart Search Step (Step 0)

**Epic:** Epic 4C - Smart Business Onboarding  
**Priority:** 🔴 P0 - CRITICAL  
**Effort:** 2 days  
**Dependencies:** Story 4C.1 (Google Places API)  
**Status:** ✅ Completed

---

## Overview

Create a new "Step 0" that replaces the initial registration experience. Instead of jumping straight into form fields, users first search for their business. This Yelp-inspired approach reduces friction and improves data quality.

---

## User Stories

### US-4C.3.1: Business Search Interface
**As a** business owner  
**I want to** start by searching for my business name  
**So that** I can check if it's already on SynC

### US-4C.3.2: Select Existing Business
**As a** business owner  
**I want to** select my business from search results  
**So that** my details are auto-filled

### US-4C.3.3: Add New Business
**As a** business owner  
**I want to** add my business if it's not found  
**So that** I can still register

---

## Component Implementation

**File:** `src/components/business/onboarding/steps/Step0_SmartSearch.tsx`

```typescript
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Store, MapPin, Plus, AlertCircle, Loader2 } from 'lucide-react';
import { useBusinessSearch } from '@/hooks/useBusinessSearch';
import { PlacePrediction } from '@/services/businessSearchService';
import { cn } from '@/lib/utils';

interface Step0_SmartSearchProps {
  onBusinessSelected: (data: BusinessPrefillData) => void;
  onAddNewBusiness: (name: string) => void;
  onSkipToManual: () => void;
}

interface BusinessPrefillData {
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

export function Step0_SmartSearch({
  onBusinessSelected,
  onAddNewBusiness,
  onSkipToManual
}: Step0_SmartSearchProps) {
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
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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
              "w-full pl-12 pr-4 py-4 text-lg border-2 rounded-2xl transition-all",
              "focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500",
              showSuggestions && (suggestions.length > 0 || query.length >= 3)
                ? "rounded-b-none border-indigo-500"
                : "border-gray-200"
            )}
            disabled={selectingPlace}
          />
          {(isLoading || selectingPlace) && (
            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500 animate-spin" />
          )}
        </div>

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

      {/* API Not Available Fallback */}
      {!isApiAvailable && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">
                Search is temporarily unavailable
              </p>
              <p className="text-sm text-amber-700 mt-1">
                You can still register your business by entering details manually.
              </p>
              <button
                onClick={onSkipToManual}
                className="mt-2 text-sm font-medium text-amber-900 underline"
              >
                Continue with manual entry →
              </button>
            </div>
          </div>
        </motion.div>
      )}

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
```

---

## Acceptance Criteria

### Search Functionality
- [ ] Search input is focused on page load
- [ ] Suggestions appear after 3+ characters
- [ ] Max 5 suggestions shown
- [ ] 300ms debounce on typing
- [ ] Loading spinner during search

### Suggestion Display
- [ ] Business name prominently displayed
- [ ] Address shown as secondary text
- [ ] Hover state on each suggestion
- [ ] Click selects the business

### Add New Business
- [ ] Always visible at bottom of dropdown
- [ ] Shows the typed business name
- [ ] Green styling to differentiate
- [ ] Clicking proceeds to Step 2

### Error Handling
- [ ] Error message shown when API fails
- [ ] "Enter manually" option always available
- [ ] API unavailable state handled gracefully

### Mobile Responsiveness
- [ ] Full-width input on mobile
- [ ] Touch-friendly suggestion items
- [ ] Dropdown doesn't overflow screen

### Google API Compliance (ToS Requirement)
- [ ] "Powered by Google" attribution displayed below search input
- [ ] Attribution visible when suggestions are shown
- [ ] Uses Google's logo requirements

---

## Definition of Done

- [ ] Component implemented as specified
- [ ] Integrated with `useBusinessSearch` hook
- [ ] All acceptance criteria met
- [ ] Mobile responsive
- [ ] Animations smooth
- [ ] Unit tests passing
- [ ] Integrated into onboarding wizard

---

**Story Status:** 📋 Ready for Implementation  
**Estimated Hours:** 16 hours
