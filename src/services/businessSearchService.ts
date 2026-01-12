/**
 * Google Places API integration for business search
 * Story 4C.1: Google Places API Integration
 * 
 * Uses Google Maps JavaScript SDK (Places Library) for CORS-safe browser calls.
 * The @react-google-maps/api package handles script loading.
 * 
 * @see https://developers.google.com/maps/documentation/javascript/places-autocomplete
 */

// Types
import { isApiAvailable, logApiUsage } from './apiUsageService';

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
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const IS_DEV = import.meta.env.DEV;
const USE_MOCK = !API_KEY || API_KEY === 'your_google_maps_api_key_here';

// Mock Data
const MOCK_PREDICTIONS: PlacePrediction[] = [
    {
        place_id: 'mock_place_starbucks',
        description: 'Starbucks Coffee, Connaught Place, New Delhi, Delhi, India',
        structured_formatting: {
            main_text: 'Starbucks Coffee',
            secondary_text: 'Connaught Place, New Delhi, Delhi, India'
        },
        types: ['cafe', 'food', 'establishment']
    },
    {
        place_id: 'mock_place_pizzahut',
        description: 'Pizza Hut, Indiranagar, Bengaluru, Karnataka, India',
        structured_formatting: {
            main_text: 'Pizza Hut',
            secondary_text: 'Indiranagar, Bengaluru, Karnataka, India'
        },
        types: ['restaurant', 'food', 'establishment']
    },
    {
        place_id: 'mock_place_apollo',
        description: 'Apollo Hospitals, Greams Road, Chennai, Tamil Nadu, India',
        structured_formatting: {
            main_text: 'Apollo Hospitals',
            secondary_text: 'Greams Road, Chennai, Tamil Nadu, India'
        },
        types: ['hospital', 'health', 'establishment']
    }
];

const MOCK_DETAILS: Record<string, PlaceDetails> = {
    'mock_place_starbucks': {
        name: 'Starbucks Coffee',
        formatted_address: 'Block A, Connaught Place, New Delhi, Delhi 110001, India',
        formatted_phone_number: '011 4112 3456',
        international_phone_number: '+91 11 4112 3456',
        website: 'https://www.starbucks.in',
        opening_hours: {
            weekday_text: ['Monday: 8:00 AM – 10:00 PM', 'Tuesday: 8:00 AM – 10:00 PM', '...'],
            periods: [
                { open: { day: 0, time: '0800' }, close: { day: 0, time: '2200' } },
                { open: { day: 1, time: '0800' }, close: { day: 1, time: '2200' } },
                { open: { day: 2, time: '0800' }, close: { day: 2, time: '2200' } },
                { open: { day: 3, time: '0800' }, close: { day: 3, time: '2200' } },
                { open: { day: 4, time: '0800' }, close: { day: 4, time: '2200' } },
                { open: { day: 5, time: '0800' }, close: { day: 5, time: '2200' } },
                { open: { day: 6, time: '0800' }, close: { day: 6, time: '2200' } }
            ]
        },
        geometry: { location: { lat: 28.6328, lng: 77.2197 } },
        types: ['cafe', 'food', 'point_of_interest', 'establishment'],
        address_components: [
            { long_name: 'Connaught Place', short_name: 'CP', types: ['sublocality_level_1'] },
            { long_name: 'New Delhi', short_name: 'New Delhi', types: ['locality'] },
            { long_name: 'Delhi', short_name: 'DL', types: ['administrative_area_level_1'] },
            { long_name: '110001', short_name: '110001', types: ['postal_code'] },
            { long_name: 'India', short_name: 'IN', types: ['country'] }
        ]
    },
    'mock_place_pizzahut': {
        name: 'Pizza Hut',
        formatted_address: '100 Feet Rd, Indiranagar, Bengaluru, Karnataka 560038, India',
        formatted_phone_number: '080 6754 3211',
        website: 'https://www.pizzahut.co.in',
        geometry: { location: { lat: 12.9716, lng: 77.5946 } },
        types: ['restaurant', 'food', 'establishment'],
        address_components: [
            { long_name: 'Indiranagar', short_name: 'Indiranagar', types: ['sublocality_level_1'] },
            { long_name: 'Bengaluru', short_name: 'Bengaluru', types: ['locality'] },
            { long_name: 'Karnataka', short_name: 'KA', types: ['administrative_area_level_1'] },
            { long_name: '560038', short_name: '560038', types: ['postal_code'] }
        ]
    }
};

// Store references to Google services
let autocompleteService: google.maps.places.AutocompleteService | null = null;
let placesService: google.maps.places.PlacesService | null = null;
let sessionToken: google.maps.places.AutocompleteSessionToken | null = null;

/**
 * Initialize Google Places services
 * Must be called after Google Maps script is loaded
 */
export function initPlacesServices(): boolean {
    if (typeof google === 'undefined' || !google.maps?.places) {
        // Only warn if we are NOT in mock mode, otherwise it's expected
        if (!USE_MOCK) {
            console.warn('Google Maps Places library not loaded');
        }
        return false;
    }

    if (!autocompleteService) {
        autocompleteService = new google.maps.places.AutocompleteService();
    }

    if (!placesService) {
        // PlacesService requires a map or div element
        const dummyDiv = document.createElement('div');
        placesService = new google.maps.places.PlacesService(dummyDiv);
    }

    return true;
}

