// src/hooks/useCheckins.ts
// Comprehensive hook for GPS check-in functionality

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { notifyMerchantCheckin } from '../services/favoriteNotificationService';
import { fetchGpsCheckinRequirement } from '../services/adminSettingsService';

export interface CheckinData {
  id: string;
  business_id: string;
  user_id: string;
  user_latitude: number;
  user_longitude: number;
  distance_from_business: number;
  verified: boolean;
  verification_method: 'gps' | 'qr_code' | 'manual';
  checked_in_at: string;
  business?: {
    id: string;
    business_name: string;
    address: string;
    latitude: number;
    longitude: number;
  };
}

export interface NearbyBusiness {
  id: string;
  business_name: string;
  business_type: string;
  address: string;
  latitude: number;
  longitude: number;
  distance: number;
  total_checkins: number;
  status: string;
  logo_url?: string;
}

export interface LocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  error: string | null;
  isLoading: boolean;
  hasPermission: boolean;
  isSupported: boolean;
}

export interface UseCheckinsReturn {
  // Location state
  location: LocationState;

  // Check-in data
  userCheckins: CheckinData[];
  nearbyBusinesses: NearbyBusiness[];

  // Loading states
  isCheckingIn: boolean;
  isLoadingCheckins: boolean;
  isLoadingNearby: boolean;

  // Functions
  requestLocation: () => Promise<void>;
  performCheckin: (businessId: string) => Promise<CheckinData | null>;
  getNearbyBusinesses: (radiusKm?: number) => Promise<NearbyBusiness[]>;
  getUserCheckins: (limit?: number) => Promise<CheckinData[]>;
  getBusinessCheckins: (businessId: string) => Promise<CheckinData[]>;
  calculateDistance: (lat1: number, lon1: number, lat2: number, lon2: number) => number;
  canCheckIn: (business: NearbyBusiness) => boolean;
  getLastCheckin: (businessId: string) => CheckinData | null;
}

const MAX_CHECKIN_DISTANCE = 100; // meters
const MIN_ACCURACY = process.env.NODE_ENV === 'development' ? 5000 : 200; // 5km for dev, 200m for production
const CHECKIN_COOLDOWN = 60 * 60 * 1000; // 1 hour in milliseconds

