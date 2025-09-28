// locationService.ts
// Advanced location service with geocoding, address resolution, and location management

import { supabase } from '../lib/supabase';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface LocationInfo {
  coordinates: Coordinates;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode?: string;
  placeId?: string;
  formattedAddress?: string;
}

export interface SavedLocation {
  id: string;
  user_id: string;
  name: string;
  address: string;
  coordinates: Coordinates;
  type: 'home' | 'work' | 'favorite' | 'recent';
  created_at: string;
  updated_at: string;
}

export interface LocationSearchResult {
  placeId: string;
  name: string;
  address: string;
  coordinates: Coordinates;
  types: string[];
  rating?: number;
  vicinity?: string;
}

export interface LocationHistory {
  id: string;
  user_id: string;
  coordinates: Coordinates;
  address: string;
  search_query?: string;
  accessed_at: string;
}

class LocationService {
  private geocodeCache = new Map<string, LocationInfo>();
  private reverseGeocodeCache = new Map<string, LocationInfo>();

  /**
   * Get current user location with high accuracy
   */
  async getCurrentLocation(options?: PositionOptions): Promise<LocationInfo> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      const defaultOptions: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes cache
        ...options
      };

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const coordinates: Coordinates = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };

          try {
            // Get address information via reverse geocoding
            const locationInfo = await this.reverseGeocode(coordinates);
            resolve(locationInfo);
          } catch (error) {
            // Return basic location info if reverse geocoding fails
            resolve({
              coordinates,
              address: 'Unknown Location',
              city: 'Unknown City',
              state: 'Unknown State',
              country: 'Unknown Country'
            });
          }
        },
        (error) => {
          let message = 'Failed to get location';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = 'Location access denied by user';
              break;
            case error.POSITION_UNAVAILABLE:
              message = 'Location information unavailable';
              break;
            case error.TIMEOUT:
              message = 'Location request timed out';
              break;
          }
          reject(new Error(message));
        },
        defaultOptions
      );
    });
  }

  /**
   * Geocode an address to coordinates
   */
  async geocodeAddress(address: string): Promise<LocationInfo> {
    // Check cache first
    if (this.geocodeCache.has(address)) {
      return this.geocodeCache.get(address)!;
    }

    try {
      // Use multiple geocoding services for better accuracy
      let result: LocationInfo;

      // Try browser Geocoding API first (if available)
      if ('geocoding' in window) {
        result = await this.browserGeocode(address);
      } else {
        // Fallback to third-party service
        result = await this.fallbackGeocode(address);
      }

      // Cache the result
      this.geocodeCache.set(address, result);
      return result;

    } catch (error) {
      console.error('Geocoding failed:', error);
      throw new Error(`Failed to geocode address: ${address}`);
    }
  }

  /**
   * Reverse geocode coordinates to address
   */
  async reverseGeocode(coordinates: Coordinates): Promise<LocationInfo> {
    const cacheKey = `${coordinates.lat},${coordinates.lng}`;
    
    // Check cache first
    if (this.reverseGeocodeCache.has(cacheKey)) {
      return this.reverseGeocodeCache.get(cacheKey)!;
    }

    try {
      let result: LocationInfo;

      // Try browser reverse geocoding first
      if ('geocoding' in window) {
        result = await this.browserReverseGeocode(coordinates);
      } else {
        // Fallback to third-party service
        result = await this.fallbackReverseGeocode(coordinates);
      }

      // Cache the result
      this.reverseGeocodeCache.set(cacheKey, result);
      return result;

    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      throw new Error('Failed to get address for coordinates');
    }
  }

  /**
   * Search for places/addresses
   */
  async searchPlaces(query: string, location?: Coordinates): Promise<LocationSearchResult[]> {
    try {
      // Use browser Places API if available
      if ('places' in window) {
        return await this.browserPlacesSearch(query, location);
      } else {
        // Fallback to third-party service
        return await this.fallbackPlacesSearch(query, location);
      }
    } catch (error) {
      console.error('Places search failed:', error);
      return [];
    }
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRad(coord2.lat - coord1.lat);
    const dLon = this.toRad(coord2.lng - coord1.lng);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRad(coord1.lat)) * Math.cos(this.toRad(coord2.lat)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Format distance for display
   */
  formatDistance(distance: number): string {
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }
    return `${distance.toFixed(1)}km`;
  }

  /**
   * Save a location for the user
   */
  async saveLocation(location: Omit<SavedLocation, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<SavedLocation> {
    const { data, error } = await supabase
      .from('saved_locations')
      .insert({
        ...location,
        user_id: (await supabase.auth.getUser()).data.user?.id
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get user's saved locations
   */
  async getSavedLocations(type?: SavedLocation['type']): Promise<SavedLocation[]> {
    let query = supabase
      .from('saved_locations')
      .select('*')
      .order('updated_at', { ascending: false });

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  /**
   * Update a saved location
   */
  async updateSavedLocation(id: string, updates: Partial<SavedLocation>): Promise<SavedLocation> {
    const { data, error } = await supabase
      .from('saved_locations')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete a saved location
   */
  async deleteSavedLocation(id: string): Promise<void> {
    const { error } = await supabase
      .from('saved_locations')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Add location to history
   */
  async addToLocationHistory(coordinates: Coordinates, address: string, searchQuery?: string): Promise<void> {
    try {
      await supabase
        .from('location_history')
        .insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          coordinates,
          address,
          search_query: searchQuery,
          accessed_at: new Date().toISOString()
        });
    } catch (error) {
      console.warn('Failed to add to location history:', error);
    }
  }

  /**
   * Get location history
   */
  async getLocationHistory(limit: number = 10): Promise<LocationHistory[]> {
    const { data, error } = await supabase
      .from('location_history')
      .select('*')
      .order('accessed_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  /**
   * Clear location history
   */
  async clearLocationHistory(): Promise<void> {
    const { error } = await supabase
      .from('location_history')
      .delete()
      .match({ user_id: (await supabase.auth.getUser()).data.user?.id });

    if (error) throw error;
  }

  /**
   * Get address suggestions for autocomplete
   */
  async getAddressSuggestions(input: string, location?: Coordinates): Promise<string[]> {
    if (input.length < 3) return [];

    try {
      const places = await this.searchPlaces(input, location);
      return places.map(place => place.address);
    } catch (error) {
      console.warn('Failed to get address suggestions:', error);
      return [];
    }
  }

  // Private helper methods

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private async browserGeocode(address: string): Promise<LocationInfo> {
    // This would use the browser's Geocoding API if available
    // For now, we'll use a fallback implementation
    return this.fallbackGeocode(address);
  }

  private async browserReverseGeocode(coordinates: Coordinates): Promise<LocationInfo> {
    // This would use the browser's reverse geocoding API if available
    // For now, we'll use a fallback implementation
    return this.fallbackReverseGeocode(coordinates);
  }

  private async browserPlacesSearch(query: string, location?: Coordinates): Promise<LocationSearchResult[]> {
    // This would use the browser's Places API if available
    // For now, we'll use a fallback implementation
    return this.fallbackPlacesSearch(query, location);
  }

  private async fallbackGeocode(address: string): Promise<LocationInfo> {
    // Using OpenStreetMap Nominatim as fallback (free, no API key required)
    const encodedAddress = encodeURIComponent(address);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&addressdetails=1`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data || data.length === 0) {
      throw new Error('No results found');
    }

    const result = data[0];
    return {
      coordinates: {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon)
      },
      address: result.display_name,
      city: result.address?.city || result.address?.town || result.address?.village || 'Unknown',
      state: result.address?.state || result.address?.region || 'Unknown',
      country: result.address?.country || 'Unknown',
      postalCode: result.address?.postcode,
      placeId: result.place_id?.toString(),
      formattedAddress: result.display_name
    };
  }

  private async fallbackReverseGeocode(coordinates: Coordinates): Promise<LocationInfo> {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coordinates.lat}&lon=${coordinates.lng}&addressdetails=1`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data) {
      throw new Error('No address found');
    }

    return {
      coordinates,
      address: data.display_name,
      city: data.address?.city || data.address?.town || data.address?.village || 'Unknown',
      state: data.address?.state || data.address?.region || 'Unknown',
      country: data.address?.country || 'Unknown',
      postalCode: data.address?.postcode,
      placeId: data.place_id?.toString(),
      formattedAddress: data.display_name
    };
  }

  private async fallbackPlacesSearch(query: string, location?: Coordinates): Promise<LocationSearchResult[]> {
    const encodedQuery = encodeURIComponent(query);
    let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&limit=10&addressdetails=1`;

    // Add location bias if provided
    if (location) {
      url += `&lat=${location.lat}&lon=${location.lng}`;
    }

    const response = await fetch(url);
    const data = await response.json();

    return (data || []).map((result: any) => ({
      placeId: result.place_id?.toString() || '',
      name: result.name || result.display_name.split(',')[0],
      address: result.display_name,
      coordinates: {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon)
      },
      types: result.type ? [result.type] : [],
      vicinity: result.address?.neighbourhood || result.address?.suburb
    }));
  }
}

export const locationService = new LocationService();
export default locationService;