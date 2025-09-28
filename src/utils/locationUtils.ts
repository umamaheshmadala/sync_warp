// src/utils/locationUtils.ts
// Utilities for working with coordinates, calculating distances, and formatting location data

import { LocationCoords } from '../hooks/useGeolocation';

export interface DistanceResult {
  meters: number;
  kilometers: number;
  miles: number;
  formatted: string;
}

/**
 * Calculate the distance between two points using the Haversine formula
 * Returns distance in meters
 */
export function calculateDistance(
  point1: LocationCoords,
  point2: LocationCoords
): number {
  const R = 6371000; // Earth's radius in meters
  
  const lat1Rad = toRadians(point1.latitude);
  const lat2Rad = toRadians(point2.latitude);
  const deltaLatRad = toRadians(point2.latitude - point1.latitude);
  const deltaLngRad = toRadians(point2.longitude - point1.longitude);
  
  const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) *
    Math.sin(deltaLngRad / 2) * Math.sin(deltaLngRad / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

/**
 * Calculate distance with all units and formatted display
 */
export function getDistanceData(
  point1: LocationCoords,
  point2: LocationCoords,
  unit: 'metric' | 'imperial' = 'metric'
): DistanceResult {
  const meters = calculateDistance(point1, point2);
  const kilometers = meters / 1000;
  const miles = kilometers * 0.621371;
  
  let formatted: string;
  
  if (unit === 'imperial') {
    if (miles < 0.1) {
      formatted = `${Math.round(meters * 3.28084)} ft`;
    } else if (miles < 1) {
      formatted = `${(miles * 5280).toFixed(0)} ft`;
    } else {
      formatted = `${miles.toFixed(1)} mi`;
    }
  } else {
    if (meters < 1000) {
      formatted = `${Math.round(meters)} m`;
    } else if (kilometers < 10) {
      formatted = `${kilometers.toFixed(1)} km`;
    } else {
      formatted = `${Math.round(kilometers)} km`;
    }
  }
  
  return {
    meters,
    kilometers,
    miles,
    formatted,
  };
}

/**
 * Format distance for display
 */
export function formatDistance(
  distanceInMeters: number,
  unit: 'metric' | 'imperial' = 'metric'
): string {
  const kilometers = distanceInMeters / 1000;
  const miles = kilometers * 0.621371;
  
  if (unit === 'imperial') {
    if (miles < 0.1) {
      return `${Math.round(distanceInMeters * 3.28084)} ft`;
    } else if (miles < 1) {
      return `${(miles * 5280).toFixed(0)} ft`;
    } else {
      return `${miles.toFixed(1)} mi`;
    }
  } else {
    if (distanceInMeters < 1000) {
      return `${Math.round(distanceInMeters)} m`;
    } else if (kilometers < 10) {
      return `${kilometers.toFixed(1)} km`;
    } else {
      return `${Math.round(kilometers)} km`;
    }
  }
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees
 */
export function toDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Check if coordinates are valid
 */
export function isValidCoordinates(coords: LocationCoords): boolean {
  return (
    typeof coords.latitude === 'number' &&
    typeof coords.longitude === 'number' &&
    !isNaN(coords.latitude) &&
    !isNaN(coords.longitude) &&
    coords.latitude >= -90 &&
    coords.latitude <= 90 &&
    coords.longitude >= -180 &&
    coords.longitude <= 180
  );
}

/**
 * Get the bearing (direction) from one point to another in degrees
 */
export function getBearing(from: LocationCoords, to: LocationCoords): number {
  const lat1Rad = toRadians(from.latitude);
  const lat2Rad = toRadians(to.latitude);
  const deltaLngRad = toRadians(to.longitude - from.longitude);
  
  const y = Math.sin(deltaLngRad) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(deltaLngRad);
    
  const bearingRad = Math.atan2(y, x);
  const bearingDeg = (toDegrees(bearingRad) + 360) % 360;
  
  return bearingDeg;
}

/**
 * Get compass direction from bearing
 */
export function getCompassDirection(bearing: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(bearing / 22.5) % 16;
  return directions[index];
}

/**
 * Create a bounding box around a point for proximity searches
 */
export function createBoundingBox(
  center: LocationCoords,
  radiusInKm: number
): {
  north: number;
  south: number;
  east: number;
  west: number;
} {
  const lat = center.latitude;
  const lng = center.longitude;
  
  // Approximate conversions (good enough for small distances)
  const latChange = radiusInKm / 111.32; // 1 degree lat ≈ 111.32 km
  const lngChange = radiusInKm / (111.32 * Math.cos(toRadians(lat))); // Adjust for longitude
  
  return {
    north: lat + latChange,
    south: lat - latChange,
    east: lng + lngChange,
    west: lng - lngChange,
  };
}

/**
 * Sort array of items by distance from a reference point
 */
export function sortByDistance<T>(
  items: T[],
  getCoords: (item: T) => LocationCoords | null,
  referencePoint: LocationCoords,
  ascending: boolean = true
): T[] {
  return items
    .map(item => ({
      item,
      coords: getCoords(item),
    }))
    .filter(({ coords }) => coords !== null)
    .map(({ item, coords }) => ({
      item,
      distance: calculateDistance(referencePoint, coords!),
    }))
    .sort((a, b) => ascending ? a.distance - b.distance : b.distance - a.distance)
    .map(({ item }) => item);
}

/**
 * Filter items within a certain radius
 */
export function filterByRadius<T>(
  items: T[],
  getCoords: (item: T) => LocationCoords | null,
  center: LocationCoords,
  radiusInMeters: number
): T[] {
  return items.filter(item => {
    const coords = getCoords(item);
    if (!coords) return false;
    
    const distance = calculateDistance(center, coords);
    return distance <= radiusInMeters;
  });
}

/**
 * Get user's preferred distance unit based on locale
 */
export function getPreferredDistanceUnit(): 'metric' | 'imperial' {
  const locale = navigator.language || 'en-US';
  const imperialLocales = ['en-US', 'en-LR', 'en-MM'];
  
  return imperialLocales.some(l => locale.startsWith(l.split('-')[0])) ? 'imperial' : 'metric';
}

/**
 * Format coordinates for display
 */
export function formatCoordinates(
  coords: LocationCoords,
  precision: number = 4
): string {
  const lat = coords.latitude.toFixed(precision);
  const lng = coords.longitude.toFixed(precision);
  return `${lat}, ${lng}`;
}

/**
 * Get approximate address from coordinates (requires reverse geocoding service)
 * This is a placeholder - in a real app, you'd integrate with a geocoding service
 */
export async function reverseGeocode(coords: LocationCoords): Promise<string | null> {
  try {
    // This would integrate with a real geocoding service like Google Maps, MapBox, etc.
    // For now, return a formatted coordinate string
    return formatCoordinates(coords);
  } catch (error) {
    console.warn('Reverse geocoding failed:', error);
    return null;
  }
}