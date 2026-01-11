# Story 4C.1: Google Places API Integration

**Epic:** Epic 4C - Smart Business Onboarding  
**Priority:** 🔴 P0 - CRITICAL  
**Effort:** 3 days  
**Dependencies:** None  
**Status:** ✅ Completed

---

## Overview

Integrate Google Places API to enable smart business search with autocomplete, allowing business owners to find and select their business from Google's database. This dramatically reduces manual data entry and improves data accuracy.

---

## User Stories

### US-4C.1.1: Business Search Autocomplete
**As a** business owner registering on SynC  
**I want to** search for my business by name and see suggestions  
**So that** I don't have to manually enter all my business details

**Acceptance Criteria:**
- [ ] Search input appears as first step
- [ ] Suggestions appear after typing 3+ characters
- [ ] Each suggestion shows business name and address
- [ ] Typing is debounced (300ms delay)
- [ ] Maximum 5 suggestions displayed

---

### US-4C.1.2: Business Details Pre-fill
**As a** business owner  
**I want to** have my business details auto-filled when I select a suggestion  
**So that** registration is faster and more accurate

**Acceptance Criteria:**
- [ ] Selecting a suggestion fetches full details
- [ ] Name, address, phone, website are pre-filled
- [ ] Opening hours are parsed and pre-filled (if available)
- [ ] Location coordinates are set automatically
- [ ] Category is mapped to SynC categories

---

### US-4C.1.3: New Business Option
**As a** business owner whose business isn't on Google  
**I want to** add my business manually  
**So that** I can still register on SynC

**Acceptance Criteria:**
- [ ] "Add [Business Name] as new" option always visible
- [ ] Clicking proceeds to manual entry flow
- [ ] Business name is carried forward
- [ ] All other fields are empty/editable

---

### US-4C.1.4: Fallback to Manual Entry
**As a** platform  
**I want to** gracefully handle API failures  
**So that** users can still register when Google is unavailable

**Acceptance Criteria:**
- [ ] Error state shows "Search unavailable" message
- [ ] "Enter details manually" button is prominent
- [ ] Clicking proceeds to current manual flow
- [ ] No error is shown if user types and proceeds manually

---

## Technical Requirements

### Environment Variables
```env
# .env.local
VITE_GOOGLE_PLACES_API_KEY=AIza...your_key_here
```

### New Service: `businessSearchService.ts`
**Location:** `src/services/businessSearchService.ts`

