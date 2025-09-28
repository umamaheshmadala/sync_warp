import React, { useState, useCallback, useEffect } from 'react';
import { GoogleMap, LoadScript, Marker, Autocomplete } from '@react-google-maps/api';
import { Search, MapPin, Crosshair } from 'lucide-react';
import { toast } from 'react-hot-toast';

const libraries: ("places")[] = ['places'];

interface Location {
  lat: number;
  lng: number;
}

interface GoogleMapsLocationPickerProps {
  apiKey: string;
  initialLocation?: Location;
  onLocationChange: (location: Location, address?: string) => void;
  className?: string;
  height?: string | number;
  showSearch?: boolean;
  showCurrentLocationBtn?: boolean;
}

const mapContainerStyle = {
  width: '100%',
  height: '100%'
};

const defaultCenter = {
  lat: 37.7749, // San Francisco
  lng: -122.4194
};

const GoogleMapsLocationPicker: React.FC<GoogleMapsLocationPickerProps> = ({
  apiKey,
  initialLocation,
  onLocationChange,
  className = '',
  height = '400px',
  showSearch = true,
  showCurrentLocationBtn = true
}) => {
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Error boundary effect
  useEffect(() => {
    const handleError = (error: any) => {
      console.error('Google Maps Error:', error);
      setHasError(true);
      setErrorMessage('Failed to load Google Maps. Please check your API key and internet connection.');
    };
    
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);
  
  // Validate API key
  if (!apiKey) {
    return (
      <div className={`relative ${className}`} style={{ height }}>
        <div className="flex items-center justify-center h-full bg-gray-100 rounded-lg">
          <div className="text-center">
            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Google Maps API Key Required</h3>
            <p className="text-gray-600">Please add your Google Maps API key to enable location selection.</p>
          </div>
        </div>
      </div>
    );
  }
  
  // Show error state if there was an error
  if (hasError) {
    return (
      <div className={`relative ${className}`} style={{ height }}>
        <div className="flex items-center justify-center h-full bg-red-50 rounded-lg border border-red-200">
          <div className="text-center">
            <div className="text-red-500 mb-4">
              <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.502 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-red-900 mb-2">Maps Loading Error</h3>
            <p className="text-red-700 mb-4">{errorMessage}</p>
            <button
              onClick={() => {
                setHasError(false);
                setErrorMessage('');
                window.location.reload();
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [center, setCenter] = useState<Location>(initialLocation || defaultCenter);
  const [markerPosition, setMarkerPosition] = useState<Location | null>(initialLocation || null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  // Update marker when initial location changes
  useEffect(() => {
    if (initialLocation) {
      setCenter(initialLocation);
      setMarkerPosition(initialLocation);
    }
  }, [initialLocation]);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const onAutocompleteLoad = (autocomplete: google.maps.places.Autocomplete) => {
    setAutocomplete(autocomplete);
  };

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      
      if (place.geometry && place.geometry.location) {
        const location = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        };
        
        setCenter(location);
        setMarkerPosition(location);
        onLocationChange(location, place.formatted_address);
        
        if (map) {
          map.panTo(location);
          map.setZoom(17);
        }
      }
    }
  };

  const onMapClick = useCallback((event: google.maps.MapMouseEvent) => {
    if (event.latLng) {
      const location = {
        lat: event.latLng.lat(),
        lng: event.latLng.lng()
      };
      
      setMarkerPosition(location);
      onLocationChange(location);
      
      // Reverse geocode to get address
      if (map) {
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            onLocationChange(location, results[0].formatted_address);
          }
        });
      }
    }
  }, [map, onLocationChange]);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser');
      return;
    }

    setIsLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        
        setCenter(location);
        setMarkerPosition(location);
        onLocationChange(location);
        
        if (map) {
          map.panTo(location);
          map.setZoom(17);
        }

        // Reverse geocode to get address
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            onLocationChange(location, results[0].formatted_address);
          }
        });
        
        setIsLoading(false);
        toast.success('Location updated!');
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast.error('Failed to get current location');
        setIsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  const mapOptions = {
    disableDefaultUI: false,
    zoomControl: true,
    streetViewControl: true,
    mapTypeControl: true,
    fullscreenControl: true,
    clickableIcons: true,
    gestureHandling: 'cooperative'
  };

  return (
    <div className={`relative ${className}`} style={{ height }}>
      <LoadScript
        googleMapsApiKey={apiKey}
        libraries={libraries}
        loadingElement={
          <div className="flex items-center justify-center h-full bg-gray-100 rounded-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <span className="ml-3 text-gray-600">Loading map...</span>
          </div>
        }
      >
        {showSearch && (
          <div className="absolute top-4 left-4 right-4 z-10">
            <div className="relative">
              <Autocomplete
                onLoad={onAutocompleteLoad}
                onPlaceChanged={onPlaceChanged}
              >
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search for a location..."
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </Autocomplete>
            </div>
          </div>
        )}

        {showCurrentLocationBtn && (
          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={getCurrentLocation}
              disabled={isLoading}
              className="flex items-center px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Use current location"
            >
              <Crosshair className={`h-4 w-4 text-gray-600 ${isLoading ? 'animate-pulse' : ''}`} />
            </button>
          </div>
        )}

        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={center}
          zoom={markerPosition ? 17 : 10}
          onLoad={onLoad}
          onUnmount={onUnmount}
          onClick={onMapClick}
          options={mapOptions}
        >
          {markerPosition && (
            <Marker
              position={markerPosition}
              draggable
              onDragEnd={(event) => {
                if (event.latLng) {
                  const location = {
                    lat: event.latLng.lat(),
                    lng: event.latLng.lng()
                  };
                  setMarkerPosition(location);
                  onLocationChange(location);
                  
                  // Reverse geocode to get address
                  const geocoder = new google.maps.Geocoder();
                  geocoder.geocode({ location }, (results, status) => {
                    if (status === 'OK' && results && results[0]) {
                      onLocationChange(location, results[0].formatted_address);
                    }
                  });
                }
              }}
              icon={{
                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                  <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="16" cy="16" r="8" fill="#ef4444" stroke="#ffffff" stroke-width="2"/>
                    <circle cx="16" cy="16" r="3" fill="#ffffff"/>
                  </svg>
                `),
                scaledSize: typeof google !== 'undefined' ? new google.maps.Size(32, 32) : { width: 32, height: 32 },
                anchor: typeof google !== 'undefined' ? new google.maps.Point(16, 16) : { x: 16, y: 16 }
              }}
            />
          )}
        </GoogleMap>

        {/* Instructions */}
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <div className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg p-3">
            <div className="flex items-start space-x-2 text-sm text-gray-600">
              <MapPin className="h-4 w-4 text-indigo-600 mt-0.5 flex-shrink-0" />
              <div>
                <p><strong>Click</strong> on the map to place a marker</p>
                <p><strong>Drag</strong> the marker to fine-tune the location</p>
                {showSearch && <p><strong>Search</strong> for a specific address above</p>}
              </div>
            </div>
          </div>
        </div>
      </LoadScript>
    </div>
  );
};

export default GoogleMapsLocationPicker;