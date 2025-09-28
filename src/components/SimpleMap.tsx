// SimpleMap.tsx
// Simple map component for displaying locations with markers and basic interaction

import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Locate, ZoomIn, ZoomOut, Maximize, Navigation } from 'lucide-react';
import { Coordinates, SavedLocation } from '../services/locationService';

interface MapMarker {
  id: string;
  coordinates: Coordinates;
  title: string;
  description?: string;
  type: 'current' | 'saved' | 'search' | 'business';
  color?: 'red' | 'blue' | 'green' | 'orange' | 'purple';
}

interface SimpleMapProps {
  center?: Coordinates;
  zoom?: number;
  markers?: MapMarker[];
  onMarkerClick?: (marker: MapMarker) => void;
  onMapClick?: (coordinates: Coordinates) => void;
  className?: string;
  height?: string;
  showControls?: boolean;
  interactive?: boolean;
}

const SimpleMap: React.FC<SimpleMapProps> = ({
  center = { lat: 40.7128, lng: -74.0060 }, // Default to NYC
  zoom = 13,
  markers = [],
  onMarkerClick,
  onMapClick,
  className = '',
  height = '400px',
  showControls = true,
  interactive = true
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [currentZoom, setCurrentZoom] = useState(zoom);
  const [mapCenter, setMapCenter] = useState(center);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);

  // Convert coordinates to pixel position
  const coordinatesToPixels = (coords: Coordinates, mapBounds: { width: number; height: number }) => {
    // Simple mercator projection approximation
    const latRad = coords.lat * (Math.PI / 180);
    const mercN = Math.log(Math.tan((Math.PI / 4) + (latRad / 2)));
    
    const x = ((coords.lng + 180) / 360) * mapBounds.width;
    const y = ((1 - (mercN / Math.PI)) / 2) * mapBounds.height;
    
    return { x, y };
  };

  // Convert pixel position to coordinates
  const pixelsToCoordinates = (pixels: { x: number; y: number }, mapBounds: { width: number; height: number }): Coordinates => {
    const lng = ((pixels.x / mapBounds.width) * 360) - 180;
    const mercN = ((1 - (pixels.y / mapBounds.height)) * 2 - 1) * Math.PI;
    const lat = (2 * Math.atan(Math.exp(mercN)) - (Math.PI / 2)) * (180 / Math.PI);
    
    return { lat, lng };
  };

  // Get marker color
  const getMarkerColor = (type: MapMarker['type'], customColor?: string) => {
    if (customColor) {
      const colors = {
        red: 'bg-red-500 border-red-600',
        blue: 'bg-blue-500 border-blue-600',
        green: 'bg-green-500 border-green-600',
        orange: 'bg-orange-500 border-orange-600',
        purple: 'bg-purple-500 border-purple-600'
      };
      return colors[customColor as keyof typeof colors];
    }

    switch (type) {
      case 'current':
        return 'bg-blue-500 border-blue-600';
      case 'saved':
        return 'bg-green-500 border-green-600';
      case 'search':
        return 'bg-orange-500 border-orange-600';
      case 'business':
        return 'bg-purple-500 border-purple-600';
      default:
        return 'bg-gray-500 border-gray-600';
    }
  };

  // Handle mouse events for dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!interactive) return;
    
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !interactive) return;
    
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    
    // Update map center based on drag
    const mapBounds = mapRef.current?.getBoundingClientRect();
    if (mapBounds) {
      const deltaLng = (deltaX / mapBounds.width) * (360 / Math.pow(2, currentZoom));
      const deltaLat = (deltaY / mapBounds.height) * (180 / Math.pow(2, currentZoom));
      
      setMapCenter(prev => ({
        lat: prev.lat + deltaLat,
        lng: prev.lng - deltaLng
      }));
    }
    
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Handle map click
  const handleMapClick = (e: React.MouseEvent) => {
    if (!onMapClick || !interactive || isDragging) return;
    
    const rect = mapRef.current?.getBoundingClientRect();
    if (rect) {
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const coords = pixelsToCoordinates({ x, y }, { width: rect.width, height: rect.height });
      onMapClick(coords);
    }
  };

  // Zoom controls
  const zoomIn = () => {
    if (currentZoom < 18) {
      setCurrentZoom(prev => prev + 1);
    }
  };

  const zoomOut = () => {
    if (currentZoom > 1) {
      setCurrentZoom(prev => prev - 1);
    }
  };

  // Center map on coordinates
  const centerMap = (coords: Coordinates) => {
    setMapCenter(coords);
  };

  // Handle wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    if (!interactive) return;
    
    e.preventDefault();
    if (e.deltaY < 0 && currentZoom < 18) {
      setCurrentZoom(prev => prev + 1);
    } else if (e.deltaY > 0 && currentZoom > 1) {
      setCurrentZoom(prev => prev - 1);
    }
  };

  return (
    <div className={`relative overflow-hidden bg-gray-200 rounded-lg ${className}`} style={{ height }}>
      {/* Map background - using a simple grid pattern */}
      <div
        ref={mapRef}
        className="absolute inset-0 cursor-move"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          backgroundPosition: `${-mapCenter.lng * 10}px ${mapCenter.lat * 10}px`
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleMapClick}
        onWheel={handleWheel}
      >
        {/* Markers */}
        {markers.map((marker) => {
          const mapBounds = mapRef.current?.getBoundingClientRect();
          if (!mapBounds) return null;
          
          const position = coordinatesToPixels(marker.coordinates, {
            width: mapBounds.width,
            height: mapBounds.height
          });
          
          return (
            <div
              key={marker.id}
              className={`absolute transform -translate-x-1/2 -translate-y-full cursor-pointer z-10 ${
                selectedMarker?.id === marker.id ? 'scale-110' : 'hover:scale-105'
              } transition-transform`}
              style={{
                left: `${position.x}px`,
                top: `${position.y}px`
              }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedMarker(marker);
                if (onMarkerClick) {
                  onMarkerClick(marker);
                }
              }}
            >
              {/* Marker pin */}
              <div className={`w-6 h-6 rounded-full border-2 ${getMarkerColor(marker.type, marker.color)} shadow-lg`}>
                <MapPin className="w-4 h-4 text-white m-0.5" />
              </div>
              
              {/* Marker tooltip */}
              {selectedMarker?.id === marker.id && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-white rounded-lg shadow-lg border whitespace-nowrap z-20">
                  <div className="text-sm font-medium text-gray-900">{marker.title}</div>
                  {marker.description && (
                    <div className="text-xs text-gray-600 mt-1">{marker.description}</div>
                  )}
                  {/* Arrow */}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white"></div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Map Controls */}
      {showControls && (
        <>
          {/* Zoom Controls */}
          <div className="absolute top-4 right-4 flex flex-col space-y-2 z-20">
            <button
              onClick={zoomIn}
              disabled={currentZoom >= 18}
              className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={zoomOut}
              disabled={currentZoom <= 1}
              className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          {/* Zoom Level Display */}
          <div className="absolute bottom-4 right-4 px-3 py-1 bg-white rounded-lg shadow-md text-sm text-gray-600 z-20">
            Zoom: {currentZoom}
          </div>
        </>
      )}

      {/* Attribution */}
      <div className="absolute bottom-2 left-2 text-xs text-gray-500 bg-white px-2 py-1 rounded">
        Simple Map View
      </div>
    </div>
  );
};

// Location selector component that includes the map
interface LocationSelectorProps {
  onLocationSelect: (coordinates: Coordinates) => void;
  currentLocation?: Coordinates;
  savedLocations?: SavedLocation[];
  searchResults?: Array<{ coordinates: Coordinates; name: string; address: string }>;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  onLocationSelect,
  currentLocation,
  savedLocations = [],
  searchResults = []
}) => {
  const [selectedCoords, setSelectedCoords] = useState<Coordinates | null>(null);

  // Create markers array
  const markers: MapMarker[] = [
    // Current location marker
    ...(currentLocation ? [{
      id: 'current',
      coordinates: currentLocation,
      title: 'Current Location',
      type: 'current' as const,
      color: 'blue' as const
    }] : []),
    
    // Saved location markers
    ...savedLocations.map(location => ({
      id: `saved-${location.id}`,
      coordinates: location.coordinates,
      title: location.name,
      description: location.address,
      type: 'saved' as const,
      color: location.type === 'home' ? 'green' : location.type === 'work' ? 'blue' : 'orange'
    } as MapMarker)),
    
    // Search result markers
    ...searchResults.map((result, index) => ({
      id: `search-${index}`,
      coordinates: result.coordinates,
      title: result.name,
      description: result.address,
      type: 'search' as const,
      color: 'purple' as const
    })),
    
    // Selected location marker
    ...(selectedCoords ? [{
      id: 'selected',
      coordinates: selectedCoords,
      title: 'Selected Location',
      type: 'current' as const,
      color: 'red' as const
    }] : [])
  ];

  const handleMapClick = (coordinates: Coordinates) => {
    setSelectedCoords(coordinates);
  };

  const handleConfirmSelection = () => {
    if (selectedCoords) {
      onLocationSelect(selectedCoords);
    }
  };

  return (
    <div className="space-y-4">
      <SimpleMap
        center={currentLocation || { lat: 40.7128, lng: -74.0060 }}
        markers={markers}
        onMapClick={handleMapClick}
        onMarkerClick={(marker) => {
          setSelectedCoords(marker.coordinates);
        }}
        height="300px"
        className="border border-gray-300"
      />
      
      {selectedCoords && (
        <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-sm">
            <span className="font-medium text-blue-900">Selected: </span>
            <span className="text-blue-700">
              {selectedCoords.lat.toFixed(6)}, {selectedCoords.lng.toFixed(6)}
            </span>
          </div>
          <button
            onClick={handleConfirmSelection}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Use This Location
          </button>
        </div>
      )}
      
      <div className="text-xs text-gray-500">
        Click on the map to select a location, or click on existing markers to use saved locations.
      </div>
    </div>
  );
};

export default SimpleMap;