export const useCheckins = (): UseCheckinsReturn => {
  const { user } = useAuthStore();

  // Location state
  const [location, setLocation] = useState<LocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    error: null,
    isLoading: false,
    hasPermission: false,
    isSupported: !!navigator.geolocation,
  });

  // Check-in data
  const [userCheckins, setUserCheckins] = useState<CheckinData[]>([]);
  const [nearbyBusinesses, setNearbyBusinesses] = useState<NearbyBusiness[]>([]);

  // Loading states
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isLoadingCheckins, setIsLoadingCheckins] = useState(false);
  const [isLoadingNearby, setIsLoadingNearby] = useState(false);

  // Admin settings state
  const [gpsCheckinRequired, setGpsCheckinRequired] = useState<boolean>(true);

  // Fetch admin settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const required = await fetchGpsCheckinRequirement();
        setGpsCheckinRequired(required);
        if (!required) {
          console.log('⚠️ [useCheckins] GPS Check-in Bypass Enabled (Testing Mode)');
        }
      } catch (error) {
        console.error('Failed to load check-in settings:', error);
      }
    };
    loadSettings();
  }, []);

  // Haversine formula for distance calculation (improved accuracy)
  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180; // φ, λ in radians
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }, []);

  // Request location permission and get current position
  const requestLocation = useCallback(async (): Promise<void> => {
    if (!navigator.geolocation) {
      setLocation(prev => ({
        ...prev,
        error: 'Geolocation is not supported by this browser',
        isSupported: false,
      }));
      return;
    }

    setLocation(prev => ({ ...prev, isLoading: true, error: null }));

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;

          setLocation({
            latitude,
            longitude,
            accuracy,
            error: null,
            isLoading: false,
            hasPermission: true,
            isSupported: true,
          });

          console.log('📍 [useCheckins] Location acquired:', { latitude, longitude, accuracy });
          resolve();
        },
        (error) => {
          let errorMessage = 'Failed to get location';

          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied. Please enable location permissions.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timeout.';
              break;
            default:
              errorMessage = 'An unknown location error occurred.';
              break;
          }

          setLocation(prev => ({
            ...prev,
            error: errorMessage,
            isLoading: false,
            hasPermission: false,
          }));

          console.error('📍 [useCheckins] Location error:', error);
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 300000, // 5 minutes
        }
      );
    });
  }, []);

  // Get nearby businesses within specified radius
  const getNearbyBusinesses = useCallback(async (radiusKm: number = 5): Promise<NearbyBusiness[]> => {
    if (!location.latitude || !location.longitude) {
      throw new Error('Location not available');
    }

    setIsLoadingNearby(true);

    try {
      const { data, error } = await supabase.rpc('nearby_businesses', {
        user_lat: location.latitude,
        user_lng: location.longitude,
        radius_km: radiusKm,
        result_limit: 50,
      });

      if (error) {
        console.error('Error fetching nearby businesses:', error);

        // Fallback: manual distance calculation
        const { data: businesses, error: fallbackError } = await supabase
          .from('businesses')
          .select(`
            id,
            business_name,
            business_type,
            address,
            latitude,
            longitude,
            total_checkins,
            status,
            logo_url
          `)
          .eq('status', 'active')
          .not('latitude', 'is', null)
          .not('longitude', 'is', null);

        if (fallbackError) throw fallbackError;

        const nearbyWithDistance = businesses
          .map(business => ({
            ...business,
            distance: calculateDistance(
              location.latitude!,
              location.longitude!,
              business.latitude,
              business.longitude
            ),
          }))
          .filter(business => business.distance <= radiusKm * 1000)
          .sort((a, b) => a.distance - b.distance);

        setNearbyBusinesses(nearbyWithDistance);
        return nearbyWithDistance;
      }

      // Add distance to each business
      const businessesWithDistance = data.map(business => ({
        ...business,
        distance: calculateDistance(
          location.latitude!,
          location.longitude!,
          business.latitude,
          business.longitude
        ),
      }));

      setNearbyBusinesses(businessesWithDistance);
      return businessesWithDistance;
    } catch (error) {
      console.error('Error getting nearby businesses:', error);
      toast.error('Failed to load nearby businesses');
      return [];
    } finally {
      setIsLoadingNearby(false);
    }
  }, [location.latitude, location.longitude, calculateDistance]);

  // Check if user can check in to a business
  const canCheckIn = useCallback((business: NearbyBusiness): boolean => {
    // If GPS check-in is NOT required (Bypass Mode), allow check-in regardless of distance
    if (!gpsCheckinRequired) {
      return true;
    }

    // Check distance
    if (business.distance > MAX_CHECKIN_DISTANCE) {
      return false;
    }

    // Check location accuracy
    if (location.accuracy && location.accuracy > MIN_ACCURACY) {
      return false;
    }

    // Check cooldown period
    const lastCheckin = getLastCheckin(business.id);
    if (lastCheckin) {
      const timeSinceLastCheckin = Date.now() - new Date(lastCheckin.checked_in_at).getTime();
      if (timeSinceLastCheckin < CHECKIN_COOLDOWN) {
        return false;
      }
    }

    return true;
  }, [location.accuracy, gpsCheckinRequired]);

  // Get last check-in for a business
  const getLastCheckin = useCallback((businessId: string): CheckinData | null => {
    return userCheckins
      .filter(checkin => checkin.business_id === businessId)
      .sort((a, b) => new Date(b.checked_in_at).getTime() - new Date(a.checked_in_at).getTime())[0] || null;
  }, [userCheckins]);

  // Perform check-in
  const performCheckin = useCallback(async (businessId: string, businessOverride?: any): Promise<CheckinData | null> => {
    if (!user?.id) {
      toast.error('Please log in to check in');
      return null;
    }

    // Find the business
    let business = nearbyBusinesses.find(b => b.id === businessId);

    // If not found in nearby list but we have an override (e.g. from Business Profile page)
    if (!business && businessOverride) {
      // Calculate distance for the override
      const dist = (location.latitude && location.longitude && businessOverride.latitude && businessOverride.longitude)
        ? calculateDistance(
          location.latitude,
          location.longitude,
          businessOverride.latitude,
          businessOverride.longitude
        )
        : 0;

      business = {
        ...businessOverride,
        distance: dist
      } as NearbyBusiness;
    }

    if (!business) {
      // If still no business (and no override provided or valid), try fetching it? 
      // For now, rely on override. 
      // Actually, if we are in BusinessProfile, we SHOULD pass the override.
      // If we are in "Nearby" list, it should be in nearbyBusinesses.
      toast.error('Business not found (GPS info missing)');
      return null;
    }

    // Check GPS requirement
    const requireGps = gpsCheckinRequired;

    // Check if user can check in (only if GPS is required)
    if (requireGps) {
      if (!location.latitude || !location.longitude) {
        toast.error('Location not available');
        return null;
      }

      if (!canCheckIn(business)) {
        if (business.distance > MAX_CHECKIN_DISTANCE) {
          toast.error(`You're too far from ${business.business_name}. Please get closer to check in.`);
        } else {
          toast.error(`You've already checked in recently. Please wait before checking in again.`);
        }
        return null;
      }
    } else {
      console.warn('⚠️ GPS check-in bypass enabled (Testing Mode) - Skipping distance check');
    }

    setIsCheckingIn(true);

    try {
      // Calculate distance if we have location, otherwise default to 0 for bypass
      const distance = (location.latitude && location.longitude) ? calculateDistance(
        location.latitude,
        location.longitude,
        business.latitude,
        business.longitude
      ) : 0;

      const checkinData = {
        business_id: businessId,
        user_id: user.id,
        user_latitude: location.latitude || 0, // Default for bypass
        user_longitude: location.longitude || 0, // Default for bypass
        distance_from_business: distance,
        verified: requireGps ? distance <= MAX_CHECKIN_DISTANCE : true, // Always verified if bypass enabled
        verification_method: requireGps ? 'gps' : 'manual',
      };

      const { data, error } = await supabase
        .from('business_checkins')
        .insert([checkinData])
        .select(`
          *,
          business:businesses (
            id,
            business_name,
            address,
            latitude,
            longitude
          )
        `)
        .single();

      if (error) throw error;

      // Update business check-in count
      await supabase
        .from('businesses')
        .update({
          total_checkins: (business.total_checkins || 0) + 1
        })
        .eq('id', businessId);

      // Update local state
      setUserCheckins(prev => [data, ...prev]);
      setNearbyBusinesses(prev =>
        prev.map(b =>
          b.id === businessId
            ? { ...b, total_checkins: (b.total_checkins || 0) + 1 }
            : b
        )
      );

      toast.success(`Successfully checked in to ${business.business_name}! 🎉`);

      // Send notification to merchant (non-blocking)
      notifyMerchantCheckin(
        businessId,
        user.id,
        business.business_name
      ).catch(err => console.error('Failed to send check-in notification:', err));

      // Analytics tracking
      if (typeof window.gtag !== 'undefined') {
        window.gtag('event', 'check_in', {
          event_category: 'engagement',
          event_label: business.business_name,
          business_type: business.business_type,
          distance: Math.round(distance),
        });
      }

      return data;
    } catch (error) {
      console.error('Check-in error:', error);
      toast.error('Failed to check in. Please try again.');
      return null;
    } finally {
      setIsCheckingIn(false);
    }
  }, [user?.id, location.latitude, location.longitude, nearbyBusinesses, canCheckIn, calculateDistance, gpsCheckinRequired]);

  // Get user's check-in history
  const getUserCheckins = useCallback(async (limit: number = 20): Promise<CheckinData[]> => {
    if (!user?.id) return [];

    setIsLoadingCheckins(true);

    try {
      const { data, error } = await supabase
        .from('business_checkins')
        .select(`
          *,
          business:businesses (
            id,
            business_name,
            address,
            latitude,
            longitude
          )
        `)
        .eq('user_id', user.id)
        .order('checked_in_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      setUserCheckins(data || []);
      return data || [];
    } catch (error) {
      console.error('Error fetching user check-ins:', error);
      toast.error('Failed to load check-in history');
      return [];
    } finally {
      setIsLoadingCheckins(false);
    }
  }, [user?.id]);

  // Get check-ins for a specific business (for business owners)
  const getBusinessCheckins = useCallback(async (businessId: string): Promise<CheckinData[]> => {
    try {
      const { data, error } = await supabase
        .from('business_checkins')
        .select(`
          *,
          business:businesses (
            id,
            business_name,
            address,
            latitude,
            longitude
          )
        `)
        .eq('business_id', businessId)
        .order('checked_in_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching business check-ins:', error);
      return [];
    }
  }, []);

  // Load user check-ins on mount
  useEffect(() => {
    if (user?.id) {
      getUserCheckins();
    }
  }, [user?.id, getUserCheckins]);

  return {
    location,
    userCheckins,
    nearbyBusinesses,
    isCheckingIn,
    isLoadingCheckins,
    isLoadingNearby,
    requestLocation,
    performCheckin,
    getNearbyBusinesses,
    getUserCheckins,
    getBusinessCheckins,
    calculateDistance,
    canCheckIn,
    getLastCheckin,
  };
};

export default useCheckins;