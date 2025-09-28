// useAdvancedLocation.ts
// Advanced location management hook with saved locations, history, and geocoding

import { useState, useEffect, useCallback } from 'react';
import locationService, { 
  LocationInfo, 
  SavedLocation, 
  LocationHistory, 
  Coordinates, 
  LocationSearchResult 
} from '../services/locationService';
import { useAuthStore } from '../store/authStore';

interface LocationState {
  currentLocation: LocationInfo | null;
  savedLocations: SavedLocation[];
  locationHistory: LocationHistory[];
  isLoading: boolean;
  error: string | null;
  permissionStatus: 'prompt' | 'granted' | 'denied' | 'unknown';
}

interface UseAdvancedLocationReturn extends LocationState {
  // Current location methods
  getCurrentLocation: (options?: PositionOptions) => Promise<LocationInfo>;
  refreshCurrentLocation: () => Promise<void>;
  
  // Geocoding methods
  geocodeAddress: (address: string) => Promise<LocationInfo>;
  reverseGeocode: (coordinates: Coordinates) => Promise<LocationInfo>;
  searchPlaces: (query: string, location?: Coordinates) => Promise<LocationSearchResult[]>;
  getAddressSuggestions: (input: string) => Promise<string[]>;
  
  // Saved locations methods
  saveLocation: (location: Omit<SavedLocation, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<SavedLocation>;
  updateSavedLocation: (id: string, updates: Partial<SavedLocation>) => Promise<void>;
  deleteSavedLocation: (id: string) => Promise<void>;
  refreshSavedLocations: () => Promise<void>;
  
  // Location history methods
  addToHistory: (coordinates: Coordinates, address: string, searchQuery?: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  refreshHistory: () => Promise<void>;
  
  // Utility methods
  calculateDistance: (coord1: Coordinates, coord2: Coordinates) => number;
  formatDistance: (distance: number) => string;
  requestLocationPermission: () => Promise<PermissionStatus>;
}

export const useAdvancedLocation = (): UseAdvancedLocationReturn => {
  const user = useAuthStore((state) => state.user);
  
  const [state, setState] = useState<LocationState>({
    currentLocation: null,
    savedLocations: [],
    locationHistory: [],
    isLoading: false,
    error: null,
    permissionStatus: 'unknown'
  });

  // Check permission status on mount
  useEffect(() => {
    checkPermissionStatus();
  }, []);

  // Load saved locations and history when user changes
  useEffect(() => {
    if (user) {
      loadSavedLocations();
      loadLocationHistory();
    } else {
      setState(prev => ({
        ...prev,
        savedLocations: [],
        locationHistory: []
      }));
    }
  }, [user]);

  const checkPermissionStatus = useCallback(async () => {
    if ('permissions' in navigator) {
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        setState(prev => ({ ...prev, permissionStatus: permission.state }));
        
        permission.addEventListener('change', () => {
          setState(prev => ({ ...prev, permissionStatus: permission.state }));
        });
      } catch (error) {
        console.warn('Failed to check geolocation permission:', error);
      }
    }
  }, []);

  const requestLocationPermission = useCallback(async (): Promise<PermissionStatus> => {
    if ('permissions' in navigator) {
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        return permission;
      } catch (error) {
        console.warn('Failed to request location permission:', error);
      }
    }
    
    // Fallback: try to get location to trigger permission prompt
    try {
      await getCurrentLocation();
      return { state: 'granted' } as PermissionStatus;
    } catch (error) {
      return { state: 'denied' } as PermissionStatus;
    }
  }, []);

