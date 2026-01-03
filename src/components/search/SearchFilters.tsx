/**
 * Search Filters Component
 * Story 9.2.4: Search Filters & Advanced Search
 */

import React from 'react';
import { MapPin, Users, Heart } from 'lucide-react';
import { FriendSearchFilters } from '../../services/searchService';

interface SearchFiltersProps {
  filters: FriendSearchFilters;
  onChange: (filters: FriendSearchFilters) => void;
  onClear: () => void;
}

export function SearchFilters({ filters, onChange, onClear }: SearchFiltersProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Filters</h3>
        <button
          onClick={onClear}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          Clear all
        </button>
      </div>
      
      {/* Location Filter */}
      <div>
        <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
          <MapPin className="w-4 h-4 mr-2" />
          Distance
        </label>
        <select
          value={filters.location?.radius || ''}
          onChange={(e) => {
            const radius = e.target.value;
            if (radius) {
              navigator.geolocation.getCurrentPosition(
                (position) => {
                  onChange({
                    ...filters,
                    location: {
                      lat: position.coords.latitude,
                      lng: position.coords.longitude,
                      radius: parseInt(radius) as 5 | 10 | 25 | 50,
                    },
                  });
                },
                () => {
                  alert('Location permission required for distance filter');
                }
              );
            } else {
              onChange({ ...filters, location: undefined });
            }
          }}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Any distance</option>
          <option value="5">Within 5 km</option>
          <option value="10">Within 10 km</option>
          <option value="25">Within 25 km</option>
          <option value="50">Within 50 km</option>
        </select>
      </div>

      {/* Mutual Friends Filter */}
      <label className="flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={filters.hasMutualFriends || false}
          onChange={(e) => onChange({
            ...filters,
            hasMutualFriends: e.target.checked,
          })}
          className="mr-3 w-4 h-4"
        />
        <Users className="w-4 h-4 mr-2 text-gray-600" />
        <span className="text-sm text-gray-700">Has mutual friends</span>
      </label>

      {/* Shared Interests Filter */}
      <div>
        <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
          <Heart className="w-4 h-4 mr-2" />
          Shared Interests
        </label>
        <select
          multiple
          value={filters.sharedInterests || []}
          onChange={(e) => {
            const selected = Array.from(e.target.selectedOptions, option => option.value);
            onChange({
              ...filters,
              sharedInterests: selected.length > 0 ? selected : undefined,
            });
          }}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
          size={4}
        >
          <option value="electronics">Electronics</option>
          <option value="fashion">Fashion</option>
          <option value="home">Home & Garden</option>
          <option value="sports">Sports & Outdoors</option>
          <option value="food">Food & Grocery</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">
          Hold Ctrl/Cmd to select multiple
        </p>
      </div>
    </div>
  );
}
