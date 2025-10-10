// src/hooks/useCities.ts
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { City } from '../types/location';

// Mock Indian cities data for fallback
const MOCK_CITIES: City[] = [
  // Tier 1 - Metro Cities
  { id: 'city-1', name: 'Mumbai', state: 'Maharashtra', tier: 1, population: 20411000 },
  { id: 'city-2', name: 'Delhi', state: 'Delhi', tier: 1, population: 16787941 },
  { id: 'city-3', name: 'Bangalore', state: 'Karnataka', tier: 1, population: 12765000 },
  { id: 'city-4', name: 'Hyderabad', state: 'Telangana', tier: 1, population: 10004000 },
  { id: 'city-5', name: 'Ahmedabad', state: 'Gujarat', tier: 1, population: 8450000 },
  { id: 'city-6', name: 'Chennai', state: 'Tamil Nadu', tier: 1, population: 10456000 },
  { id: 'city-7', name: 'Kolkata', state: 'West Bengal', tier: 1, population: 14850000 },
  { id: 'city-8', name: 'Pune', state: 'Maharashtra', tier: 1, population: 6430000 },
  
  // Tier 2 - Major Cities
  { id: 'city-9', name: 'Jaipur', state: 'Rajasthan', tier: 2, population: 3046163 },
  { id: 'city-10', name: 'Surat', state: 'Gujarat', tier: 2, population: 6081000 },
  { id: 'city-11', name: 'Lucknow', state: 'Uttar Pradesh', tier: 2, population: 3382000 },
  { id: 'city-12', name: 'Kanpur', state: 'Uttar Pradesh', tier: 2, population: 3067000 },
  { id: 'city-13', name: 'Nagpur', state: 'Maharashtra', tier: 2, population: 2523000 },
  { id: 'city-14', name: 'Indore', state: 'Madhya Pradesh', tier: 2, population: 2521000 },
  { id: 'city-15', name: 'Thane', state: 'Maharashtra', tier: 2, population: 1890000 },
  { id: 'city-16', name: 'Bhopal', state: 'Madhya Pradesh', tier: 2, population: 1883000 },
  { id: 'city-17', name: 'Visakhapatnam', state: 'Andhra Pradesh', tier: 2, population: 2035922 },
  { id: 'city-18', name: 'Patna', state: 'Bihar', tier: 2, population: 2046000 },
  { id: 'city-19', name: 'Vadodara', state: 'Gujarat', tier: 2, population: 1817000 },
  { id: 'city-20', name: 'Ghaziabad', state: 'Uttar Pradesh', tier: 2, population: 1729000 },
  { id: 'city-21', name: 'Ludhiana', state: 'Punjab', tier: 2, population: 1618000 },
  { id: 'city-22', name: 'Agra', state: 'Uttar Pradesh', tier: 2, population: 1585000 },
  { id: 'city-23', name: 'Nashik', state: 'Maharashtra', tier: 2, population: 1562000 },
  { id: 'city-24', name: 'Faridabad', state: 'Haryana', tier: 2, population: 1414000 },
  { id: 'city-25', name: 'Meerut', state: 'Uttar Pradesh', tier: 2, population: 1424000 },
  { id: 'city-26', name: 'Rajkot', state: 'Gujarat', tier: 2, population: 1390933 },
  { id: 'city-27', name: 'Varanasi', state: 'Uttar Pradesh', tier: 2, population: 1435000 },
  { id: 'city-28', name: 'Srinagar', state: 'Jammu and Kashmir', tier: 2, population: 1273312 },
  { id: 'city-29', name: 'Aurangabad', state: 'Maharashtra', tier: 2, population: 1175000 },
  { id: 'city-30', name: 'Dhanbad', state: 'Jharkhand', tier: 2, population: 1162000 },
  
  // Tier 3 - Growing Cities
  { id: 'city-31', name: 'Amritsar', state: 'Punjab', tier: 3, population: 1183000 },
  { id: 'city-32', name: 'Allahabad', state: 'Uttar Pradesh', tier: 3, population: 1117000 },
  { id: 'city-33', name: 'Ranchi', state: 'Jharkhand', tier: 3, population: 1073000 },
  { id: 'city-34', name: 'Howrah', state: 'West Bengal', tier: 3, population: 1077000 },
  { id: 'city-35', name: 'Coimbatore', state: 'Tamil Nadu', tier: 3, population: 1061000 },
  { id: 'city-36', name: 'Jabalpur', state: 'Madhya Pradesh', tier: 3, population: 1055000 },
  { id: 'city-37', name: 'Gwalior', state: 'Madhya Pradesh', tier: 3, population: 1054420 },
  { id: 'city-38', name: 'Vijayawada', state: 'Andhra Pradesh', tier: 3, population: 1048240 },
  { id: 'city-39', name: 'Jodhpur', state: 'Rajasthan', tier: 3, population: 1033918 },
  { id: 'city-40', name: 'Madurai', state: 'Tamil Nadu', tier: 3, population: 1017865 },
  { id: 'city-41', name: 'Raipur', state: 'Chhattisgarh', tier: 3, population: 1010433 },
  { id: 'city-42', name: 'Kota', state: 'Rajasthan', tier: 3, population: 1001694 },
  { id: 'city-43', name: 'Chandigarh', state: 'Chandigarh', tier: 3, population: 1055450 },
  { id: 'city-44', name: 'Guwahati', state: 'Assam', tier: 3, population: 963429 },
  { id: 'city-45', name: 'Solapur', state: 'Maharashtra', tier: 3, population: 951558 },
  { id: 'city-46', name: 'Hubli-Dharwad', state: 'Karnataka', tier: 3, population: 943857 },
  { id: 'city-47', name: 'Mysore', state: 'Karnataka', tier: 3, population: 920550 },
  { id: 'city-48', name: 'Tiruchirappalli', state: 'Tamil Nadu', tier: 3, population: 916857 },
  { id: 'city-49', name: 'Bareilly', state: 'Uttar Pradesh', tier: 3, population: 903668 },
  { id: 'city-50', name: 'Aligarh', state: 'Uttar Pradesh', tier: 3, population: 872575 },
];

