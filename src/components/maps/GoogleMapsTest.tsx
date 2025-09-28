import React, { useState } from 'react';
import GoogleMapsLocationPicker from './GoogleMapsLocationPicker';

interface Location {
  lat: number;
  lng: number;
}

const GoogleMapsTest: React.FC = () => {
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<string>('');

  const handleLocationChange = (location: Location, address?: string) => {
    console.log('📍 Location selected:', location);
    console.log('🏠 Address:', address);
    setSelectedLocation(location);
    setSelectedAddress(address || '');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Google Maps Integration Test</h1>
      
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4">Interactive Map Picker</h2>
        <div className="border rounded-lg overflow-hidden">
          <GoogleMapsLocationPicker
            apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
            onLocationChange={handleLocationChange}
            height="500px"
            showSearch={true}
            showCurrentLocationBtn={true}
          />
        </div>
      </div>

      {selectedLocation && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Selected Location:</h3>
          <p><strong>Coordinates:</strong> {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}</p>
          {selectedAddress && (
            <p><strong>Address:</strong> {selectedAddress}</p>
          )}
          <div className="mt-4">
            <a
              href={`https://maps.google.com/?q=${selectedLocation.lat},${selectedLocation.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              View on Google Maps
            </a>
          </div>
        </div>
      )}

      <div className="mt-8 text-sm text-gray-600">
        <h3 className="font-semibold mb-2">Test Instructions:</h3>
        <ul className="list-disc list-inside space-y-1">
          <li>Click anywhere on the map to place a marker</li>
          <li>Search for a specific address using the search box</li>
          <li>Click "Use Current Location" to get your GPS coordinates</li>
          <li>Drag the marker to fine-tune the position</li>
          <li>Check the browser console for detailed logs</li>
        </ul>
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold mb-2 text-blue-800">API Status:</h3>
        <p className="text-blue-700">
          {import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? 
            '✅ Google Maps API Key is configured' : 
            '❌ Google Maps API Key is not configured'
          }
        </p>
      </div>
    </div>
  );
};

export default GoogleMapsTest;