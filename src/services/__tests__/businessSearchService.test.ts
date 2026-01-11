/**
 * Unit Tests for businessSearchService
 * Story 4C.1: Google Places API Integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    parseAddressComponents,
    mapGoogleCategoryToSynC,
    parseOpeningHours,
    PlaceDetails
} from '../businessSearchService';

// Mock import.meta.env
vi.mock('../businessSearchService', async (importOriginal) => {
    const actual = await importOriginal() as object;
    return {
        ...actual,
    };
});

describe('businessSearchService', () => {
    describe('parseAddressComponents', () => {
        it('should parse full address components correctly', () => {
            const components: PlaceDetails['address_components'] = [
                { long_name: '123', short_name: '123', types: ['street_number'] },
                { long_name: 'Main Street', short_name: 'Main St', types: ['route'] },
                { long_name: 'Mumbai', short_name: 'Mumbai', types: ['locality'] },
                { long_name: 'Maharashtra', short_name: 'MH', types: ['administrative_area_level_1'] },
                { long_name: '400001', short_name: '400001', types: ['postal_code'] },
                { long_name: 'India', short_name: 'IN', types: ['country'] }
            ];

            const result = parseAddressComponents(components);

            expect(result).toEqual({
                street: '123 Main Street',
                city: 'Mumbai',
                state: 'Maharashtra',
                postalCode: '400001',
                country: 'India'
            });
        });

        it('should fallback to sublocality when street is not available', () => {
            const components: PlaceDetails['address_components'] = [
                { long_name: 'Andheri West', short_name: 'Andheri West', types: ['sublocality_level_1'] },
                { long_name: 'Mumbai', short_name: 'Mumbai', types: ['locality'] },
                { long_name: 'Maharashtra', short_name: 'MH', types: ['administrative_area_level_1'] },
                { long_name: '400053', short_name: '400053', types: ['postal_code'] },
                { long_name: 'India', short_name: 'IN', types: ['country'] }
            ];

            const result = parseAddressComponents(components);

            expect(result.street).toBe('Andheri West');
            expect(result.city).toBe('Mumbai');
        });

        it('should handle missing components gracefully', () => {
            const components: PlaceDetails['address_components'] = [
                { long_name: 'Mumbai', short_name: 'Mumbai', types: ['locality'] }
            ];

            const result = parseAddressComponents(components);

            expect(result.street).toBe('');
            expect(result.city).toBe('Mumbai');
            expect(result.state).toBe('');
            expect(result.postalCode).toBe('');
        });

        it('should fallback to administrative_area_level_2 for city', () => {
            const components: PlaceDetails['address_components'] = [
                { long_name: 'Pune District', short_name: 'Pune', types: ['administrative_area_level_2'] },
                { long_name: 'Maharashtra', short_name: 'MH', types: ['administrative_area_level_1'] }
            ];

            const result = parseAddressComponents(components);

            expect(result.city).toBe('Pune District');
        });
    });

    describe('mapGoogleCategoryToSynC', () => {
        it('should map restaurant to food_dining', () => {
            const result = mapGoogleCategoryToSynC(['restaurant', 'food', 'establishment']);
            expect(result).toBe('food_dining');
        });

        it('should map cafe to food_dining', () => {
            const result = mapGoogleCategoryToSynC(['cafe', 'establishment']);
            expect(result).toBe('food_dining');
        });

        it('should map clothing_store to retail', () => {
            const result = mapGoogleCategoryToSynC(['clothing_store', 'store', 'establishment']);
            expect(result).toBe('retail');
        });

        it('should map beauty_salon to health_beauty', () => {
            const result = mapGoogleCategoryToSynC(['beauty_salon', 'establishment']);
            expect(result).toBe('health_beauty');
        });

        it('should map hospital to healthcare', () => {
            const result = mapGoogleCategoryToSynC(['hospital', 'health', 'establishment']);
            expect(result).toBe('healthcare');
        });

        it('should map school to education', () => {
            const result = mapGoogleCategoryToSynC(['school', 'establishment']);
            expect(result).toBe('education');
        });

        it('should map hotel to hospitality', () => {
            const result = mapGoogleCategoryToSynC(['hotel', 'lodging', 'establishment']);
            expect(result).toBe('hospitality');
        });

        it('should map car_repair to automotive', () => {
            const result = mapGoogleCategoryToSynC(['car_repair', 'establishment']);
            expect(result).toBe('automotive');
        });

        it('should map lawyer to professional_services', () => {
            const result = mapGoogleCategoryToSynC(['lawyer', 'establishment']);
            expect(result).toBe('professional_services');
        });

        it('should map plumber to home_services', () => {
            const result = mapGoogleCategoryToSynC(['plumber', 'establishment']);
            expect(result).toBe('home_services');
        });

        it('should return null for unknown types', () => {
            const result = mapGoogleCategoryToSynC(['unknown_type', 'establishment']);
            expect(result).toBeNull();
        });

        it('should return null for empty array', () => {
            const result = mapGoogleCategoryToSynC([]);
            expect(result).toBeNull();
        });

        it('should return first matching category', () => {
            // restaurant comes before store in the array, should match restaurant
            const result = mapGoogleCategoryToSynC(['restaurant', 'store', 'establishment']);
            expect(result).toBe('food_dining');
        });
    });

    describe('parseOpeningHours', () => {
        it('should return null when no opening hours provided', () => {
            const result = parseOpeningHours(undefined);
            expect(result).toBeNull();
        });

        it('should return null when periods are missing', () => {
            const result = parseOpeningHours({ weekday_text: ['Monday: Open'], periods: undefined as any });
            expect(result).toBeNull();
        });

        it('should parse opening hours correctly', () => {
            const openingHours: PlaceDetails['opening_hours'] = {
                weekday_text: [],
                periods: [
                    { open: { day: 1, time: '0900' }, close: { day: 1, time: '1800' } }, // Monday
                    { open: { day: 2, time: '0900' }, close: { day: 2, time: '1800' } }, // Tuesday
                    { open: { day: 3, time: '0900' }, close: { day: 3, time: '2100' } }, // Wednesday
                ]
            };

            const result = parseOpeningHours(openingHours);

            expect(result).not.toBeNull();
            expect(result!.monday).toEqual({ open: '09:00', close: '18:00', closed: false });
            expect(result!.tuesday).toEqual({ open: '09:00', close: '18:00', closed: false });
            expect(result!.wednesday).toEqual({ open: '09:00', close: '21:00', closed: false });
            // Days without periods should be marked as closed
            expect(result!.sunday.closed).toBe(true);
            expect(result!.thursday.closed).toBe(true);
        });

        it('should initialize all days as closed by default', () => {
            const openingHours: PlaceDetails['opening_hours'] = {
                weekday_text: [],
                periods: []
            };

            const result = parseOpeningHours(openingHours);

            expect(result).not.toBeNull();
            expect(result!.sunday.closed).toBe(true);
            expect(result!.monday.closed).toBe(true);
            expect(result!.tuesday.closed).toBe(true);
            expect(result!.wednesday.closed).toBe(true);
            expect(result!.thursday.closed).toBe(true);
            expect(result!.friday.closed).toBe(true);
            expect(result!.saturday.closed).toBe(true);
        });
    });
});