```typescript
// Complete implementation - copy to file

/**
 * Google Places API integration for business search
 * 
 * Free Tier (after March 2025):
 * - Essentials (Autocomplete): 10,000 requests/month
 * - Pro (Place Details): 5,000 requests/month
 * 
 * @see https://developers.google.com/maps/documentation/places/web-service
 */

// Types
export interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
  types: string[];
}

export interface PlaceDetails {
  name: string;
  formatted_address: string;
  formatted_phone_number?: string;
  international_phone_number?: string;
  website?: string;
  opening_hours?: {
    weekday_text: string[];
    periods: Array<{
      open: { day: number; time: string };
      close: { day: number; time: string };
    }>;
  };
  geometry: {
    location: { lat: number; lng: number };
  };
  types: string[];
  address_components: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
}

export interface ParsedAddress {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface BusinessSearchResult {
  name: string;
  phone: string;
  website: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  openingHours?: string[];
  googlePlaceId: string;
  category?: string;
}

// API Configuration
const API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
const PLACES_API_BASE = 'https://maps.googleapis.com/maps/api/place';

// Session token for billing optimization
let currentSessionToken: string | null = null;

function getSessionToken(): string {
  if (!currentSessionToken) {
    currentSessionToken = crypto.randomUUID();
  }
  return currentSessionToken;
}

function resetSessionToken(): void {
  currentSessionToken = null;
}

/**
 * Search for businesses using Places Autocomplete API
 * 
 * @param query - Business name to search for
 * @returns Array of place predictions
 */
export async function searchBusinesses(query: string): Promise<PlacePrediction[]> {
  if (!query || query.length < 3) {
    return [];
  }

  if (!API_KEY) {
    console.error('Google Places API key not configured');
    throw new Error('Search service not configured');
  }

  const sessionToken = getSessionToken();
  
  const params = new URLSearchParams({
    input: query,
    types: 'establishment',
    components: 'country:in', // Restrict to India
    key: API_KEY,
    sessiontoken: sessionToken
  });

  try {
    const response = await fetch(`${PLACES_API_BASE}/autocomplete/json?${params}`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status === 'ZERO_RESULTS') {
      return [];
    }

    if (data.status !== 'OK') {
      console.error('Places API error:', data.status, data.error_message);
      throw new Error(data.error_message || 'Search failed');
    }

    return data.predictions || [];
  } catch (error) {
    console.error('Business search error:', error);
    throw error;
  }
}

/**
 * Get detailed information about a specific place
 * 
 * @param placeId - Google Place ID
 * @returns Place details or null
 */
export async function getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  if (!API_KEY) {
    console.error('Google Places API key not configured');
    throw new Error('Search service not configured');
  }

  const sessionToken = getSessionToken();
  
  // Request only needed fields to minimize cost
  const fields = [
    'name',
    'formatted_address',
    'formatted_phone_number',
    'international_phone_number',
    'website',
    'opening_hours',
    'geometry',
    'types',
    'address_components'
  ].join(',');

  const params = new URLSearchParams({
    place_id: placeId,
    fields: fields,
    key: API_KEY,
    sessiontoken: sessionToken
  });

  try {
    const response = await fetch(`${PLACES_API_BASE}/details/json?${params}`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status !== 'OK') {
      console.error('Place details error:', data.status, data.error_message);
      return null;
    }

    // Reset session token after details fetch (billing optimization)
    resetSessionToken();

    return data.result || null;
  } catch (error) {
    console.error('Place details error:', error);
    throw error;
  }
}

/**
 * Parse address components into structured format
 * 
 * @param components - Google address components
 * @returns Parsed address object
 */
export function parseAddressComponents(
  components: PlaceDetails['address_components']
): ParsedAddress {
  const getComponent = (type: string): string => {
    const component = components.find(c => c.types.includes(type));
    return component?.long_name || '';
  };

  const streetNumber = getComponent('street_number');
  const route = getComponent('route');
  const street = [streetNumber, route].filter(Boolean).join(' ');

  return {
    street: street || getComponent('sublocality_level_1'),
    city: getComponent('locality') || getComponent('administrative_area_level_2'),
    state: getComponent('administrative_area_level_1'),
    postalCode: getComponent('postal_code'),
    country: getComponent('country')
  };
}

/**
 * Map Google business types to SynC categories
 * 
 * @param types - Array of Google place types
 * @returns SynC category name or null
 */
export function mapGoogleCategoryToSynC(types: string[]): string | null {
  const categoryMap: Record<string, string> = {
    // Food & Dining
    restaurant: 'food_dining',
    cafe: 'food_dining',
    bakery: 'food_dining',
    bar: 'food_dining',
    meal_delivery: 'food_dining',
    meal_takeaway: 'food_dining',
    
    // Retail & Shopping
    store: 'retail',
    shopping_mall: 'retail',
    clothing_store: 'retail',
    electronics_store: 'retail',
    furniture_store: 'retail',
    jewelry_store: 'retail',
    shoe_store: 'retail',
    supermarket: 'retail',
    convenience_store: 'retail',
    
    // Health & Beauty
    beauty_salon: 'health_beauty',
    spa: 'health_beauty',
    gym: 'health_beauty',
    hair_care: 'health_beauty',
    
    // Healthcare
    doctor: 'healthcare',
    hospital: 'healthcare',
    pharmacy: 'healthcare',
    dentist: 'healthcare',
    physiotherapist: 'healthcare',
    veterinary_care: 'healthcare',
    
    // Education
    school: 'education',
    university: 'education',
    library: 'education',
    
    // Hospitality & Travel
    hotel: 'hospitality',
    lodging: 'hospitality',
    travel_agency: 'hospitality',
    
    // Automotive
    car_repair: 'automotive',
    car_dealer: 'automotive',
    car_wash: 'automotive',
    gas_station: 'automotive',
    
    // Professional Services
    lawyer: 'professional_services',
    accounting: 'professional_services',
    insurance_agency: 'professional_services',
    
    // Real Estate
    real_estate_agency: 'real_estate',
    
    // Entertainment
    movie_theater: 'entertainment',
    amusement_park: 'entertainment',
    night_club: 'entertainment',
    
    // Home Services
    electrician: 'home_services',
    plumber: 'home_services',
    locksmith: 'home_services',
    painter: 'home_services',
    roofing_contractor: 'home_services',
    moving_company: 'home_services'
  };

  for (const type of types) {
    if (categoryMap[type]) {
      return categoryMap[type];
    }
  }
  
  return null;
}

/**
 * Parse Google opening hours to SynC format
 * 
 * @param openingHours - Google opening hours object
 * @returns SynC-format operating hours
 */
export function parseOpeningHours(
  openingHours?: PlaceDetails['opening_hours']
): Record<string, { open: string; close: string; closed: boolean }> | null {
  if (!openingHours?.periods) {
    return null;
  }

  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const result: Record<string, { open: string; close: string; closed: boolean }> = {};

  // Initialize all days as closed
  days.forEach(day => {
    result[day] = { open: '09:00', close: '18:00', closed: true };
  });

  // Parse periods
  openingHours.periods.forEach(period => {
    const dayName = days[period.open.day];
    if (dayName && period.open && period.close) {
      const openTime = `${period.open.time.slice(0, 2)}:${period.open.time.slice(2)}`;
      const closeTime = `${period.close.time.slice(0, 2)}:${period.close.time.slice(2)}`;
      result[dayName] = { open: openTime, close: closeTime, closed: false };
    }
  });

  return result;
}

/**
 * Complete flow: Search and get full business details
 * 
 * @param placeId - Google Place ID from autocomplete
 * @returns Structured business data for form pre-fill
 */
export async function getBusinessSearchResult(
  placeId: string
): Promise<BusinessSearchResult | null> {
  const details = await getPlaceDetails(placeId);
  
  if (!details) {
    return null;
  }

  const address = parseAddressComponents(details.address_components);
  const category = mapGoogleCategoryToSynC(details.types);

  return {
    name: details.name,
    phone: details.formatted_phone_number?.replace(/\s+/g, '') || '',
    website: details.website || '',
    address: address.street || details.formatted_address.split(',')[0],
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    latitude: details.geometry.location.lat,
    longitude: details.geometry.location.lng,
    openingHours: details.opening_hours?.weekday_text,
    googlePlaceId: placeId,
    category: category || undefined
  };
}

/**
 * Check if API is available (for fallback logic)
 */
export function isApiConfigured(): boolean {
  return !!API_KEY;
}
```