export function useCities() {
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCities();
  }, []);

  const fetchCities = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch from database
      const { data, error: fetchError } = await supabase
        .from('cities')
        .select('*')
        .eq('is_active', true)
        .order('population', { ascending: false });

      if (fetchError) throw fetchError;

      if (data && data.length > 0) {
        // Map database tier format ('Tier 1') to numeric (1)
        const mappedCities: City[] = data.map(city => ({
          id: city.id,
          name: city.name,
          state: city.state,
          tier: city.tier === 'Tier 1' ? 1 : city.tier === 'Tier 2' ? 2 : 3,
          latitude: city.latitude,
          longitude: city.longitude,
          population: city.population,
          created_at: city.created_at,
        }));
        setCities(mappedCities);
      } else {
        // Fallback to mock data if table is empty
        console.log('Using mock cities data');
        setCities(MOCK_CITIES);
      }
    } catch (err: any) {
      console.error('Error fetching cities, using mock data:', err);
      setError(err.message);
      // Always fallback to mock data on error
      setCities(MOCK_CITIES);
    } finally {
      setLoading(false);
    }
  };

  const getCitiesByTier = (tier: 1 | 2 | 3): City[] => {
    return cities.filter(city => city.tier === tier);
  };

  const searchCities = (query: string): City[] => {
    const lowerQuery = query.toLowerCase();
    return cities.filter(
      city =>
        city.name.toLowerCase().includes(lowerQuery) ||
        city.state.toLowerCase().includes(lowerQuery)
    );
  };

  const getTierLabel = (tier: 1 | 2 | 3): string => {
    switch (tier) {
      case 1:
        return 'Metro Cities';
      case 2:
        return 'Major Cities';
      case 3:
        return 'Growing Cities';
      default:
        return 'Cities';
    }
  };

  return {
    cities,
    loading,
    error,
    getCitiesByTier,
    searchCities,
    getTierLabel,
    refresh: fetchCities,
  };
}
