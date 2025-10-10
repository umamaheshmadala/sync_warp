// src/components/location/CityPicker.tsx
import React, { useState, useMemo } from 'react';
import { X, Search, MapPin, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCities } from '../../hooks/useCities';
import { useAuthStore } from '../../store/authStore';
import type { City, CityPickerProps } from '../../types/location';

const CityPicker: React.FC<CityPickerProps> = ({ isOpen, onClose, onCitySelect }) => {
  const { cities, loading, getCitiesByTier, getTierLabel } = useCities();
  const { profile, updateProfile } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const [updating, setUpdating] = useState(false);

  // Filter cities based on search and tier
  const filteredCities = useMemo(() => {
    let filtered = cities;

    // Filter by tier
    if (selectedTier) {
      filtered = getCitiesByTier(selectedTier as 1 | 2 | 3);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        city =>
          city.name.toLowerCase().includes(query) ||
          city.state.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [cities, searchQuery, selectedTier, getCitiesByTier]);

  // Group cities by tier
  const cityGroups = useMemo(() => {
    const groups: Record<number, City[]> = { 1: [], 2: [], 3: [] };
    filteredCities.forEach(city => {
      groups[city.tier].push(city);
    });
    return groups;
  }, [filteredCities]);

  const handleCitySelect = async (city: City) => {
    try {
      setUpdating(true);

      // Update profile with new city
      await updateProfile({ city: city.name });

      // Callback
      if (onCitySelect) {
        onCitySelect(city);
      }

      // Close modal
      onClose();
    } catch (error) {
      console.error('Error updating city:', error);
      alert('Failed to update city. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Select Your City</h2>
                    {profile?.city && (
                      <p className="text-sm text-indigo-100">Current: {profile.city}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-indigo-200 hover:text-white transition-colors p-2 hover:bg-white hover:bg-opacity-20 rounded-full"
                  aria-label="Close"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              {/* Search Bar */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search cities or states..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {/* Tier Filters */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                <button
                  onClick={() => setSelectedTier(null)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    selectedTier === null
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                  }`}
                >
                  All Cities ({cities.length})
                </button>
                {[1, 2, 3].map(tier => (
                  <button
                    key={tier}
                    onClick={() => setSelectedTier(tier)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                      selectedTier === tier
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                    }`}
                  >
                    {getTierLabel(tier as 1 | 2 | 3)} ({getCitiesByTier(tier as 1 | 2 | 3).length})
                  </button>
                ))}
              </div>
            </div>

            {/* Cities List */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
                  <p className="text-gray-600">Loading cities...</p>
                </div>
              ) : filteredCities.length === 0 ? (
                <div className="text-center py-12">
                  <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">No cities found</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Try adjusting your search or filter
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {[1, 2, 3].map(tier => {
                    const tierCities = cityGroups[tier];
                    if (tierCities.length === 0) return null;

                    return (
                      <div key={tier}>
                        <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3 flex items-center">
                          <span className={`w-2 h-2 rounded-full mr-2 ${
                            tier === 1 ? 'bg-green-500' : tier === 2 ? 'bg-blue-500' : 'bg-purple-500'
                          }`} />
                          {getTierLabel(tier as 1 | 2 | 3)}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {tierCities.map(city => (
                            <motion.button
                              key={city.id}
                              onClick={() => handleCitySelect(city)}
                              disabled={updating}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all text-left ${
                                profile?.city === city.name
                                  ? 'border-indigo-600 bg-indigo-50 shadow-sm'
                                  : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                              } ${updating ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">{city.name}</p>
                                <p className="text-xs text-gray-500 truncate">{city.state}</p>
                              </div>
                              {profile?.city === city.name && (
                                <Check className="w-5 h-5 text-indigo-600 flex-shrink-0 ml-2" />
                              )}
                            </motion.button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <p>
                  {filteredCities.length} {filteredCities.length === 1 ? 'city' : 'cities'} available
                </p>
                <p className="text-xs text-gray-500">
                  Your selection affects pricing and recommendations
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CityPicker;
