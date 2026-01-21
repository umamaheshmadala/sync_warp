// src/components/checkins/BusinessCheckinsPage.tsx
// Main page for discovering nearby businesses and checking in

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Navigation,
  Clock,
  Users,
  CheckCircle,
  AlertCircle,
  Loader2,
  Zap,
  Star,
  Camera,
  RefreshCw,
  Settings,
  History,
  Target,
  Smartphone,
} from 'lucide-react';
import { useCheckins, NearbyBusiness, CheckinData } from '../../hooks/useCheckins';
import { useNavigate } from 'react-router-dom';
import ReviewRequestModal from '../reviews/ReviewRequestModal';
import { createReviewRequest } from '../../services/reviewRequestService';

interface CheckinPageState {
  selectedRadius: number;
  viewMode: 'nearby' | 'history';
  selectedBusiness: NearbyBusiness | null;
}

interface ReviewModalState {
  isOpen: boolean;
  checkinId: string | null;
  businessId: string | null;
  businessName: string;
}

const BusinessCheckinsPage: React.FC = () => {
  const navigate = useNavigate();
  const checkins = useCheckins();
  const [state, setState] = useState<CheckinPageState>({
    selectedRadius: 1, // 1km default
    viewMode: 'nearby',
    selectedBusiness: null,
  });

  const [modalState, setModalState] = useState<ReviewModalState>({
    isOpen: false,
    checkinId: null,
    businessId: null,
    businessName: '',
  });

  // Request location on component mount
  useEffect(() => {
    handleRequestLocation();
  }, []);

  const handleRequestLocation = async () => {
    try {
      await checkins.requestLocation();
      // Automatically load nearby businesses after location is acquired
      if (checkins.location.latitude && checkins.location.longitude) {
        await checkins.getNearbyBusinesses(state.selectedRadius);
      }
    } catch (error) {
      console.error('Failed to get location:', error);
    }
  };

  const handleRadiusChange = async (radius: number) => {
    setState(prev => ({ ...prev, selectedRadius: radius }));
    if (checkins.location.latitude && checkins.location.longitude) {
      await checkins.getNearbyBusinesses(radius);
    }
  };

  const handleCheckin = async (businessId: string) => {
    const result = await checkins.performCheckin(businessId);
    if (result) {
      // Find business name
      const business = checkins.nearbyBusinesses.find(b => b.id === businessId);

      // Create review request
      try {
        await createReviewRequest(result.id, businessId);

        // Open modal
        setModalState({
          isOpen: true,
          checkinId: result.id,
          businessId: businessId,
          businessName: business?.business_name || 'the business',
        });
      } catch (error) {
        console.error('Failed to create review request:', error);
      }

      // Refresh nearby businesses to update check-in counts
      await checkins.getNearbyBusinesses(state.selectedRadius);
    }
  };

  const handleWriteReview = () => {
    if (modalState.businessId) {
      navigate(`/business/${modalState.businessId}`, { state: { openReviewForm: true } });
    }
    setModalState(prev => ({ ...prev, isOpen: false }));
  };

  const formatDistance = (distance: number): string => {
    if (distance < 1000) {
      return `${Math.round(distance)}m`;
    }
    return `${(distance / 1000).toFixed(1)}km`;
  };

  const formatLastCheckin = (businessId: string): string => {
    const lastCheckin = checkins.getLastCheckin(businessId);
    if (!lastCheckin) return '';

    const timeDiff = Date.now() - new Date(lastCheckin.checked_in_at).getTime();
    const hours = Math.floor(timeDiff / (1000 * 60 * 60));

    if (hours < 1) return 'Recently';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getCheckinButtonState = (business: NearbyBusiness) => {
    const canCheckIn = checkins.canCheckIn(business);
    const lastCheckin = formatLastCheckin(business.id);

    if (!canCheckIn) {
      if (business.distance > 100) {
        return { disabled: true, text: 'Too Far', color: 'gray', icon: Target };
      }
      if (lastCheckin) {
        return { disabled: true, text: lastCheckin, color: 'blue', icon: Clock };
      }
    }

    return { disabled: false, text: 'Check In', color: 'green', icon: CheckCircle };
  };

  const renderLocationPermissionRequest = () => (
    <div className="text-center py-16">
      <div className="max-w-md mx-auto">
        <Navigation className="w-16 h-16 text-blue-500 mx-auto mb-6" />
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Enable Location Access</h2>
        <p className="text-gray-600 mb-6">
          We need your location to find nearby businesses and enable check-ins.
        </p>

        {checkins.location.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <p className="text-red-700 text-sm">{checkins.location.error}</p>
            </div>
          </div>
        )}

        <button
          onClick={handleRequestLocation}
          disabled={checkins.location.isLoading}
          className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {checkins.location.isLoading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Getting Location...
            </>
          ) : (
            <>
              <MapPin className="w-5 h-5 mr-2" />
              Enable Location
            </>
          )}
        </button>

        <div className="mt-6 text-xs text-gray-500">
          <p>Your location data is only used to find nearby businesses and is not stored.</p>
        </div>
      </div>
    </div>
  );

  const renderNearbyBusinesses = () => (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Search Radius</span>
            </div>
            <select
              value={state.selectedRadius}
              onChange={(e) => handleRadiusChange(Number(e.target.value))}
              className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={0.5}>500m</option>
              <option value={1}>1km</option>
              <option value={2}>2km</option>
              <option value={5}>5km</option>
              <option value={10}>10km</option>
            </select>
          </div>

          <button
            onClick={() => checkins.getNearbyBusinesses(state.selectedRadius)}
            disabled={checkins.isLoadingNearby}
            className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${checkins.isLoadingNearby ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {checkins.location.accuracy && (
          <div className="text-xs text-gray-500">
            Location accuracy: ±{Math.round(checkins.location.accuracy)}m
          </div>
        )}
      </div>

      {/* Loading State */}
      {checkins.isLoadingNearby && (
        <div className="text-center py-8">
          <Loader2 className="w-8 h-8 text-blue-500 mx-auto animate-spin mb-2" />
          <p className="text-gray-600">Finding nearby businesses...</p>
        </div>
      )}

      {/* No Businesses Found */}
      {!checkins.isLoadingNearby && checkins.nearbyBusinesses.length === 0 && (
        <div className="text-center py-12">
          <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Businesses Nearby</h3>
          <p className="text-gray-600">
            Try increasing your search radius or check a different location.
          </p>
        </div>
      )}

      {/* Business List */}
      <div className="grid gap-4">
        {checkins.nearbyBusinesses.map((business) => {
          const buttonState = getCheckinButtonState(business);

          return (
            <motion.div
              key={business.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg border hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      {business.logo_url ? (
                        <img
                          src={business.logo_url}
                          alt={business.business_name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                          <Camera className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {business.business_name}
                        </h3>
                        <p className="text-sm text-gray-600">{business.business_type}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-1" />
                          {formatDistance(business.distance)}
                        </div>
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-1" />
                          {business.total_checkins || 0} check-ins
                        </div>
                      </div>

                      <p className="text-sm text-gray-600">{business.address}</p>
                    </div>
                  </div>

                  <div className="ml-4">
                    <button
                      onClick={() => handleCheckin(business.id)}
                      disabled={buttonState.disabled || checkins.isCheckingIn}
                      className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${buttonState.disabled
                        ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                        : buttonState.color === 'green'
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-blue-100 text-blue-700'
                        }`}
                    >
                      {checkins.isCheckingIn ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <buttonState.icon className="w-4 h-4 mr-1" />
                      )}
                      {checkins.isCheckingIn ? 'Checking in...' : buttonState.text}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );

  const renderCheckinHistory = () => (
    <div className="space-y-4">
      {checkins.isLoadingCheckins && (
        <div className="text-center py-8">
          <Loader2 className="w-8 h-8 text-blue-500 mx-auto animate-spin mb-2" />
          <p className="text-gray-600">Loading check-in history...</p>
        </div>
      )}

      {!checkins.isLoadingCheckins && checkins.userCheckins.length === 0 && (
        <div className="text-center py-12">
          <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Check-ins Yet</h3>
          <p className="text-gray-600">
            Start checking in to businesses to build your history!
          </p>
        </div>
      )}

      <div className="grid gap-4">
        {checkins.userCheckins.map((checkin) => (
          <motion.div
            key={checkin.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg border p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h4 className="font-medium text-gray-900">
                    {checkin.business?.business_name}
                  </h4>
                  {checkin.verified && (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                </div>
                <p className="text-sm text-gray-600">{checkin.business?.address}</p>
                <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                  <span>
                    {formatDistance(checkin.distance_from_business)} away
                  </span>
                  <span>
                    {new Date(checkin.checked_in_at).toLocaleDateString()}
                  </span>
                  <span>
                    {new Date(checkin.checked_in_at).toLocaleTimeString()}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${checkin.verified
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
                  }`}>
                  {checkin.verification_method.toUpperCase()}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );

  // Show location request if no location permission
  if (!checkins.location.hasPermission && !checkins.location.isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {renderLocationPermissionRequest()}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Business Check-ins
          </h1>
          <p className="text-gray-600">
            Discover nearby businesses and check in to earn rewards
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setState(prev => ({ ...prev, viewMode: 'nearby' }))}
              className={`pb-4 px-1 border-b-2 font-medium text-sm ${state.viewMode === 'nearby'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              <div className="flex items-center space-x-2">
                <Target className="w-4 h-4" />
                <span>Nearby Businesses</span>
                {checkins.nearbyBusinesses.length > 0 && (
                  <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full text-xs">
                    {checkins.nearbyBusinesses.length}
                  </span>
                )}
              </div>
            </button>

            <button
              onClick={() => setState(prev => ({ ...prev, viewMode: 'history' }))}
              className={`pb-4 px-1 border-b-2 font-medium text-sm ${state.viewMode === 'history'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              <div className="flex items-center space-x-2">
                <History className="w-4 h-4" />
                <span>My Check-ins</span>
                {checkins.userCheckins.length > 0 && (
                  <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full text-xs">
                    {checkins.userCheckins.length}
                  </span>
                )}
              </div>
            </button>
          </nav>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={state.viewMode}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {state.viewMode === 'nearby' ? renderNearbyBusinesses() : renderCheckinHistory()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Review Request Modal */}
      {modalState.checkinId && modalState.businessId && (
        <ReviewRequestModal
          isOpen={modalState.isOpen}
          onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))}
          businessId={modalState.businessId}
          businessName={modalState.businessName}
          checkinId={modalState.checkinId}
          onWriteReview={handleWriteReview}
        />
      )}
    </div>
  );
};

export default BusinessCheckinsPage;