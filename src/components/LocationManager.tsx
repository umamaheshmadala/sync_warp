// LocationManager.tsx
// Location management dashboard with saved locations, history, and geocoding interface

import React, { useState, useCallback, useRef } from 'react';
import {
  MapPin,
  Navigation,
  Search,
  Plus,
  Home,
  Briefcase,
  Heart,
  Clock,
  Trash2,
  Edit,
  Loader2,
  AlertCircle,
  CheckCircle,
  X,
  Star,
  Settings
} from 'lucide-react';
import useAdvancedLocation from '../hooks/useAdvancedLocation';
import { SavedLocation, LocationSearchResult, Coordinates } from '../services/locationService';

interface LocationManagerProps {
  onLocationSelect?: (coordinates: Coordinates, address: string) => void;
  showAsModal?: boolean;
  onClose?: () => void;
}

const LocationManager: React.FC<LocationManagerProps> = ({
  onLocationSelect,
  showAsModal = false,
  onClose
}) => {
  const {
    currentLocation,
    savedLocations,
    locationHistory,
    isLoading,
    error,
    permissionStatus,
    getCurrentLocation,
    geocodeAddress,
    searchPlaces,
    getAddressSuggestions,
    saveLocation,
    updateSavedLocation,
    deleteSavedLocation,
    clearHistory,
    formatDistance,
    calculateDistance,
    requestLocationPermission
  } = useAdvancedLocation();

  const [activeTab, setActiveTab] = useState<'current' | 'saved' | 'search' | 'history'>('current');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocationSearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [editingLocation, setEditingLocation] = useState<SavedLocation | null>(null);
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');
  const [newLocationType, setNewLocationType] = useState<SavedLocation['type']>('favorite');

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Handle search input changes with debounced suggestions
  const handleSearchChange = useCallback(async (value: string) => {
    setSearchQuery(value);
    
    if (value.length >= 3) {
      try {
        const addressSuggestions = await getAddressSuggestions(value);
        setSuggestions(addressSuggestions);
        setShowSuggestions(true);
      } catch (error) {
        console.warn('Failed to get suggestions:', error);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [getAddressSuggestions]);

  // Handle search submission
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    
    setSearchLoading(true);
    setShowSuggestions(false);
    
    try {
      // First try geocoding the address
      try {
        const location = await geocodeAddress(searchQuery);
        setSearchResults([{
          placeId: location.placeId || '',
          name: location.address.split(',')[0],
          address: location.formattedAddress || location.address,
          coordinates: location.coordinates,
          types: ['address']
        }]);
      } catch (geocodeError) {
        // If geocoding fails, try place search
        const places = await searchPlaces(searchQuery, currentLocation?.coordinates);
        setSearchResults(places);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearchLoading(false);
    }
  }, [searchQuery, geocodeAddress, searchPlaces, currentLocation]);

  // Handle location selection
  const handleLocationSelect = useCallback((coordinates: Coordinates, address: string) => {
    if (onLocationSelect) {
      onLocationSelect(coordinates, address);
    }
    if (showAsModal && onClose) {
      onClose();
    }
  }, [onLocationSelect, showAsModal, onClose]);

  // Save current location
  const handleSaveCurrentLocation = useCallback(async () => {
    if (!currentLocation) return;
    
    setShowAddLocation(true);
    setNewLocationName(currentLocation.address.split(',')[0]);
  }, [currentLocation]);

  // Save a new location
  const handleSaveNewLocation = useCallback(async (
    coordinates: Coordinates,
    address: string,
    name: string,
    type: SavedLocation['type']
  ) => {
    try {
      await saveLocation({
        name,
        address,
        coordinates,
        type
      });
      setShowAddLocation(false);
      setNewLocationName('');
      setNewLocationType('favorite');
    } catch (error) {
      console.error('Failed to save location:', error);
    }
  }, [saveLocation]);

  // Delete saved location
  const handleDeleteLocation = useCallback(async (id: string) => {
    if (window.confirm('Are you sure you want to delete this location?')) {
      try {
        await deleteSavedLocation(id);
      } catch (error) {
        console.error('Failed to delete location:', error);
      }
    }
  }, [deleteSavedLocation]);

  // Get location type icon
  const getLocationTypeIcon = (type: SavedLocation['type']) => {
    switch (type) {
      case 'home':
        return <Home className="w-4 h-4" />;
      case 'work':
        return <Briefcase className="w-4 h-4" />;
      case 'favorite':
        return <Heart className="w-4 h-4" />;
      case 'recent':
        return <Clock className="w-4 h-4" />;
      default:
        return <MapPin className="w-4 h-4" />;
    }
  };

  // Container classes for modal or embedded display
  const containerClasses = showAsModal
    ? "fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
    : "max-w-4xl mx-auto p-6";

  const contentClasses = showAsModal
    ? "bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
    : "bg-white rounded-lg shadow-sm border";

  return (
    <div className={containerClasses}>
      <div className={contentClasses}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Location Manager</h2>
            <p className="text-gray-600 mt-1">Manage your saved locations and search for new places</p>
          </div>
          {showAsModal && onClose && (
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200">
          {[
            { id: 'current', label: 'Current Location', icon: Navigation },
            { id: 'saved', label: 'Saved Locations', icon: Star },
            { id: 'search', label: 'Search Places', icon: Search },
            { id: 'history', label: 'History', icon: Clock }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {/* Current Location Tab */}
          {activeTab === 'current' && (
            <div className="space-y-6">
              {/* Permission Status */}
              {permissionStatus === 'denied' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <div>
                      <h3 className="font-medium text-red-900">Location Access Denied</h3>
                      <p className="text-sm text-red-700 mt-1">
                        Please enable location access in your browser settings to use this feature.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Current Location Display */}
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Your Current Location</h3>
                  <button
                    onClick={getCurrentLocation}
                    disabled={isLoading}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Navigation className="w-4 h-4" />
                    )}
                    <span>{isLoading ? 'Getting Location...' : 'Update Location'}</span>
                  </button>
                </div>

                {currentLocation ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-gray-900 font-medium">{currentLocation.address}</p>
                      <p className="text-gray-600 text-sm mt-1">
                        {currentLocation.city}, {currentLocation.state} {currentLocation.postalCode}
                      </p>
                      <p className="text-gray-500 text-sm mt-1">
                        {currentLocation.coordinates.lat.toFixed(6)}, {currentLocation.coordinates.lng.toFixed(6)}
                      </p>
                    </div>

                    <div className="flex space-x-3">
                      <button
                        onClick={() => handleLocationSelect(currentLocation.coordinates, currentLocation.address)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        Use This Location
                      </button>
                      <button
                        onClick={handleSaveCurrentLocation}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                      >
                        <Plus className="w-4 h-4 inline mr-2" />
                        Save Location
                      </button>
                    </div>
                  </div>
                ) : error ? (
                  <div className="flex items-center space-x-2 text-red-600">
                    <AlertCircle className="w-5 h-5" />
                    <span>{error}</span>
                  </div>
                ) : (
                  <p className="text-gray-500">Click "Update Location" to get your current position</p>
                )}
              </div>
            </div>
          )}

          {/* Saved Locations Tab */}
          {activeTab === 'saved' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Your Saved Locations</h3>
                <button
                  onClick={() => setShowAddLocation(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Location</span>
                </button>
              </div>

              {savedLocations.length === 0 ? (
                <div className="text-center py-8">
                  <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No saved locations</h3>
                  <p className="text-gray-600">Add your favorite places to access them quickly</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {savedLocations.map(location => (
                    <div key={location.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className={`p-2 rounded-full ${
                            location.type === 'home' ? 'bg-green-100 text-green-600' :
                            location.type === 'work' ? 'bg-blue-100 text-blue-600' :
                            'bg-red-100 text-red-600'
                          }`}>
                            {getLocationTypeIcon(location.type)}
                          </div>
                          
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{location.name}</h4>
                            <p className="text-gray-600 text-sm mt-1">{location.address}</p>
                            {currentLocation && (
                              <p className="text-gray-500 text-xs mt-1">
                                {formatDistance(calculateDistance(currentLocation.coordinates, location.coordinates))} away
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleLocationSelect(location.coordinates, location.address)}
                            className="text-green-600 hover:text-green-700"
                            title="Use this location"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingLocation(location)}
                            className="text-blue-600 hover:text-blue-700"
                            title="Edit location"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteLocation(location.id)}
                            className="text-red-600 hover:text-red-700"
                            title="Delete location"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Search Places Tab */}
          {activeTab === 'search' && (
            <div className="space-y-6">
              {/* Search Input */}
              <div className="relative">
                <div className="flex space-x-2">
                  <div className="flex-1 relative">
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSearch();
                        }
                      }}
                      placeholder="Search for addresses or places..."
                      className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                  </div>
                  <button
                    onClick={handleSearch}
                    disabled={searchLoading || !searchQuery.trim()}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {searchLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      'Search'
                    )}
                  </button>
                </div>

                {/* Suggestions Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setSearchQuery(suggestion);
                          setShowSuggestions(false);
                          handleSearch();
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-gray-900">Search Results</h3>
                  <div className="space-y-2">
                    {searchResults.map((result, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{result.name}</h4>
                            <p className="text-gray-600 text-sm mt-1">{result.address}</p>
                            {result.vicinity && (
                              <p className="text-gray-500 text-xs mt-1">{result.vicinity}</p>
                            )}
                            {currentLocation && (
                              <p className="text-gray-500 text-xs mt-1">
                                {formatDistance(calculateDistance(currentLocation.coordinates, result.coordinates))} away
                              </p>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleLocationSelect(result.coordinates, result.address)}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                              Use Location
                            </button>
                            <button
                              onClick={() => {
                                setShowAddLocation(true);
                                setNewLocationName(result.name);
                              }}
                              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                            >
                              <Plus className="w-4 h-4 inline mr-1" />
                              Save
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Location History Tab */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Recent Locations</h3>
                {locationHistory.length > 0 && (
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to clear all location history?')) {
                        clearHistory();
                      }
                    }}
                    className="text-red-600 hover:text-red-700 text-sm"
                  >
                    Clear History
                  </button>
                )}
              </div>

              {locationHistory.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No location history</h3>
                  <p className="text-gray-600">Your recent location searches will appear here</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {locationHistory.map(item => (
                    <div key={item.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{item.address}</p>
                          {item.search_query && (
                            <p className="text-gray-600 text-sm mt-1">
                              Searched for: "{item.search_query}"
                            </p>
                          )}
                          <p className="text-gray-500 text-xs mt-1">
                            {new Date(item.accessed_at).toLocaleDateString()} at{' '}
                            {new Date(item.accessed_at).toLocaleTimeString()}
                          </p>
                        </div>
                        
                        <button
                          onClick={() => handleLocationSelect(item.coordinates, item.address)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          Use Location
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Add Location Modal */}
        {showAddLocation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Save Location</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location Name
                  </label>
                  <input
                    type="text"
                    value={newLocationName}
                    onChange={(e) => setNewLocationName(e.target.value)}
                    placeholder="Enter a name for this location"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location Type
                  </label>
                  <select
                    value={newLocationType}
                    onChange={(e) => setNewLocationType(e.target.value as SavedLocation['type'])}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="favorite">Favorite</option>
                    <option value="home">Home</option>
                    <option value="work">Work</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddLocation(false);
                    setNewLocationName('');
                    setNewLocationType('favorite');
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (currentLocation && newLocationName.trim()) {
                      handleSaveNewLocation(
                        currentLocation.coordinates,
                        currentLocation.address,
                        newLocationName,
                        newLocationType
                      );
                    }
                  }}
                  disabled={!newLocationName.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Save Location
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LocationManager;