// src/services/cityService.ts
import { supabase } from '../lib/supabase'

export interface City {
  id: string
  name: string
  state: string
  tier: 'Tier 1' | 'Tier 2' | 'Tier 3'
  population: number
  is_active: boolean
  created_at: string
}

export interface CitySearchResult {
  id: string
  name: string
  state: string
  tier: string
  displayName: string // "Mumbai, Maharashtra (Tier 1)"
}

export class CityService {
  /**
   * Search for cities by name with optional filters
   */
  static async searchCities(
    query: string, 
    limit: number = 10,
    tier?: string
  ): Promise<CitySearchResult[]> {
    try {
      let queryBuilder = supabase
        .from('cities')
        .select('id, name, state, tier')
        .eq('is_active', true)
        .ilike('name', `%${query}%`)
        .order('tier', { ascending: true }) // Tier 1 cities first
        .order('name', { ascending: true })
        .limit(limit)

      if (tier) {
        queryBuilder = queryBuilder.eq('tier', tier)
      }

      const { data, error } = await queryBuilder

      if (error) {
        console.error('Error searching cities:', error)
        return []
      }

      return (data || []).map(city => ({
        id: city.id,
        name: city.name,
        state: city.state,
        tier: city.tier,
        displayName: `${city.name}, ${city.state} (${city.tier})`
      }))
    } catch (error) {
      console.error('City search error:', error)
      return []
    }
  }

  /**
   * Get popular cities by tier
   */
  static async getPopularCities(tier?: string, limit: number = 20): Promise<CitySearchResult[]> {
    try {
      let queryBuilder = supabase
        .from('cities')
        .select('id, name, state, tier, population')
        .eq('is_active', true)
        .order('population', { ascending: false })
        .limit(limit)

      if (tier) {
        queryBuilder = queryBuilder.eq('tier', tier)
      }

      const { data, error } = await queryBuilder

      if (error) {
        console.error('Error fetching popular cities:', error)
        return this.getFallbackCities()
      }

      return (data || []).map(city => ({
        id: city.id,
        name: city.name,
        state: city.state,
        tier: city.tier,
        displayName: `${city.name}, ${city.state} (${city.tier})`
      }))
    } catch (error) {
      console.error('Popular cities error:', error)
      return this.getFallbackCities()
    }
  }

  /**
   * Get cities by specific tier
   */
  static async getCitiesByTier(tier: 'Tier 1' | 'Tier 2' | 'Tier 3'): Promise<CitySearchResult[]> {
    return this.getPopularCities(tier, 50)
  }

  /**
   * Fallback cities if database is not available
   */
  private static getFallbackCities(): CitySearchResult[] {
    return [
      { id: '1', name: 'Mumbai', state: 'Maharashtra', tier: 'Tier 1', displayName: 'Mumbai, Maharashtra (Tier 1)' },
      { id: '2', name: 'Delhi', state: 'Delhi', tier: 'Tier 1', displayName: 'Delhi, Delhi (Tier 1)' },
      { id: '3', name: 'Bangalore', state: 'Karnataka', tier: 'Tier 1', displayName: 'Bangalore, Karnataka (Tier 1)' },
      { id: '4', name: 'Hyderabad', state: 'Telangana', tier: 'Tier 1', displayName: 'Hyderabad, Telangana (Tier 1)' },
      { id: '5', name: 'Chennai', state: 'Tamil Nadu', tier: 'Tier 1', displayName: 'Chennai, Tamil Nadu (Tier 1)' },
      { id: '6', name: 'Kolkata', state: 'West Bengal', tier: 'Tier 1', displayName: 'Kolkata, West Bengal (Tier 1)' },
      { id: '7', name: 'Pune', state: 'Maharashtra', tier: 'Tier 1', displayName: 'Pune, Maharashtra (Tier 1)' },
      { id: '8', name: 'Ahmedabad', state: 'Gujarat', tier: 'Tier 1', displayName: 'Ahmedabad, Gujarat (Tier 1)' },
      { id: '9', name: 'Jaipur', state: 'Rajasthan', tier: 'Tier 1', displayName: 'Jaipur, Rajasthan (Tier 1)' },
      { id: '10', name: 'Surat', state: 'Gujarat', tier: 'Tier 1', displayName: 'Surat, Gujarat (Tier 1)' },
      { id: '11', name: 'Lucknow', state: 'Uttar Pradesh', tier: 'Tier 2', displayName: 'Lucknow, Uttar Pradesh (Tier 2)' },
      { id: '12', name: 'Kanpur', state: 'Uttar Pradesh', tier: 'Tier 2', displayName: 'Kanpur, Uttar Pradesh (Tier 2)' },
      { id: '13', name: 'Nagpur', state: 'Maharashtra', tier: 'Tier 2', displayName: 'Nagpur, Maharashtra (Tier 2)' },
      { id: '14', name: 'Indore', state: 'Madhya Pradesh', tier: 'Tier 2', displayName: 'Indore, Madhya Pradesh (Tier 2)' },
      { id: '15', name: 'Bhopal', state: 'Madhya Pradesh', tier: 'Tier 2', displayName: 'Bhopal, Madhya Pradesh (Tier 2)' }
    ]
  }

  /**
   * Validate if a city name exists
   */
  static async validateCity(cityName: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('cities')
        .select('id')
        .eq('is_active', true)
        .ilike('name', cityName)
        .limit(1)

      if (error) {
        console.error('City validation error:', error)
        return false
      }

      return (data || []).length > 0
    } catch (error) {
      console.error('City validation error:', error)
      return false
    }
  }
}