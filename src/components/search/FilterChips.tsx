/**
 * Filter Chips Component
 * Story 9.2.4: Search Filters & Advanced Search
 * Displays active filters as removable chips
 */

import React from 'react';
import { X, MapPin, Users, Heart } from 'lucide-react';
import { FriendSearchFilters } from '../../services/searchService';

interface FilterChipsProps {
  filters: FriendSearchFilters;
  onRemoveFilter: (filterKey: keyof FriendSearchFilters) => void;
}

export function FilterChips({ filters, onRemoveFilter }: FilterChipsProps) {
  const activeFilters: { key: keyof FriendSearchFilters; label: string; icon: React.ReactNode }[] = [];

  // Location chip
  if (filters.location) {
    activeFilters.push({
      key: 'location',
      label: `Within ${filters.location.radius} km`,
      icon: <MapPin className="w-3 h-3" />,
    });
  }

  // Mutual friends chip
  if (filters.hasMutualFriends) {
    activeFilters.push({
      key: 'hasMutualFriends',
      label: 'Has mutual friends',
      icon: <Users className="w-3 h-3" />,
    });
  }

  // Shared interests chips
  if (filters.sharedInterests && filters.sharedInterests.length > 0) {
    filters.sharedInterests.forEach((interest) => {
      activeFilters.push({
        key: 'sharedInterests',
        label: interest.charAt(0).toUpperCase() + interest.slice(1),
        icon: <Heart className="w-3 h-3" />,
      });
    });
  }

  if (activeFilters.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {activeFilters.map((filter, index) => (
        <button
          key={`${filter.key}-${index}`}
          onClick={() => onRemoveFilter(filter.key)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-full text-sm font-medium hover:bg-primary-100 transition-colors"
        >
          {filter.icon}
          <span>{filter.label}</span>
          <X className="w-3.5 h-3.5 ml-1" />
        </button>
      ))}
    </div>
  );
}
