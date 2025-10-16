# Advanced Location System Documentation

## Overview

The Advanced Location System provides comprehensive location services for the SynC application, including geocoding, address resolution, saved locations management, location history tracking, and map visualization. The system is designed to work with or without external mapping APIs, providing fallbacks and graceful degradation.

## Architecture

### Core Components

1. **LocationService** (`src/services/locationService.ts`)
   - Core service for all location operations
   - Geocoding and reverse geocoding with fallbacks
   - Place search and address suggestions
   - Saved locations and history management

2. **useAdvancedLocation Hook** (`src/hooks/useAdvancedLocation.ts`)
   - Comprehensive location management hook
   - State management for current location, saved locations, and history
   - Permission handling and error management
   - Three specialized hooks for different use cases

3. **LocationManager Component** (`src/components/LocationManager.tsx`)
   - Full-featured location management dashboard
   - Tabbed interface for different location operations
   - Search, save, and organize locations
   - Integration with the location service

4. **SimpleMap Component** (`src/components/SimpleMap.tsx`)
   - Basic map visualization without external dependencies
   - Interactive markers and location selection
   - Simple projection and coordinate system
   - Responsive design with zoom and pan controls

### Data Flow

```
User Input → Location Service → Database/External APIs → React Components
```

## Features

### Current Location Detection
- **GPS-based Location**: High-accuracy position detection
- **Permission Management**: Handle location permissions gracefully
- **Address Resolution**: Convert coordinates to human-readable addresses
- **Error Handling**: Comprehensive error states and fallbacks

### Geocoding & Address Resolution
- **Forward Geocoding**: Convert addresses to coordinates
- **Reverse Geocoding**: Convert coordinates to addresses
- **Place Search**: Find places by name or type
- **Address Suggestions**: Autocomplete for address inputs
- **Fallback Services**: Use OpenStreetMap when primary services fail

### Saved Locations
- **Location Types**: Home, Work, Favorite, Recent
- **Custom Names**: User-defined location names
- **Distance Calculation**: Calculate distances between locations
- **Location Management**: Add, edit, delete saved locations
- **Quick Access**: Fast access to frequently used locations

### Location History
- **Automatic Tracking**: Track visited locations and searches
- **Search Context**: Remember what searches led to locations
- **History Management**: View and clear location history
- **Privacy Controls**: User-controlled history settings

### Map Integration
- **Simple Map View**: Basic interactive map without external dependencies
- **Multiple Markers**: Display various location types
- **Interactive Selection**: Click to select locations
- **Zoom & Pan**: Basic map navigation controls

## Implementation Guide

### 1. Database Setup

Run the location features migration:

```sql
-- Run the migration file
\i database/migrations/009_location_features.sql
```

This creates:
- `saved_locations` table for user's saved places
- `location_history` table for tracking location access
- Views and functions for location operations
- RLS policies for data security

### 2. Service Integration

The location service can be used directly or through hooks:

```typescript
// Direct service usage
import locationService from '../services/locationService';

const location = await locationService.getCurrentLocation();
const geocoded = await locationService.geocodeAddress('123 Main St');
```

### 3. Hook Usage

Three hooks available for different needs:

```typescript
// Full location management
import useAdvancedLocation from '../hooks/useAdvancedLocation';

const {
  currentLocation,
  savedLocations,
  locationHistory,
  getCurrentLocation,
  saveLocation,
  geocodeAddress
} = useAdvancedLocation();

// Lightweight current location only
import { useCurrentLocation } from '../hooks/useAdvancedLocation';

const { location, isLoading, error, getCurrentLocation } = useCurrentLocation();

// Geocoding only
import { useGeocoding } from '../hooks/useAdvancedLocation';

const { geocodeAddress, reverseGeocode, isLoading, error } = useGeocoding();
```

### 4. Component Integration

Use the LocationManager component for full functionality:

```tsx
import LocationManager from '../components/LocationManager';

// As a standalone page
<LocationManager />

// As a modal
<LocationManager 
  showAsModal={true}
  onClose={() => setShowModal(false)}
  onLocationSelect={(coords, address) => {
    console.log('Selected:', coords, address);
    setShowModal(false);
  }}
/>
```

Use the SimpleMap for basic map display:

```tsx
import SimpleMap from '../components/SimpleMap';

<SimpleMap
  center={{ lat: 40.7128, lng: -74.0060 }}
  markers={markers}
  onMarkerClick={handleMarkerClick}
  height="400px"
/>
```

## API Reference

### LocationService Methods

#### Current Location
```typescript
getCurrentLocation(options?: PositionOptions): Promise<LocationInfo>
```
Get user's current location with address information.

#### Geocoding
```typescript
geocodeAddress(address: string): Promise<LocationInfo>
reverseGeocode(coordinates: Coordinates): Promise<LocationInfo>
```
Convert between addresses and coordinates.

#### Place Search
```typescript
searchPlaces(query: string, location?: Coordinates): Promise<LocationSearchResult[]>
getAddressSuggestions(input: string, location?: Coordinates): Promise<string[]>
```
Search for places and get address suggestions.

#### Saved Locations
```typescript
saveLocation(location: SavedLocationInput): Promise<SavedLocation>
getSavedLocations(type?: LocationType): Promise<SavedLocation[]>
updateSavedLocation(id: string, updates: Partial<SavedLocation>): Promise<SavedLocation>
deleteSavedLocation(id: string): Promise<void>
```
Manage user's saved locations.

#### Location History
```typescript
addToLocationHistory(coordinates: Coordinates, address: string, searchQuery?: string): Promise<void>
getLocationHistory(limit?: number): Promise<LocationHistory[]>
clearLocationHistory(): Promise<void>
```
Track and manage location history.

