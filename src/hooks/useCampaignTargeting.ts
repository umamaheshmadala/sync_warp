// src/hooks/useCampaignTargeting.ts
// Hook for managing campaign targeting options and calculating estimated reach

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

export interface TargetingFilters {
  targetFollowers: boolean;
  ageRange?: { min: number; max: number };
  gender?: 'all' | 'male' | 'female' | 'other';
  cities?: string[];
  interests?: string[];
}

export interface ReachEstimate {
  totalReach: number;
  followerReach: number;
  publicReach: number;
  breakdown: {
    ageGroups: Record<string, number>;
    cities: Record<string, number>;
    genders: Record<string, number>;
  };
}

interface UseCampaignTargetingResult {
  filters: TargetingFilters;
  reach: ReachEstimate | null;
  loading: boolean;
  updateFilters: (updates: Partial<TargetingFilters>) => void;
  calculateReach: () => Promise<void>;
  resetFilters: () => void;
}

const defaultFilters: TargetingFilters = {
  targetFollowers: false,
  gender: 'all',
  cities: [],
  interests: [],
};

export const useCampaignTargeting = (businessId: string): UseCampaignTargetingResult => {
  const [filters, setFilters] = useState<TargetingFilters>(defaultFilters);
  const [reach, setReach] = useState<ReachEstimate | null>(null);
  const [loading, setLoading] = useState(false);

  const updateFilters = useCallback((updates: Partial<TargetingFilters>) => {
    setFilters(prev => ({ ...prev, ...updates }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
    setReach(null);
  }, []);

  const calculateReach = useCallback(async () => {
    if (!businessId) {
      toast.error('Business ID is required');
      return;
    }

    setLoading(true);
    try {
      let followerReach = 0;
      let publicReach = 0;
      const breakdown = {
        ageGroups: {} as Record<string, number>,
        cities: {} as Record<string, number>,
        genders: {} as Record<string, number>,
      };

      // Calculate follower reach if targeting followers
      if (filters.targetFollowers) {
        // Get business followers
        const { data: followers, error: followersError } = await supabase
          .from('business_followers')
          .select(`
            user_id,
            users:user_id (
              id,
              age,
              gender,
              city
            )
          `)
          .eq('business_id', businessId)
          .eq('is_active', true);

        if (followersError) throw followersError;

        // Filter followers based on criteria
        const filteredFollowers = followers?.filter(follower => {
          const user = follower.users as any;
          if (!user) return false;

          // Age filter
          if (filters.ageRange) {
            const age = user.age;
            if (age < filters.ageRange.min || age > filters.ageRange.max) {
              return false;
            }
          }

          // Gender filter
          if (filters.gender && filters.gender !== 'all') {
            if (user.gender !== filters.gender) {
              return false;
            }
          }

          // City filter
          if (filters.cities && filters.cities.length > 0) {
            if (!user.city || !filters.cities.includes(user.city)) {
              return false;
            }
          }

          return true;
        }) || [];

        followerReach = filteredFollowers.length;

        // Build breakdown
        filteredFollowers.forEach(follower => {
          const user = follower.users as any;
          
          // Age groups
          const age = user.age || 0;
          let ageGroup = '65+';
          if (age < 18) ageGroup = '13-17';
          else if (age < 25) ageGroup = '18-24';
          else if (age < 35) ageGroup = '25-34';
          else if (age < 45) ageGroup = '35-44';
          else if (age < 55) ageGroup = '45-54';
          else if (age < 65) ageGroup = '55-64';
          
          breakdown.ageGroups[ageGroup] = (breakdown.ageGroups[ageGroup] || 0) + 1;

          // Cities
          if (user.city) {
            breakdown.cities[user.city] = (breakdown.cities[user.city] || 0) + 1;
          }

          // Genders
          const gender = user.gender || 'other';
          breakdown.genders[gender] = (breakdown.genders[gender] || 0) + 1;
        });
      } else {
        // Calculate public reach (all users matching criteria)
        let query = supabase
          .from('users')
          .select('id, age, gender, city', { count: 'exact' });

        // Apply age filter
        if (filters.ageRange) {
          query = query
            .gte('age', filters.ageRange.min)
            .lte('age', filters.ageRange.max);
        }

        // Apply gender filter
        if (filters.gender && filters.gender !== 'all') {
          query = query.eq('gender', filters.gender);
        }

        // Apply city filter
        if (filters.cities && filters.cities.length > 0) {
          query = query.in('city', filters.cities);
        }

        const { data, count, error } = await query;

        if (error) throw error;

        publicReach = count || 0;

        // Build breakdown for public reach
        data?.forEach(user => {
          // Age groups
          const age = user.age || 0;
          let ageGroup = '65+';
          if (age < 18) ageGroup = '13-17';
          else if (age < 25) ageGroup = '18-24';
          else if (age < 35) ageGroup = '25-34';
          else if (age < 45) ageGroup = '35-44';
          else if (age < 55) ageGroup = '45-54';
          else if (age < 65) ageGroup = '55-64';
          
          breakdown.ageGroups[ageGroup] = (breakdown.ageGroups[ageGroup] || 0) + 1;

          // Cities
          if (user.city) {
            breakdown.cities[user.city] = (breakdown.cities[user.city] || 0) + 1;
          }

          // Genders
          const gender = user.gender || 'other';
          breakdown.genders[gender] = (breakdown.genders[gender] || 0) + 1;
        });
      }

      const totalReach = filters.targetFollowers ? followerReach : publicReach;

      setReach({
        totalReach,
        followerReach,
        publicReach,
        breakdown,
      });
    } catch (err) {
      console.error('Error calculating reach:', err);
      toast.error('Failed to calculate reach estimate');
      setReach(null);
    } finally {
      setLoading(false);
    }
  }, [businessId, filters]);

  // Auto-calculate reach when filters change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      calculateReach();
    }, 500); // Debounce for 500ms

    return () => clearTimeout(timeoutId);
  }, [filters, calculateReach]);

  return {
    filters,
    reach,
    loading,
    updateFilters,
    calculateReach,
    resetFilters,
  };
};

export default useCampaignTargeting;
