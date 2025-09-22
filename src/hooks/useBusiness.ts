// useBusiness.js
// Custom hook for managing business-related data and operations

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { toast } from 'react-hot-toast';

// TypeScript interfaces
interface Business {
  id: string;
  user_id: string;
  business_name: string;
  business_type: string;
  description: string;
  business_email?: string;
  business_phone?: string;
  address: string;
  city: string;
  state: string;
  postal_code?: string;
  country: string;
  latitude?: number;
  longitude?: number;
  operating_hours: Record<string, any>;
  holidays: any[];
  categories: string[];
  tags: string[];
  logo_url?: string;
  cover_image_url?: string;
  gallery_images: string[];
  status: 'pending' | 'active' | 'suspended' | 'inactive';
  verified: boolean;
  verified_at?: string;
  website_url?: string;
  social_media: Record<string, string>;
  average_rating: number;
  total_reviews: number;
  total_checkins: number;
  created_at: string;
  updated_at: string;
}

interface BusinessCategory {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  icon_name?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export const useBusiness = (businessId: string | null = null) => {
  const { user } = useAuthStore();
  const [business, setBusiness] = useState<Business | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch single business
  const fetchBusiness = async (id) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('businesses')
        .select(`
          *,
          business_categories(*)
        `)
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      
      setBusiness(data);
      return data;
    } catch (err) {
      console.error('Error fetching business:', err);
      setError(err.message);
      toast.error('Failed to load business');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Fetch user's businesses
  const fetchUserBusinesses = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('businesses')
        .select(`
          *,
          business_categories(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      
      setBusinesses(data || []);
      return data;
    } catch (err) {
      console.error('Error fetching businesses:', err);
      setError(err.message);
      toast.error('Failed to load businesses');
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Create new business
  const createBusiness = async (businessData) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: createError } = await supabase
        .from('businesses')
        .insert([{
          ...businessData,
          user_id: user.id
        }])
        .select()
        .single();

      if (createError) throw createError;
      
      setBusiness(data);
      // Refresh user's businesses list
      fetchUserBusinesses();
      
      toast.success('Business registered successfully!');
      return data;
    } catch (err) {
      console.error('Error creating business:', err);
      setError(err.message);
      toast.error('Failed to register business');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Update business
  const updateBusiness = async (id, updates) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: updateError } = await supabase
        .from('businesses')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', user.id) // Ensure user can only update their own business
        .select()
        .single();

      if (updateError) throw updateError;
      
      setBusiness(data);
      
      toast.success('Business updated successfully!');
      return data;
    } catch (err) {
      console.error('Error updating business:', err);
      setError(err.message);
      toast.error('Failed to update business');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Delete business
  const deleteBusiness = async (id) => {
    try {
      setLoading(true);
      setError(null);

      const { error: deleteError } = await supabase
        .from('businesses')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id); // Ensure user can only delete their own business

      if (deleteError) throw deleteError;
      
      setBusiness(null);
      // Refresh user's businesses list
      fetchUserBusinesses();
      
      toast.success('Business deleted successfully!');
      return true;
    } catch (err) {
      console.error('Error deleting business:', err);
      setError(err.message);
      toast.error('Failed to delete business');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Get business statistics
  const getBusinessStats = async (id) => {
    try {
      // Fetch reviews and check-ins for the business
      const [reviewsResult, checkinsResult] = await Promise.all([
        supabase
          .from('business_reviews')
          .select('recommendation')
          .eq('business_id', id)
          .eq('status', 'active'),
        
        supabase
          .from('business_checkins')
          .select('id')
          .eq('business_id', id)
      ]);

      const reviews = reviewsResult.data || [];
      const checkins = checkinsResult.data || [];

      // Calculate stats
      const totalReviews = reviews.length;
      const recommendedReviews = reviews.filter(r => r.recommendation === true).length;
      const recommendationPercentage = totalReviews > 0 
        ? Math.round((recommendedReviews / totalReviews) * 100) 
        : 0;
      
      return {
        totalReviews,
        recommendedReviews,
        notRecommendedReviews: totalReviews - recommendedReviews,
        recommendationPercentage,
        totalCheckins: checkins.length
      };
    } catch (err) {
      console.error('Error fetching business stats:', err);
      return {
        totalReviews: 0,
        recommendedReviews: 0,
        notRecommendedReviews: 0,
        recommendationPercentage: 0,
        totalCheckins: 0
      };
    }
  };

  // Effect to load data based on businessId
  useEffect(() => {
    if (businessId) {
      fetchBusiness(businessId);
    } else if (user) {
      fetchUserBusinesses();
    }
  }, [businessId, user]);

  // Return hook interface
  return {
    // State
    business,
    businesses,
    loading,
    error,

    // Actions
    fetchBusiness,
    fetchUserBusinesses,
    createBusiness,
    updateBusiness,
    deleteBusiness,
    getBusinessStats,

    // Utilities
    refetch: businessId ? () => fetchBusiness(businessId) : fetchUserBusinesses
  };
};

// Hook for managing business categories
export const useBusinessCategories = () => {
  const [categories, setCategories] = useState<BusinessCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('business_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (fetchError) throw fetchError;
      
      setCategories(data || []);
      return data;
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  return {
    categories,
    loading,
    error,
    refetch: fetchCategories
  };
};

export default useBusiness;