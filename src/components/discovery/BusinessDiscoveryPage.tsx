// BusinessDiscoveryPage.tsx
// Business discovery page with location-based browsing, map integration, and proximity results

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusinessUrl } from '../../hooks/useBusinessUrl';
import {
  Map,
  List,
  Grid,
  MapPin,
  Navigation,
  Target,
  Filter,
  Star,
  Clock,
  Zap,
  Heart,
  TrendingUp,
  Users,
  Award,
  Loader2
} from 'lucide-react';
import useAdvancedSearch from '../../hooks/useAdvancedSearch';
import { useAdvancedLocation } from '../../hooks/useAdvancedLocation';
import { DiscoverySection } from '../../services/advancedSearchService';
import { searchService } from '../../services/searchService';
import BusinessCard from '../search/BusinessCard';
import { SimpleSaveButton } from '../favorites/SimpleSaveButton';
import SimpleMap from '../SimpleMap';

interface BusinessDiscoveryPageProps {
  className?: string;
}

const BusinessDiscoveryPage: React.FC<BusinessDiscoveryPageProps> = ({ className = '' }) => {
  const navigate = useNavigate();
  const { getBusinessUrl } = useBusinessUrl();
  const {
    discoverySections,
    isLoading,
    error,
    loadDiscoverySections,
    searchNearby,
    searchByCategory,
    getPersonalizedRecommendations,
    getTrendingCoupons
  } = useAdvancedSearch();

  const {
    currentLocation,
    getCurrentLocation,
    isLoading: locationLoading,
    error: locationError
  } = useAdvancedLocation();

  // Local state
  const [selectedRadius, setSelectedRadius] = useState(10);
  const [showMap, setShowMap] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [personalizedRecommendations, setPersonalizedRecommendations] = useState<any[]>([]);
  const [trendingCoupons, setTrendingCoupons] = useState<any[]>([]);
  const [nearbyBusinesses, setNearbyBusinesses] = useState<any[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, [currentLocation]);

  // Refresh on tab visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isLoading) {
        console.log('[BusinessDiscoveryPage] Tab became visible, refreshing discovery data');
        loadInitialData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isLoading]);

  const loadInitialData = async () => {
    try {
      await loadDiscoverySections();
      
      // Load personalized recommendations
      const recommendations = await getPersonalizedRecommendations();
      setPersonalizedRecommendations(recommendations);

      // Load trending coupons
      const coupons = await getTrendingCoupons();
      setTrendingCoupons(coupons);
    } catch (error) {
      console.error('Failed to load discovery data:', error);
    }
  };

  const handleLocationRequest = async () => {
    try {
      await getCurrentLocation();
      // Once location is obtained, load nearby businesses automatically
      setTimeout(() => {
        handleSearchNearby();
      }, 100);
    } catch (error) {
      console.error('Failed to get location:', error);
      // Error is handled by the useAdvancedLocation hook and displayed in UI
    }
  };

  const handleSearchNearby = async (radius: number = selectedRadius) => {
    if (!currentLocation) {
      await handleLocationRequest();
      return;
    }
    
    setNearbyLoading(true);
    try {
      // Try to use the enhanced search service with nearby_businesses function
      try {
        const businesses = await searchService.getNearbyBusinesses(
          currentLocation.coordinates.latitude,
          currentLocation.coordinates.longitude,
          radius,
          20
        );
        setNearbyBusinesses(businesses);
      } catch (searchError) {
        console.warn('Enhanced nearby search failed, using fallback:', searchError);
        // Fallback to the hook-based search
        setNearbyBusinesses([]);
      }
      
      // Also trigger the existing search functionality for compatibility
      await searchNearby(radius);
      setSelectedSection('nearby');
    } catch (error) {
      console.error('Failed to fetch nearby businesses:', error);
      // Still show existing discovery sections even if nearby search fails
    } finally {
      setNearbyLoading(false);
    }
  };

  const handleCategorySearch = async (category: string) => {
    await searchByCategory(category);
    navigate(`/search/advanced?category=${encodeURIComponent(category)}`);
  };

  const getSectionIcon = (type: string) => {
    switch (type) {
      case 'trending': return <TrendingUp className="w-5 h-5" />;
      case 'nearby': return <MapPin className="w-5 h-5" />;
      case 'new': return <Zap className="w-5 h-5" />;
      case 'recommended': return <Award className="w-5 h-5" />;
      default: return <Star className="w-5 h-5" />;
    }
  };

  const getSectionColor = (type: string) => {
    switch (type) {
      case 'trending': return 'text-red-500 bg-red-100';
      case 'nearby': return 'text-green-500 bg-green-100';
      case 'new': return 'text-blue-500 bg-blue-100';
      case 'recommended': return 'text-purple-500 bg-purple-100';
      default: return 'text-gray-500 bg-gray-100';
    }
  };

  if (isLoading && discoverySections.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Discovering businesses near you...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`max-w-7xl mx-auto p-6 ${className}`}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Discover Businesses</h1>
        <p className="text-gray-600">
          Explore local businesses, trending deals, and personalized recommendations
        </p>
      </div>

      {/* Location Banner */}
      {!currentLocation && !locationLoading && (
        <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <Navigation className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Enable Location Services</h3>
                <p className="text-gray-600">Get personalized recommendations based on your location</p>
                {locationError && (
                  <p className="text-red-600 text-sm mt-1">
                    Error: {locationError.message || 'Location access failed'}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={handleLocationRequest}
              disabled={locationLoading}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {locationLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <MapPin className="w-4 h-4" />
              )}
              <span>{locationLoading ? 'Getting Location...' : 'Enable Location'}</span>
            </button>
          </div>
        </div>
      )}
      
      {/* Location Loading */}
      {locationLoading && (
        <div className="mb-8 p-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl">
          <div className="flex items-center space-x-4">
            <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
            <div>
              <h3 className="font-semibold text-gray-900">Getting Your Location</h3>
              <p className="text-gray-600">Please allow location access when prompted</p>
            </div>
          </div>
        </div>
      )}

      {/* Location Info & Quick Actions */}
      {currentLocation && (
        <div className="mb-8 p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-green-100 rounded-full">
                <MapPin className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Current Location</h3>
                <p className="text-gray-600">{currentLocation.address}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Radius Selector */}
              <select
                value={selectedRadius}
                onChange={(e) => setSelectedRadius(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value={5}>Within 5 km</option>
                <option value={10}>Within 10 km</option>
                <option value={25}>Within 25 km</option>
                <option value={50}>Within 50 km</option>
              </select>

              {/* Search Nearby */}
              <button
                onClick={() => handleSearchNearby()}
                className="flex items-center space-x-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                <Target className="w-4 h-4" />
                <span>Search Nearby</span>
              </button>

              {/* Toggle Map */}
              <button
                onClick={() => setShowMap(!showMap)}
                className={`p-2 border border-gray-300 rounded-lg hover:bg-gray-50 ${
                  showMap ? 'bg-indigo-100 border-indigo-300' : ''
                }`}
              >
                {showMap ? <List className="w-5 h-5" /> : <Map className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Map View */}
          {showMap && (
            <div className="mt-4 h-96 rounded-lg overflow-hidden border border-gray-200">
              <SimpleMap
                center={currentLocation.coordinates}
                zoom={12}
                businesses={discoverySections.flatMap(section => section.businesses)}
                onBusinessClick={(business) => navigate(getBusinessUrl(business.id, business.name || business.business_name))}
              />
            </div>
          )}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Nearby Businesses with Precise Distance */}
      {nearbyBusinesses.length > 0 && (
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <MapPin className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Nearby Businesses</h2>
                <p className="text-gray-600">Within {selectedRadius} km of your location</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <select
                value={selectedRadius}
                onChange={(e) => {
                  setSelectedRadius(parseInt(e.target.value));
                  handleSearchNearby(parseInt(e.target.value));
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={nearbyLoading}
              >
                <option value={5}>5 km</option>
                <option value={10}>10 km</option>
                <option value={25}>25 km</option>
                <option value={50}>50 km</option>
              </select>
              {nearbyLoading && <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {nearbyBusinesses.slice(0, 9).map(business => (
              <div key={business.id} className="relative">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden">
                  {business.cover_image_url && (
                    <div className="h-32 bg-gray-200">
                      <img
                        src={business.cover_image_url}
                        alt={business.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        {business.logo_url && (
                          <img
                            src={business.logo_url}
                            alt={business.name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        )}
                        <div>
                          <h3 className="font-semibold text-gray-900">{business.name}</h3>
                          <p className="text-sm text-gray-600">{business.category}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-green-600">
                          {business.distance_km} km
                        </div>
                        <div className="text-xs text-gray-500">away</div>
                      </div>
                    </div>
                    
                    {business.description && (
                      <p className="text-sm text-gray-600 mb-3">{business.description.slice(0, 100)}...</p>
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                      {business.address && (
                        <span className="flex items-center space-x-1">
                          <MapPin className="w-3 h-3" />
                          <span>{business.address.slice(0, 30)}...</span>
                        </span>
                      )}
                    </div>
                    
                    <button
                      onClick={() => navigate(getBusinessUrl(business.id, business.name))}
                      className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm"
                    >
                      View Business
                    </button>
                  </div>
                </div>
                <div className="absolute top-3 right-3">
                  <SimpleSaveButton
                    itemId={business.id}
                    itemType="business"
                    itemData={{
                      business_name: business.name,
                      business_type: business.category,
                      address: business.address,
                      rating: business.rating,
                      description: business.description
                    }}
                    size="sm"
                  />
                </div>
              </div>
            ))}
          </div>
          
          {nearbyBusinesses.length > 9 && (
            <div className="text-center mt-6">
              <button
                onClick={() => navigate(`/search/advanced?location=${currentLocation?.coordinates.latitude},${currentLocation?.coordinates.longitude}&radius=${selectedRadius}`)}
                className="px-6 py-2 border border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50 font-medium"
              >
                View All {nearbyBusinesses.length} Nearby Businesses
              </button>
            </div>
          )}
        </div>
      )}

      {/* Personalized Recommendations */}
      {personalizedRecommendations.length > 0 && (
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Award className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Recommended for You</h2>
                <p className="text-gray-600">Based on your favorites and activity</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/search/advanced?recommended=true')}
              className="text-indigo-600 hover:text-indigo-700 font-medium"
            >
              View All
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {personalizedRecommendations.slice(0, 6).map(business => (
              <div key={business.id} className="relative">
                <BusinessCard
                  business={business}
                  onClick={() => navigate(getBusinessUrl(business.id, business.name || business.business_name))}
                  showDistance={!!currentLocation}
                  showFavoriteButton={true}
                />
                <div className="absolute top-3 right-3">
                  <SimpleSaveButton
                    itemId={business.id}
                    itemType="business"
                    itemData={{
                      business_name: business.name || business.business_name,
                      business_type: business.category || business.business_type,
                      address: business.address,
                      rating: business.rating,
                      description: business.description
                    }}
                    size="sm"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Discovery Sections */}
      {discoverySections.length > 0 ? discoverySections.map((section) => (
        <div key={section.id} className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${getSectionColor(section.type)}`}>
                {getSectionIcon(section.type)}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{section.title}</h2>
                <p className="text-gray-600">
                  {section.type === 'trending' && 'Most popular businesses right now'}
                  {section.type === 'nearby' && 'Businesses close to your location'}
                  {section.type === 'new' && 'Recently added businesses'}
                  {section.type === 'recommended' && 'Tailored to your preferences'}
                </p>
              </div>
            </div>
            
            <button
              onClick={() => navigate(`/search/advanced?section=${section.type}`)}
              className="text-indigo-600 hover:text-indigo-700 font-medium"
            >
              View All
            </button>
          </div>

          {/* Business Cards */}
          {section.businesses.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
              {section.businesses.map(business => (
                <div key={business.id} className="relative">
                  <BusinessCard
                    business={business}
                    onClick={() => navigate(getBusinessUrl(business.id, business.name || business.business_name))}
                    showDistance={section.type === 'nearby' && !!currentLocation}
                    showFavoriteButton={true}
                  />
                  <div className="absolute top-3 right-3">
                    <SimpleSaveButton
                      itemId={business.id}
                      itemType="business"
                      itemData={{
                        business_name: business.name || business.business_name,
                        business_type: business.category || business.business_type,
                        address: business.address,
                        rating: business.rating,
                        description: business.description
                      }}
                      size="sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Coupon Cards */}
          {section.coupons && section.coupons.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {section.coupons.map(coupon => (
                <div key={coupon.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      {coupon.business_logo && (
                        <img
                          src={coupon.business_logo}
                          alt={coupon.business_name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      )}
                      <div>
                        <h3 className="font-semibold text-gray-900">{coupon.business_name}</h3>
                        <p className="text-sm text-gray-600">{coupon.title}</p>
                      </div>
                    </div>
                    {coupon.is_trending && (
                      <div className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                        Trending
                      </div>
                    )}
                  </div>

                  <div className="mb-4">
                    <div className="text-2xl font-bold text-green-600 mb-2">
                      {coupon.discount_type === 'percentage' && `${coupon.discount_value}% OFF`}
                      {coupon.discount_type === 'fixed_amount' && `₹${coupon.discount_value} OFF`}
                      {coupon.discount_type === 'buy_x_get_y' && `Buy ${coupon.discount_value} Get 1 FREE`}
                      {coupon.discount_type === 'free_item' && 'FREE ITEM'}
                    </div>
                    <p className="text-gray-600 text-sm">{coupon.description}</p>
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <span>Valid until {new Date(coupon.valid_until).toLocaleDateString()}</span>
                    <span>{coupon.usage_limit - (coupon.used_count || 0)} uses left</span>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={() => navigate(`/coupon/${coupon.id}`)}
                      className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                    >
                      View Deal
                    </button>
                    <button
                      onClick={() => navigate(getBusinessUrl(coupon.business_id, coupon.business_name))}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                    >
                      Visit Store
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {section.businesses.length === 0 && (!section.coupons || section.coupons.length === 0) && (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <div className={`w-16 h-16 mx-auto mb-4 rounded-full ${getSectionColor(section.type)} flex items-center justify-center`}>
                {getSectionIcon(section.type)}
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No {section.title.toLowerCase()} found</h3>
              <p className="text-gray-600 mb-4">
                {section.type === 'nearby' 
                  ? 'Enable location services to see nearby businesses'
                  : 'Check back later for new content'
                }
              </p>
              {section.type === 'nearby' && !currentLocation && (
                <button
                  onClick={handleLocationRequest}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                >
                  Enable Location
                </button>
              )}
            </div>
          )}
        </div>
      )) : !isLoading && !error ? (
        /* Fallback when no discovery sections */
        <div className="mb-12">
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white">
              <Star className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Discovery Content Loading</h3>
            <p className="text-gray-600 mb-6">
              We're working on loading personalized content for you. Try searching for businesses directly.
            </p>
            <div className="flex justify-center space-x-3">
              <button
                onClick={() => navigate('/search')}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
              >
                Search Businesses
              </button>
              <button
                onClick={() => navigate('/coupons/trending')}
                className="px-6 py-2 border border-indigo-300 text-indigo-600 rounded-lg hover:bg-indigo-50 font-medium"
              >
                View Trending Coupons
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Category Quick Access */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Browse by Category</h2>
            <p className="text-gray-600">Explore businesses by type</p>
          </div>
          <button
            onClick={() => navigate('/categories')}
            className="text-indigo-600 hover:text-indigo-700 font-medium"
          >
            View All Categories
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {['Restaurants', 'Retail', 'Services', 'Entertainment', 'Health', 'Education'].map((category) => (
            <button
              key={category}
              onClick={() => handleCategorySearch(category)}
              className="p-4 bg-white border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors group"
            >
              <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center group-hover:bg-indigo-100">
                <Grid className="w-6 h-6 text-gray-600 group-hover:text-indigo-600" />
              </div>
              <div className="text-sm font-medium text-gray-900 group-hover:text-indigo-900">{category}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Call to Action */}
      <div className="text-center py-12 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">Can't find what you're looking for?</h3>
        <p className="text-gray-600 mb-8">Use our advanced search to find exactly what you need</p>
        <button
          onClick={() => navigate('/search/advanced')}
          className="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
        >
          Advanced Search
        </button>
      </div>
    </div>
  );
};

export default BusinessDiscoveryPage;