/**
 * Get or create a session token for billing optimization
 */
function getSessionToken(): google.maps.places.AutocompleteSessionToken | undefined {
    if (USE_MOCK) return undefined;

    if (!sessionToken && google?.maps?.places) {
        sessionToken = new google.maps.places.AutocompleteSessionToken();
    }
    return sessionToken || undefined;
}

/**
 * Reset session token after place details fetch
 */
function resetSessionToken(): void {
    sessionToken = null;
}

/**
 * Search for businesses using Places Autocomplete
 * 
 * @param query - Business name to search for
 * @returns Array of place predictions
 */
export async function searchBusinesses(query: string): Promise<PlacePrediction[]> {
    if (!query || query.length < 3) {
        return [];
    }

    // Check API Availability (Quota/Circuit Breaker)
    const isAvailable = await isApiAvailable('google_places');
    if (!isAvailable) {
        console.warn('Google Places API quota exceeded or disabled.');
        throw new Error('API_QUOTA_EXCEEDED');
    }

    // Mock Mode
    if (USE_MOCK) {
        console.log('Using Mock Search for:', query);
        await new Promise(resolve => setTimeout(resolve, 600)); // Network delay
        return MOCK_PREDICTIONS.filter(p =>
            p.structured_formatting.main_text.toLowerCase().includes(query.toLowerCase())
        );
    }

    if (!initPlacesServices() || !autocompleteService) {
        console.error('Google Places service not initialized');
        throw new Error('Search service not available');
    }

    return new Promise((resolve, reject) => {
        autocompleteService!.getPlacePredictions(
            {
                input: query,
                types: ['establishment'],
                componentRestrictions: { country: 'in' }, // Restrict to India
                sessionToken: getSessionToken()
            },
            (predictions, status) => {
                if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
                    logApiUsage('google_places', 'autocomplete', { status: 'success' });
                    resolve([]);
                    return;
                }

                if (status !== google.maps.places.PlacesServiceStatus.OK || !predictions) {
                    console.error('Places autocomplete error:', status);
                    logApiUsage('google_places', 'autocomplete', { status: 'error' });
                    reject(new Error('Search failed'));
                    return;
                }

                logApiUsage('google_places', 'autocomplete', { status: 'success' });

                const results: PlacePrediction[] = predictions.map(p => ({
                    place_id: p.place_id || '',
                    description: p.description || '',
                    structured_formatting: {
                        main_text: p.structured_formatting?.main_text || '',
                        secondary_text: p.structured_formatting?.secondary_text || ''
                    },
                    types: p.types || []
                }));

                resolve(results);
            }
        );
    });
}

/**
 * Get detailed information about a specific place
 * 
 * @param placeId - Google Place ID
 * @returns Place details or null
 */
export async function getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
    // Mock Mode
    if (USE_MOCK && placeId.startsWith('mock_')) {
        console.log('Using Mock Details for:', placeId);
        await new Promise(resolve => setTimeout(resolve, 800)); // Network delay
        return MOCK_DETAILS[placeId] || null;
    }

    // Check API Availability
    const isAvailable = await isApiAvailable('google_places');
    if (!isAvailable) {
        throw new Error('API_QUOTA_EXCEEDED');
    }

    if (!initPlacesServices() || !placesService) {
        console.error('Google Places service not initialized');
        throw new Error('Search service not available');
    }

    return new Promise((resolve, reject) => {
        placesService!.getDetails(
            {
                placeId: placeId,
                fields: [
                    'name',
                    'formatted_address',
                    'formatted_phone_number',
                    'international_phone_number',
                    'website',
                    'opening_hours',
                    'geometry',
                    'types',
                    'address_components'
                ],
                sessionToken: getSessionToken()
            },
            (place, status) => {
                // Reset session token after details fetch (billing optimization)
                resetSessionToken();

                if (status !== google.maps.places.PlacesServiceStatus.OK || !place) {
                    console.error('Place details error:', status);
                    logApiUsage('google_places', 'details', { status: 'error' });
                    resolve(null);
                    return;
                }

                logApiUsage('google_places', 'details', { status: 'success' });

                const details: PlaceDetails = {
                    name: place.name || '',
                    formatted_address: place.formatted_address || '',
                    formatted_phone_number: place.formatted_phone_number,
                    international_phone_number: place.international_phone_number,
                    website: place.website,
                    opening_hours: place.opening_hours ? {
                        weekday_text: place.opening_hours.weekday_text || [],
                        periods: (place.opening_hours.periods || []).map(p => ({
                            open: { day: p.open?.day || 0, time: p.open?.time || '0000' },
                            close: { day: p.close?.day || 0, time: p.close?.time || '0000' }
                        }))
                    } : undefined,
                    geometry: {
                        location: {
                            lat: place.geometry?.location?.lat() || 0,
                            lng: place.geometry?.location?.lng() || 0
                        }
                    },
                    types: place.types || [],
                    address_components: (place.address_components || []).map(c => ({
                        long_name: c.long_name || '',
                        short_name: c.short_name || '',
                        types: c.types || []
                    }))
                };

                resolve(details);
            }
        );
    });
}

/**
 * Parse address components into structured format
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
    // If we're using mock mode, say it's configured!
    if (USE_MOCK) return true;
    return !!API_KEY && API_KEY !== 'your_google_maps_api_key_here';
}
