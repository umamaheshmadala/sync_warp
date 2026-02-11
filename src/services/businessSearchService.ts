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
    // Enhanced fields (fetched at no extra cost with session token)
    rating?: number;
    user_ratings_total?: number;
    price_level?: number; // 0=Free, 1=Inexpensive, 2=Moderate, 3=Expensive, 4=Very Expensive
    url?: string; // Google Maps URL
    business_status?: string; // OPERATIONAL, CLOSED_TEMPORARILY, CLOSED_PERMANENTLY
    photos?: Array<{
        photo_reference: string;
        height: number;
        width: number;
    }>;
    editorial_summary?: {
        overview: string;
    };
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
    openingPeriods?: Array<{
        open: { day: number; time: string };
        close: { day: number; time: string };
    }>;
    googlePlaceId: string;
    category?: string;
    // Enhanced Google Places fields
    rating?: number;
    userRatingsTotal?: number;
    priceLevel?: number;
    googleMapsUrl?: string;
    businessStatus?: string;
    photoReference?: string;
    description?: string;
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
        ],
        // Enhanced fields
        rating: 4.3,
        user_ratings_total: 1247,
        price_level: 2,
        url: 'https://maps.google.com/?cid=mock_starbucks',
        business_status: 'OPERATIONAL',
        photos: [{ photo_reference: 'mock_photo_starbucks_001', height: 400, width: 600 }]
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
        ],
        rating: 3.9,
        user_ratings_total: 832,
        price_level: 2,
        url: 'https://maps.google.com/?cid=mock_pizzahut',
        business_status: 'OPERATIONAL',
        photos: [{ photo_reference: 'mock_photo_pizzahut_001', height: 400, width: 600 }]
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
                    // Basic tier (free with session token)
                    'name',
                    'formatted_address',
                    'formatted_phone_number',
                    'international_phone_number',
                    'website',
                    'opening_hours',
                    'geometry',
                    'types',
                    'address_components',
                    // Enhanced fields (bundled with session token — no extra cost)
                    'business_status',
                    'url',
                    'photos',
                    'editorial_summary',
                    // Atmosphere tier (bundled with details call)
                    'rating',
                    'user_ratings_total',
                    'price_level'
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
                    })),
                    // Enhanced fields
                    rating: (place as any).rating,
                    user_ratings_total: (place as any).user_ratings_total,
                    price_level: (place as any).price_level,
                    url: (place as any).url,
                    business_status: (place as any).business_status,
                    photos: (place as any).photos?.map((p: any) => ({
                        photo_reference: p.photo_reference || '',
                        height: p.height || 0,
                        width: p.width || 0
                    })),
                    editorial_summary: (place as any).editorial_summary
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
    // Maps Google Place types to business_categories.name values in our DB
    // DB values: restaurant, retail, services, healthcare, beauty, automotive, education, entertainment, fitness, technology
    const categoryMap: Record<string, string> = {
        // Food & Dining → restaurant
        restaurant: 'restaurant',
        cafe: 'restaurant',
        bakery: 'restaurant',
        bar: 'restaurant',
        meal_delivery: 'restaurant',
        meal_takeaway: 'restaurant',
        food: 'restaurant',

        // Retail & Shopping → retail
        store: 'retail',
        shopping_mall: 'retail',
        clothing_store: 'retail',
        furniture_store: 'retail',
        jewelry_store: 'retail',
        shoe_store: 'retail',
        supermarket: 'retail',
        convenience_store: 'retail',
        book_store: 'retail',
        hardware_store: 'retail',
        pet_store: 'retail',

        // Beauty & Wellness → beauty
        beauty_salon: 'beauty',
        spa: 'beauty',
        hair_care: 'beauty',

        // Fitness & Sports → fitness
        gym: 'fitness',
        stadium: 'fitness',

        // Healthcare → healthcare
        doctor: 'healthcare',
        hospital: 'healthcare',
        pharmacy: 'healthcare',
        dentist: 'healthcare',
        physiotherapist: 'healthcare',
        veterinary_care: 'healthcare',

        // Education → education
        school: 'education',
        university: 'education',
        library: 'education',

        // Automotive → automotive
        car_repair: 'automotive',
        car_dealer: 'automotive',
        car_wash: 'automotive',
        gas_station: 'automotive',

        // Entertainment → entertainment
        movie_theater: 'entertainment',
        amusement_park: 'entertainment',
        night_club: 'entertainment',
        bowling_alley: 'entertainment',
        casino: 'entertainment',

        // Services (catch-all for professional/home/hospitality)
        lawyer: 'services',
        accounting: 'services',
        insurance_agency: 'services',
        real_estate_agency: 'services',
        travel_agency: 'services',
        hotel: 'services',
        lodging: 'services',
        electrician: 'services',
        plumber: 'services',
        locksmith: 'services',
        painter: 'services',
        roofing_contractor: 'services',
        moving_company: 'services',
        bank: 'services',
        atm: 'services',
        post_office: 'services',
        laundry: 'services',

        // Technology → technology
        electronics_store: 'technology'
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
 * Fallback: Parse weekday_text strings directly when periods data is unavailable.
 * Handles strings like "Monday: 8:00 AM – 10:00 PM", "Sunday: Closed", "Monday: Open 24 hours"
 */
export function parseWeekdayTextToHours(
    weekdayText: string[]
): Record<string, { open: string; close: string; closed: boolean }> | null {
    if (!weekdayText || weekdayText.length === 0) return null;

    const dayMap: Record<string, string> = {
        'Monday': 'monday', 'Tuesday': 'tuesday', 'Wednesday': 'wednesday',
        'Thursday': 'thursday', 'Friday': 'friday', 'Saturday': 'saturday', 'Sunday': 'sunday'
    };

    const result: Record<string, { open: string; close: string; closed: boolean }> = {
        monday: { open: '09:00', close: '18:00', closed: true },
        tuesday: { open: '09:00', close: '18:00', closed: true },
        wednesday: { open: '09:00', close: '18:00', closed: true },
        thursday: { open: '09:00', close: '18:00', closed: true },
        friday: { open: '09:00', close: '18:00', closed: true },
        saturday: { open: '09:00', close: '18:00', closed: true },
        sunday: { open: '09:00', close: '18:00', closed: true }
    };

    let parsed = false;

    for (const text of weekdayText) {
        // Match "DayName: ..." pattern
        const match = text.match(/^(\w+):\s*(.+)$/);
        if (!match) continue;

        const dayName = dayMap[match[1]];
        const timeStr = match[2].trim();
        if (!dayName) continue;

        if (timeStr.toLowerCase() === 'closed') {
            result[dayName] = { open: '09:00', close: '18:00', closed: true };
            parsed = true;
        } else if (timeStr.toLowerCase().includes('open 24 hours')) {
            result[dayName] = { open: '00:00', close: '23:59', closed: false };
            parsed = true;
        } else {
            // Parse "8:00 AM – 10:00 PM" or "8:00 AM - 10:00 PM"
            const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s*[–\-]\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i);
            if (timeMatch) {
                const openHour = convertTo24Hour(parseInt(timeMatch[1]), timeMatch[3].toUpperCase());
                const openMin = timeMatch[2];
                const closeHour = convertTo24Hour(parseInt(timeMatch[4]), timeMatch[6].toUpperCase());
                const closeMin = timeMatch[5];
                result[dayName] = {
                    open: `${openHour.toString().padStart(2, '0')}:${openMin}`,
                    close: `${closeHour.toString().padStart(2, '0')}:${closeMin}`,
                    closed: false
                };
                parsed = true;
            }
        }
    }

    return parsed ? result : null;
}

function convertTo24Hour(hour: number, period: string): number {
    if (period === 'AM') return hour === 12 ? 0 : hour;
    return hour === 12 ? 12 : hour + 12;
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
        openingPeriods: details.opening_hours?.periods,
        googlePlaceId: placeId,
        category: category || undefined,
        // Enhanced Google Places fields
        rating: details.rating,
        userRatingsTotal: details.user_ratings_total,
        priceLevel: details.price_level,
        googleMapsUrl: details.url,
        businessStatus: details.business_status,
        photoReference: details.photos?.[0]?.photo_reference,
        description: details.editorial_summary?.overview
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
