// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Check if we have valid Supabase credentials
if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder') || supabaseAnonKey.includes('placeholder')) {
  console.warn('⚠️ Supabase credentials not configured. Some features will not work.')
  console.warn('📋 Follow SUPABASE_SETUP_GUIDE.md to set up your database')
}

// Create client with fallback values to prevent errors
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder-key'
)

// Database types
export interface SocialLinks {
  twitter?: string
  linkedin?: string
  instagram?: string
  facebook?: string
  github?: string
}

export interface Profile {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  bio?: string
  city: string
  location?: string // Full address/location
  interests: string[]
  phone?: string
  website?: string
  social_links?: SocialLinks
  date_of_birth?: string
  role?: 'customer' | 'business_owner' | 'admin'
  is_driver?: boolean
  driver_score?: number
  profile_completion?: number // Percentage 0-100
  created_at: string
  updated_at: string
}

export interface AuthUser {
  id: string
  email: string
  user_metadata: {
    full_name?: string
    avatar_url?: string
  }
  created_at: string
}