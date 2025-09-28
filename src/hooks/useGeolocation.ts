// src/hooks/useGeolocation.ts
// Custom hook for handling device location access, permissions, and GPS coordinates

import { useState, useEffect, useCallback } from 'react';

export interface LocationCoords {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface LocationError {
  code: number;
  message: string;
}

export interface GeolocationState {
  coords: LocationCoords | null;
  error: LocationError | null;
  loading: boolean;
  supported: boolean;
  permission: PermissionState | null;
}

export interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  watch?: boolean; // Whether to watch position changes
  requestOnMount?: boolean; // Auto-request location on hook mount
}

const DEFAULT_OPTIONS: UseGeolocationOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 300000, // 5 minutes
  watch: false,
  requestOnMount: false,
};

export function useGeolocation(options: UseGeolocationOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  const [state, setState] = useState<GeolocationState>({
    coords: null,
    error: null,
    loading: false,
    supported: 'geolocation' in navigator,
    permission: null,
  });
  
  const [watchId, setWatchId] = useState<number | null>(null);

  // Check for stored location in sessionStorage (for current session)
  useEffect(() => {
    const stored = sessionStorage.getItem('userLocation');
    if (stored) {
      try {
        const coords = JSON.parse(stored) as LocationCoords;
        setState(prev => ({ ...prev, coords }));
      } catch {
        // Invalid stored location, ignore
      }
    }
  }, []);

  // Check permission status
  useEffect(() => {
    if (!state.supported) return;

    const checkPermission = async () => {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        setState(prev => ({ ...prev, permission: result.state }));
        
        // Listen for permission changes
        result.addEventListener('change', () => {
          setState(prev => ({ ...prev, permission: result.state }));
        });
      } catch {
        // Permissions API not supported, that's ok
      }
    };

    checkPermission();
  }, [state.supported]);

  // Create location success handler
  const handleSuccess = useCallback((position: GeolocationPosition) => {
    const coords: LocationCoords = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
    };

    setState(prev => ({
      ...prev,
      coords,
      error: null,
      loading: false,
    }));

    // Store location for session
    sessionStorage.setItem('userLocation', JSON.stringify(coords));
  }, []);

  // Create location error handler
  const handleError = useCallback((error: GeolocationPositionError) => {
    let message: string;
    
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
      default:
        message = 'An unknown location error occurred';
    }

    setState(prev => ({
      ...prev,
      error: { code: error.code, message },
      loading: false,
    }));
  }, []);

  // Get current position
  const getCurrentPosition = useCallback(async (): Promise<LocationCoords | null> => {
    if (!state.supported) {
      setState(prev => ({
        ...prev,
        error: { code: 0, message: 'Geolocation is not supported by this browser' },
      }));
      return null;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          handleSuccess(position);
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          handleError(error);
          resolve(null);
        },
        {
          enableHighAccuracy: opts.enableHighAccuracy,
          timeout: opts.timeout,
          maximumAge: opts.maximumAge,
        }
      );
    });
  }, [state.supported, opts.enableHighAccuracy, opts.timeout, opts.maximumAge, handleSuccess, handleError]);

  // Start watching position
  const startWatching = useCallback(() => {
    if (!state.supported || watchId !== null) return;

    const id = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      {
        enableHighAccuracy: opts.enableHighAccuracy,
        timeout: opts.timeout,
        maximumAge: opts.maximumAge,
      }
    );

    setWatchId(id);
  }, [state.supported, watchId, opts.enableHighAccuracy, opts.timeout, opts.maximumAge, handleSuccess, handleError]);

  // Stop watching position
  const stopWatching = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
  }, [watchId]);

  // Clear stored location and state
  const clearLocation = useCallback(() => {
    sessionStorage.removeItem('userLocation');
    setState(prev => ({
      ...prev,
      coords: null,
      error: null,
    }));
  }, []);

  // Auto-request on mount if enabled
  useEffect(() => {
    if (opts.requestOnMount && state.supported && !state.coords && !state.loading) {
      getCurrentPosition();
    }
  }, [opts.requestOnMount, state.supported, state.coords, state.loading, getCurrentPosition]);

  // Start/stop watching based on options
  useEffect(() => {
    if (opts.watch && state.supported) {
      startWatching();
    } else if (!opts.watch) {
      stopWatching();
    }

    return () => {
      stopWatching();
    };
  }, [opts.watch, state.supported, startWatching, stopWatching]);

  return {
    ...state,
    getCurrentPosition,
    startWatching,
    stopWatching,
    clearLocation,
    isWatching: watchId !== null,
  };
}