  const getCurrentLocation = useCallback(async (options?: PositionOptions): Promise<LocationInfo> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const location = await locationService.getCurrentLocation(options);
      setState(prev => ({ 
        ...prev, 
        currentLocation: location,
        permissionStatus: 'granted',
        isLoading: false 
      }));
      
      // Add to history
      if (user) {
        await locationService.addToLocationHistory(location.coordinates, location.address);
      }
      
      return location;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get location';
      setState(prev => ({ 
        ...prev, 
        error: errorMessage,
        permissionStatus: errorMessage.includes('denied') ? 'denied' : prev.permissionStatus,
        isLoading: false 
      }));
      throw error;
    }
  }, [user]);

  const refreshCurrentLocation = useCallback(async (): Promise<void> => {
    await getCurrentLocation({ maximumAge: 0 }); // Force fresh location
  }, [getCurrentLocation]);

  const geocodeAddress = useCallback(async (address: string): Promise<LocationInfo> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const location = await locationService.geocodeAddress(address);
      setState(prev => ({ ...prev, isLoading: false }));
      
      // Add to history
      if (user) {
        await locationService.addToLocationHistory(location.coordinates, location.address, address);
      }
      
      return location;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to geocode address';
      setState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
      throw error;
    }
  }, [user]);

  const reverseGeocode = useCallback(async (coordinates: Coordinates): Promise<LocationInfo> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const location = await locationService.reverseGeocode(coordinates);
      setState(prev => ({ ...prev, isLoading: false }));
      return location;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to reverse geocode';
      setState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
      throw error;
    }
  }, []);

  const searchPlaces = useCallback(async (query: string, location?: Coordinates): Promise<LocationSearchResult[]> => {
    if (!query.trim()) return [];
    
    try {
      return await locationService.searchPlaces(query, location);
    } catch (error) {
      console.warn('Place search failed:', error);
      return [];
    }
  }, []);

  const getAddressSuggestions = useCallback(async (input: string): Promise<string[]> => {
    if (input.length < 3) return [];
    
    try {
      return await locationService.getAddressSuggestions(
        input, 
        state.currentLocation?.coordinates
      );
    } catch (error) {
      console.warn('Address suggestions failed:', error);
      return [];
    }
  }, [state.currentLocation?.coordinates]);

  const loadSavedLocations = useCallback(async () => {
    if (!user) return;
    
    try {
      const locations = await locationService.getSavedLocations();
      setState(prev => ({ ...prev, savedLocations: locations }));
    } catch (error) {
      console.warn('Failed to load saved locations:', error);
    }
  }, [user]);

  const saveLocation = useCallback(async (
    location: Omit<SavedLocation, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ): Promise<SavedLocation> => {
    if (!user) throw new Error('User must be authenticated to save locations');
    
    try {
      const savedLocation = await locationService.saveLocation(location);
      setState(prev => ({ 
        ...prev, 
        savedLocations: [savedLocation, ...prev.savedLocations] 
      }));
      return savedLocation;
    } catch (error) {
      console.error('Failed to save location:', error);
      throw error;
    }
  }, [user]);

  const updateSavedLocation = useCallback(async (
    id: string, 
    updates: Partial<SavedLocation>
  ): Promise<void> => {
    try {
      const updatedLocation = await locationService.updateSavedLocation(id, updates);
      setState(prev => ({
        ...prev,
        savedLocations: prev.savedLocations.map(loc => 
          loc.id === id ? updatedLocation : loc
        )
      }));
    } catch (error) {
      console.error('Failed to update location:', error);
      throw error;
    }
  }, []);

  const deleteSavedLocation = useCallback(async (id: string): Promise<void> => {
    try {
      await locationService.deleteSavedLocation(id);
      setState(prev => ({
        ...prev,
        savedLocations: prev.savedLocations.filter(loc => loc.id !== id)
      }));
    } catch (error) {
      console.error('Failed to delete location:', error);
      throw error;
    }
  }, []);

  const refreshSavedLocations = useCallback(async (): Promise<void> => {
    await loadSavedLocations();
  }, [loadSavedLocations]);

  const loadLocationHistory = useCallback(async () => {
    if (!user) return;
    
    try {
      const history = await locationService.getLocationHistory();
      setState(prev => ({ ...prev, locationHistory: history }));
    } catch (error) {
      console.warn('Failed to load location history:', error);
    }
  }, [user]);

  const addToHistory = useCallback(async (
    coordinates: Coordinates, 
    address: string, 
    searchQuery?: string
  ): Promise<void> => {
    if (!user) return;
    
    try {
      await locationService.addToLocationHistory(coordinates, address, searchQuery);
      await loadLocationHistory(); // Refresh history
    } catch (error) {
      console.warn('Failed to add to location history:', error);
    }
  }, [user, loadLocationHistory]);

  const clearHistory = useCallback(async (): Promise<void> => {
    if (!user) return;
    
    try {
      await locationService.clearLocationHistory();
      setState(prev => ({ ...prev, locationHistory: [] }));
    } catch (error) {
      console.error('Failed to clear location history:', error);
      throw error;
    }
  }, [user]);

  const refreshHistory = useCallback(async (): Promise<void> => {
    await loadLocationHistory();
  }, [loadLocationHistory]);

  const calculateDistance = useCallback((coord1: Coordinates, coord2: Coordinates): number => {
    return locationService.calculateDistance(coord1, coord2);
  }, []);

  const formatDistance = useCallback((distance: number): string => {
    return locationService.formatDistance(distance);
  }, []);

  return {
    ...state,
    getCurrentLocation,
    refreshCurrentLocation,
    geocodeAddress,
    reverseGeocode,
    searchPlaces,
    getAddressSuggestions,
    saveLocation,
    updateSavedLocation,
    deleteSavedLocation,
    refreshSavedLocations,
    addToHistory,
    clearHistory,
    refreshHistory,
    calculateDistance,
    formatDistance,
    requestLocationPermission
  };
};

// Specialized hook for just current location (lightweight)
export const useCurrentLocation = () => {
  const [location, setLocation] = useState<LocationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCurrentLocation = useCallback(async (options?: PositionOptions): Promise<LocationInfo> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const loc = await locationService.getCurrentLocation(options);
      setLocation(loc);
      return loc;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get location';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { location, isLoading, error, getCurrentLocation };
};

// Hook for geocoding addresses
export const useGeocoding = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const geocodeAddress = useCallback(async (address: string): Promise<LocationInfo> => {
    setIsLoading(true);
    setError(null);
    
    try {
      return await locationService.geocodeAddress(address);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to geocode address';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reverseGeocode = useCallback(async (coordinates: Coordinates): Promise<LocationInfo> => {
    setIsLoading(true);
    setError(null);
    
    try {
      return await locationService.reverseGeocode(coordinates);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reverse geocode';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isLoading, error, geocodeAddress, reverseGeocode };
};

export default useAdvancedLocation;