---

### New Hook: `useBusinessSearch.ts`
**Location:** `src/hooks/useBusinessSearch.ts`

```typescript
// Complete implementation - copy to file

import { useState, useCallback, useRef, useEffect } from 'react';
import { useDebouncedCallback } from 'use-debounce';
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
  
  // Track if component is mounted to prevent state updates after unmount
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Debounced search function
  const debouncedSearch = useDebouncedCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 3) {
      if (isMounted.current) {
        setSuggestions([]);
      }
      return;
    }

    if (!isApiAvailable) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const results = await searchBusinesses(searchQuery);
      
      if (isMounted.current) {
        setSuggestions(results);
      }
    } catch (err) {
      console.error('Search error:', err);
      if (isMounted.current) {
        setError('Search temporarily unavailable');
        setSuggestions([]);
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, 300);

  // Set query and trigger search
  const setQuery = useCallback((newQuery: string) => {
    setQueryState(newQuery);
    debouncedSearch(newQuery);
  }, [debouncedSearch]);

  // Select a place and get full details
  const selectPlace = useCallback(async (
    placeId: string
  ): Promise<BusinessSearchResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getBusinessSearchResult(placeId);
      
      if (isMounted.current) {
        setSuggestions([]); // Clear suggestions after selection
      }
      
      return result;
    } catch (err) {
      console.error('Place details error:', err);
      if (isMounted.current) {
        setError('Could not load business details');
      }
      return null;
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
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
```

