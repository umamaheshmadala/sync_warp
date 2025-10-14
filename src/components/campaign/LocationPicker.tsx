/**
 * LocationPicker Component
 * Google Maps integration for selecting campaign target location and radius
 * Features:
 * - Interactive map centered on business location
 * - Draggable marker for target center
 * - Radius circle visualization
 * - Radius slider (0.5km - 20km, default 3km)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleMap, useLoadScript } from '@react-google-maps/api';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Label } from '../ui/label';
import { Slider } from '../ui/slider';
import { Input } from '../ui/input';
import { MapPin, Navigation } from 'lucide-react';
import { Button } from '../ui/button';

// ============================================================================
// TYPES
// ============================================================================

export interface LocationPickerProps {
  /** Business location (default center) */
  businessLocation?: {
    lat: number;
    lng: number;
    address?: string;
  };
  /** Current target center */
  center?: {
    lat: number;
    lng: number;
  };
  /** Current radius in km */
  radiusKm?: number;
  /** Callback when location/radius changes */
  onChange?: (location: { lat: number; lng: number; radiusKm: number }) => void;
  /** Google Maps API key */
  apiKey: string;
  /** Read-only mode */
  readOnly?: boolean;
  /** Custom class name */
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_RADIUS = 3; // 3km default
const MIN_RADIUS = 0.5;   // 0.5km minimum
const MAX_RADIUS = 20;    // 20km maximum

const MAP_CONTAINER_STYLE = {
  width: '100%',
  height: '450px',
  borderRadius: '8px'
};

const GOOGLE_MAPS_LIBRARIES: ('places')[] = ['places'];

const MAP_OPTIONS: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
  mapTypeId: 'roadmap',
};

// ============================================================================
// COMPONENT
// ============================================================================