#### Utilities
```typescript
calculateDistance(coord1: Coordinates, coord2: Coordinates): number
formatDistance(distance: number): string
```
Distance calculation and formatting utilities.

### Data Types

```typescript
interface Coordinates {
  lat: number;
  lng: number;
}

interface LocationInfo {
  coordinates: Coordinates;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode?: string;
  placeId?: string;
  formattedAddress?: string;
}

interface SavedLocation {
  id: string;
  user_id: string;
  name: string;
  address: string;
  coordinates: Coordinates;
  type: 'home' | 'work' | 'favorite' | 'recent';
  created_at: string;
  updated_at: string;
}
```

## Database Schema

### Main Tables

```sql
-- Saved locations table
CREATE TABLE saved_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    coordinates POINT NOT NULL,
    type TEXT CHECK (type IN ('home', 'work', 'favorite', 'recent')) NOT NULL DEFAULT 'favorite',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Location history table
CREATE TABLE location_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    coordinates POINT NOT NULL,
    address TEXT NOT NULL,
    search_query TEXT,
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Key Functions

- `calculate_distance(coord1, coord2)`: Calculate distance between coordinates
- `get_locations_within_radius(location, radius, user_id)`: Find nearby locations
- `cleanup_location_history()`: Clean old history entries

## Configuration

### Geocoding Services

The system uses a fallback approach:
1. **Primary**: Browser Geocoding API (if available)
2. **Fallback**: OpenStreetMap Nominatim (no API key required)
3. **Future**: Google Maps API, Mapbox API (configurable)

### Privacy & Security

- **Row Level Security**: Users only see their own data
- **Permission-based**: Location access requires user consent
- **Data Retention**: Automatic cleanup of old history entries
- **Anonymization**: Support for anonymous location operations

### Performance Optimization

- **Caching**: Geocoding results cached in memory
- **Debouncing**: Address suggestions debounced for performance
- **Indexing**: Spatial indexes for coordinate-based queries
- **Lazy Loading**: Components loaded on demand

## Error Handling

### Location Permission Errors
```typescript
// Permission denied
catch (error) {
  if (error.message.includes('denied')) {
    // Handle permission denial
    showPermissionDialog();
  }
}
```

### Network Errors
```typescript
// Geocoding failures
try {
  const location = await geocodeAddress(address);
} catch (error) {
  // Fall back to manual coordinate input
  showManualEntry();
}
```

### Data Validation
- Coordinate bounds validation
- Address format validation
- Location type validation
- User input sanitization

## Testing

### Unit Tests
```typescript
// Test coordinate validation
expect(isValidCoordinate({ lat: 90.1, lng: 0 })).toBe(false);
expect(isValidCoordinate({ lat: 45.5, lng: -122.6 })).toBe(true);

// Test distance calculation
const distance = calculateDistance(
  { lat: 40.7128, lng: -74.0060 }, // NYC
  { lat: 34.0522, lng: -118.2437 }  // LA
);
expect(distance).toBeCloseTo(3944.4, 1); // km
```

### Integration Tests
- Location permission handling
- Geocoding API fallbacks
- Database operations
- Component interactions

## Accessibility

- **Keyboard Navigation**: Full keyboard support for map controls
- **Screen Reader**: Proper ARIA labels and announcements
- **High Contrast**: Support for high contrast mode
- **Reduced Motion**: Respect user's motion preferences

## Mobile Considerations

- **Touch Interactions**: Optimized for touch devices
- **GPS Integration**: Use device GPS when available
- **Offline Support**: Basic functionality without network
- **Battery Optimization**: Efficient location tracking

## Future Enhancements

### Planned Features
1. **Real-time Location**: Live location sharing and tracking
2. **Geofencing**: Location-based notifications and triggers
3. **Route Planning**: Basic routing between locations
4. **Location Groups**: Organize locations into groups/categories
5. **Import/Export**: Backup and restore location data

### Advanced Mapping
1. **External Map APIs**: Google Maps, Mapbox integration
2. **Satellite View**: Aerial imagery support
3. **Street View**: Street-level imagery integration
4. **3D Maps**: Three-dimensional map visualization

### Analytics & Insights
1. **Location Analytics**: Usage patterns and insights
2. **Popular Places**: Community-driven place recommendations
3. **Travel Patterns**: User movement analysis
4. **Location Sharing**: Social location features

## Troubleshooting

### Common Issues

**Location not detected:**
- Check browser permissions
- Verify HTTPS connection
- Test with different browsers

**Geocoding failures:**
- Check network connectivity
- Verify address format
- Try alternative search terms

**Map not loading:**
- Check console for errors
- Verify component props
- Test with different coordinates

**Database errors:**
- Check RLS policies
- Verify user authentication
- Review table permissions

### Debug Tools

Enable debug mode for detailed logging:
```typescript
localStorage.setItem('location-debug', 'true');
```

This provides:
- Detailed error messages
- API request/response logging
- Performance timing information
- State change tracking

## Contributing

When adding location features:

1. **Service Layer**: Extend LocationService with new methods
2. **Hook Integration**: Update hooks with new functionality
3. **Component Updates**: Add UI for new features
4. **Database Changes**: Create migrations for schema updates
5. **Documentation**: Update this guide and API docs
6. **Testing**: Add comprehensive tests

### Code Style
- Use TypeScript for all location code
- Follow existing error handling patterns
- Add proper JSDoc comments
- Include unit tests for utilities

This advanced location system provides a solid foundation for location-based features while maintaining flexibility, performance, and user privacy.