---

## Google Cloud Setup Instructions

### Step 1: Create Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Create Project"
3. Name: "SynC Business Platform"
4. Click "Create"

### Step 2: Enable Places API
1. Go to APIs & Services → Library
2. Search "Places API"
3. Click "Enable"
4. Also enable "Places API (New)" for future features

### Step 3: Create API Key
1. Go to APIs & Services → Credentials
2. Click "Create Credentials" → "API Key"
3. Copy the key

### Step 4: Restrict API Key
1. Click on the API key to edit
2. Under "Application restrictions":
   - Select "HTTP referrers"
   - Add: `localhost:*`, `your-domain.com/*`
3. Under "API restrictions":
   - Select "Restrict key"
   - Choose only "Places API"
4. Save

### Step 5: Set Budget Alert
1. Go to Billing → Budgets & alerts
2. Create budget: $10/month
3. Set alerts at: 50%, 80%, 100%

---

## Testing Plan

### Unit Tests
```typescript
// src/services/__tests__/businessSearchService.test.ts

describe('businessSearchService', () => {
  describe('searchBusinesses', () => {
    it('returns empty array for queries under 3 characters', async () => {
      const result = await searchBusinesses('ab');
      expect(result).toEqual([]);
    });

    it('returns predictions for valid queries', async () => {
      // Mock fetch
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          status: 'OK',
          predictions: [
            { place_id: '123', description: 'Test Business' }
          ]
        })
      });

      const result = await searchBusinesses('Test Business');
      expect(result).toHaveLength(1);
    });

    it('handles ZERO_RESULTS gracefully', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: 'ZERO_RESULTS' })
      });

      const result = await searchBusinesses('xyznonexistent');
      expect(result).toEqual([]);
    });
  });

  describe('mapGoogleCategoryToSynC', () => {
    it('maps restaurant to food_dining', () => {
      const result = mapGoogleCategoryToSynC(['restaurant', 'food']);
      expect(result).toBe('food_dining');
    });

    it('returns null for unknown types', () => {
      const result = mapGoogleCategoryToSynC(['unknown_type']);
      expect(result).toBeNull();
    });
  });
});
```

### Integration Tests
```typescript
// Test with real API (run manually, not in CI)
describe('Google Places Integration', () => {
  it('can search for a known business', async () => {
    const results = await searchBusinesses('Taj Mahal Palace Mumbai');
    expect(results.length).toBeGreaterThan(0);
  });

  it('can get place details', async () => {
    const results = await searchBusinesses('Cafe Coffee Day Bangalore');
    if (results.length > 0) {
      const details = await getPlaceDetails(results[0].place_id);
      expect(details?.name).toBeDefined();
    }
  });
});
```

---

## Definition of Done

- [x] `businessSearchService.ts` implemented and tested
- [x] `useBusinessSearch.ts` hook implemented
- [x] API key configured in `.env.local`
- [x] API key restrictions applied
- [x] Budget alert configured
- [x] Unit tests passing
- [x] Manual integration test successful
- [x] Error handling verified
- [x] Documentation updated

---

## Notes

### Session Tokens
Google recommends using session tokens to group autocomplete requests with a Place Details request. This optimizes billing - you're charged for the session instead of individual requests.

### Rate Limiting
The debounce (300ms) prevents excessive API calls while typing. This is important for:
1. User experience (no flickering)
2. Cost optimization
3. Staying within rate limits

### Fallback Strategy
If the API is unavailable or quota is exceeded:
1. Show "Search unavailable" message
2. Offer "Enter manually" option
3. Proceed with existing manual flow

---

**Story Status:** 📋 Ready for Implementation  
**Estimated Hours:** 24 hours  
**Reviewer:** [TBD]