export function LocationPicker({
  businessLocation,
  center,
  radiusKm = DEFAULT_RADIUS,
  onChange,
  apiKey,
  readOnly = false,
  className = '',
}: LocationPickerProps) {
  // Load Google Maps script
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  // Use business location as default, or fallback to a default location
  const defaultCenter = businessLocation || center || {
    lat: 16.5062, // Vijayawada, Andhra Pradesh (example)
    lng: 80.6480
  };

  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [markerPosition, setMarkerPosition] = useState(center || defaultCenter);
  const [radius, setRadius] = useState(radiusKm);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);

  // Create native marker and circle when map loads
  useEffect(() => {
    if (!map) return;

    // Clean up existing marker and circle
    if (markerRef.current) {
      markerRef.current.setMap(null);
    }
    if (circleRef.current) {
      circleRef.current.setMap(null);
    }

    // Create native circle
    const circle = new google.maps.Circle({
      map: map,
      center: markerPosition,
      radius: radius * 1000,
      fillColor: '#3B82F6',
      fillOpacity: 0.25,
      strokeColor: '#1E40AF',
      strokeOpacity: 0.8,
      strokeWeight: 3,
      clickable: false,
      editable: false,
    });
    circleRef.current = circle;

    // Create native marker
    const marker = new google.maps.Marker({
      map: map,
      position: markerPosition,
      draggable: !readOnly,
      title: 'Target Center - Drag to reposition',
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: '#EF4444',
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: 3,
        scale: 12,
      },
    });
    markerRef.current = marker;

    // Add drag listener to marker
    if (!readOnly) {
      marker.addListener('dragend', () => {
        const pos = marker.getPosition();
        if (pos) {
          const newPosition = {
            lat: pos.lat(),
            lng: pos.lng()
          };
          setMarkerPosition(newPosition);
          onChange?.({ ...newPosition, radiusKm: radius });
        }
      });
    }

    // Add click listener to map
    const clickListener = map.addListener('click', (event: google.maps.MapMouseEvent) => {
      if (event.latLng && !readOnly) {
        const newPosition = {
          lat: event.latLng.lat(),
          lng: event.latLng.lng()
        };
        setMarkerPosition(newPosition);
        onChange?.({ ...newPosition, radiusKm: radius });
      }
    });

    // Cleanup
    return () => {
      if (markerRef.current) {
        markerRef.current.setMap(null);
      }
      if (circleRef.current) {
        circleRef.current.setMap(null);
      }
      google.maps.event.removeListener(clickListener);
    };
  }, [map, readOnly]);

  // Update marker and circle position when markerPosition changes
  useEffect(() => {
    if (markerRef.current && circleRef.current) {
      markerRef.current.setPosition(markerPosition);
      circleRef.current.setCenter(markerPosition);
      if (map) {
        map.panTo(markerPosition);
      }
    }
  }, [markerPosition, map]);

  // Update circle radius when radius changes
  useEffect(() => {
    if (circleRef.current) {
      circleRef.current.setRadius(radius * 1000);
    }
  }, [radius]);

  // Fit bounds to show circle
  useEffect(() => {
    if (map && markerPosition) {
      try {
        const bounds = new google.maps.LatLngBounds();
        const radiusInDegrees = radius / 111;
        
        bounds.extend({
          lat: markerPosition.lat + radiusInDegrees,
          lng: markerPosition.lng + radiusInDegrees
        });
        bounds.extend({
          lat: markerPosition.lat - radiusInDegrees,
          lng: markerPosition.lng - radiusInDegrees
        });
        
        map.fitBounds(bounds);
      } catch (error) {
        console.error('Error fitting map bounds:', error);
      }
    }
  }, [map, markerPosition, radius]);

  // Only update from props on initial mount or when explicitly changed
  // Don't auto-sync on every center change to prevent feedback loops
  const isInitialMount = useRef(true);
  
  useEffect(() => {
    if (isInitialMount.current && center) {
      setMarkerPosition(center);
      setMapCenter(center);
      isInitialMount.current = false;
    }
  }, [center]);

  useEffect(() => {
    if (isInitialMount.current) {
      setRadius(radiusKm);
    }
  }, [radiusKm]);


  // Handle radius change
  const handleRadiusChange = useCallback((value: number[]) => {
    const newRadius = value[0];
    setRadius(newRadius);
    onChange?.({ ...markerPosition, radiusKm: newRadius });
  }, [markerPosition, onChange]);

  // Reset to business location
  const handleResetLocation = useCallback(() => {
    if (businessLocation && map) {
      setMarkerPosition(businessLocation);
      setMapCenter(businessLocation);
      
      // Force map to center and zoom appropriately
      map.setCenter(businessLocation);
      
      // Calculate bounds to show full circle
      const radiusInDegrees = radius / 111;
      const bounds = new google.maps.LatLngBounds();
      bounds.extend({
        lat: businessLocation.lat + radiusInDegrees,
        lng: businessLocation.lng + radiusInDegrees
      });
      bounds.extend({
        lat: businessLocation.lat - radiusInDegrees,
        lng: businessLocation.lng - radiusInDegrees
      });
      map.fitBounds(bounds);
      
      onChange?.({ ...businessLocation, radiusKm: radius });
    }
  }, [businessLocation, radius, map, onChange]);

  // Calculate area in sq km
  const calculateArea = (radiusKm: number): string => {
    const area = Math.PI * radiusKm * radiusKm;
    return area.toFixed(2);
  };

  // Handle loading and error states
  if (loadError) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <MapPin className="w-5 h-5" />
            Error Loading Maps
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Failed to load Google Maps. Please check your API key and internet connection.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!isLoaded) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Target Location & Radius
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[450px] bg-muted rounded-lg">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-sm text-muted-foreground">Loading Google Maps...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Target Location & Radius
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {businessLocation?.address || 'Select target area for your campaign'}
            </p>
          </div>
          {businessLocation && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetLocation}
              disabled={readOnly}
            >
              <Navigation className="w-4 h-4 mr-2" />
              Reset to Business
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Map */}
        <div className="relative border-2 border-gray-300 rounded-lg overflow-hidden">
          <GoogleMap
            mapContainerStyle={MAP_CONTAINER_STYLE}
            center={mapCenter}
            zoom={12}
            options={MAP_OPTIONS}
            onLoad={setMap}
          >
            {/* Marker and Circle are created using native Google Maps API in useEffect */}
          </GoogleMap>
        </div>

        {/* Radius Controls */}
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Radius (km)</Label>
              <Input
                type="number"
                min={MIN_RADIUS}
                max={MAX_RADIUS}
                step={0.5}
                value={radius}
                onChange={(e) => handleRadiusChange([parseFloat(e.target.value) || DEFAULT_RADIUS])}
                disabled={readOnly}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Coverage Area</Label>
              <div className="mt-1 p-2 bg-muted rounded-md text-sm font-medium">
                {calculateArea(radius)} km²
              </div>
            </div>
          </div>

          {/* Radius Slider */}
          <div className="space-y-3 py-4 px-2 bg-gray-50 border border-gray-200 rounded-lg">
            <Label className="text-sm font-semibold text-gray-900">Adjust Radius</Label>
            <div className="px-3 py-2">
              <Slider
                value={[radius]}
                min={MIN_RADIUS}
                max={MAX_RADIUS}
                step={0.5}
                onValueChange={handleRadiusChange}
                disabled={readOnly}
                className="w-full cursor-pointer"
                style={{ height: '8px' }}
              />
            </div>
            <div className="flex justify-between text-sm font-semibold text-gray-700 px-2">
              <span className="bg-white border border-gray-300 px-3 py-1.5 rounded-md shadow-sm">{MIN_RADIUS} km</span>
              <span className="text-lg font-bold text-primary">{radius} km</span>
              <span className="bg-white border border-gray-300 px-3 py-1.5 rounded-md shadow-sm">{MAX_RADIUS} km</span>
            </div>
          </div>

          {/* Location Info */}
          <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg text-sm">
            <div>
              <span className="text-muted-foreground">Latitude:</span>
              <div className="font-mono font-medium">{markerPosition.lat.toFixed(6)}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Longitude:</span>
              <div className="font-mono font-medium">{markerPosition.lng.toFixed(6)}</div>
            </div>
          </div>

          {/* Helper Text */}
          <div className="text-xs text-muted-foreground bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="font-medium text-blue-900 mb-1">📍 How to use:</p>
            <ul className="space-y-1 text-blue-700">
              <li>• <strong>Click anywhere on the map</strong> to place a new marker</li>
              <li>• <strong>Drag the red marker</strong> to reposition target center</li>
              <li>• Adjust radius using slider or input field</li>
              <li>• Blue circle shows the campaign coverage area</li>
              <li>• Default: Your business location with 3km radius</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default LocationPicker;
