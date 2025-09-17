// src/store/authStore.ts
import { create } from 'zustand'
import { supabase, Profile, AuthUser } from '../lib/supabase'

interface AuthState {
  user: AuthUser | null
  profile: Profile | null
  loading: boolean
  initialized: boolean
  error: string | null
  
  // Actions
  signUp: (email: string, password: string, userData?: any) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<void>
  checkUser: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  initialized: false,
  error: null,

  signUp: async (email: string, password: string, userData = {}) => {
    set({ loading: true })
    
    try {
      // Check if Supabase is properly configured
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      
      if (!supabaseUrl || !supabaseAnonKey || 
          supabaseUrl.includes('placeholder') || supabaseAnonKey.includes('placeholder')) {
        throw new Error('Supabase not configured. Please follow SUPABASE_SETUP_GUIDE.md to set up your database.')
      }
      
      // Add timeout to prevent hanging requests
      const signupPromise = supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      })
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout. Please check your connection.')), 30000) // 30 second timeout
      })
      
      const { data, error } = await Promise.race([signupPromise, timeoutPromise]) as any
      
      if (error) {
        console.error('Supabase signup error:', error)
        throw error
      }
      
      if (data.user) {
        set({ user: data.user as AuthUser })
        
        // Create user profile in the database
        // Note: This will be triggered by the auth state change event
        // but we can also create it explicitly here if needed
        try {
          const profileData = {
            id: data.user.id,
            email: data.user.email || email,
            full_name: userData.full_name || '',
            city: '', // Will be filled in onboarding
            interests: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
          
          // Insert profile with timeout
          const profilePromise = supabase
            .from('profiles')
            .insert(profileData)
          
          const profileTimeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Profile creation timeout')), 10000) // 10 second timeout
          })
          
          const { error: profileError } = await Promise.race([profilePromise, profileTimeoutPromise]) as any
          
          // Don't throw on profile creation error as it might already exist
          if (profileError && !profileError.message?.includes('duplicate key')) {
            console.warn('Profile creation warning:', profileError)
          }
          
        } catch (profileError) {
          console.warn('Profile creation failed (might already exist):', profileError)
          // Don't fail the entire signup process for profile creation errors
        }
      }
    } catch (error: any) {
      console.error('Sign up error:', error)
      
      // Transform Supabase errors to user-friendly messages
      if (error.message?.includes('User already registered') || error.message?.includes('already been registered')) {
        throw new Error('already registered')
      } else if (error.message?.includes('Password') || error.message?.includes('password')) {
        throw new Error('Password does not meet requirements')
      } else if (error.message?.includes('Invalid') || error.message?.includes('invalid')) {
        throw new Error('Invalid email address')
      } else if (error.message?.includes('Supabase not configured')) {
        throw error // Pass through configuration errors
      } else if (error.message?.includes('timeout') || error.message?.includes('network')) {
        throw new Error('Network error. Please check your connection and try again.')
      } else {
        throw new Error(error.message || 'Failed to create account. Please try again.')
      }
    } finally {
      // Always ensure loading is set to false
      set({ loading: false })
    }
  },

  signIn: async (email: string, password: string) => {
    set({ loading: true })
    
    try {
      // Check if Supabase is properly configured
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      
      if (!supabaseUrl || !supabaseAnonKey || 
          supabaseUrl.includes('placeholder') || supabaseAnonKey.includes('placeholder')) {
        throw new Error('Supabase not configured. Please follow SUPABASE_SETUP_GUIDE.md to set up your database.')
      }
      
      // Add timeout to prevent hanging requests
      const signinPromise = supabase.auth.signInWithPassword({
        email,
        password
      })
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout. Please check your connection.')), 30000) // 30 second timeout
      })
      
      const { data, error } = await Promise.race([signinPromise, timeoutPromise]) as any
      
      if (error) {
        console.error('Supabase signin error:', error)
        throw error
      }
      
      if (data.user) {
        set({ user: data.user as AuthUser })
        
        // Fetch profile after successful login with timeout
        try {
          const profilePromise = get().checkUser()
          const profileTimeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Profile fetch timeout')), 10000) // 10 second timeout
          })
          
          await Promise.race([profilePromise, profileTimeoutPromise])
        } catch (profileError) {
          console.warn('Profile fetch failed, but signin was successful:', profileError)
          // Don't fail the entire signin process for profile fetch errors
        }
      }
    } catch (error: any) {
      console.error('Sign in error:', error)
      
      // Transform Supabase errors to user-friendly messages
      if (error.message?.includes('Invalid login credentials') || error.message?.includes('invalid')) {
        throw new Error('Invalid email or password')
      } else if (error.message?.includes('Supabase not configured')) {
        throw error // Pass through configuration errors
      } else if (error.message?.includes('timeout') || error.message?.includes('network')) {
        throw new Error('Network error. Please check your connection and try again.')
      } else if (error.message?.includes('Too many requests')) {
        throw new Error('Too many login attempts. Please wait a moment and try again.')
      } else {
        throw new Error(error.message || 'Login failed. Please try again.')
      }
    } finally {
      // Always ensure loading is set to false
      set({ loading: false })
    }
  },

  signOut: async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      set({ user: null, profile: null })
    } catch (error) {
      console.error('Sign out error:', error)
      throw error
    }
  },

  updateProfile: async (updates: Partial<Profile>) => {
    const { user } = get()
    if (!user) throw new Error('No user found')

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single()

      if (error) throw error
      
      set({ profile: data })
    } catch (error) {
      console.error('Update profile error:', error)
      throw error
    }
  },

  checkUser: async () => {
    try {
      // Check if Supabase is properly configured
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      
      if (!supabaseUrl || !supabaseAnonKey || 
          supabaseUrl.includes('placeholder') || supabaseAnonKey.includes('placeholder')) {
        console.warn('Supabase not configured. Skipping user check.')
        set({ loading: false })
        return
      }
      
      // Add timeout to user check
      const userCheckPromise = supabase.auth.getUser()
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('User check timeout')), 15000) // 15 second timeout
      })
      
      const { data: { user } } = await Promise.race([userCheckPromise, timeoutPromise]) as any
      
      if (user) {
        set({ user: user as AuthUser })
        
        // Fetch user profile with timeout
        try {
          const profilePromise = supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()
          
          const profileTimeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Profile fetch timeout')), 10000) // 10 second timeout
          })
          
          const { data: profile } = await Promise.race([profilePromise, profileTimeoutPromise]) as any
          
          if (profile) {
            set({ profile })
          }
        } catch (profileError) {
          console.warn('Profile fetch failed during user check:', profileError)
          // Don't fail the entire user check for profile errors
        }
      }
    } catch (error: any) {
      console.error('Check user error:', error)
      // Don't throw error for user check failures, just log them
      if (error.message?.includes('timeout')) {
        console.warn('User check timed out - continuing without user data')
      }
    } finally {
      set({ loading: false, initialized: true })
    }
  },

  clearError: () => {
    set({ error: null })
  }
}))

// Initialize auth state on app start
try {
  // Only initialize if Supabase is properly configured
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
    // Set up auth state change listener
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        useAuthStore.getState().checkUser()
      } else if (event === 'SIGNED_OUT') {
        useAuthStore.setState({ user: null, profile: null, loading: false })
      }
    })
    
    // CRITICAL: Call checkUser immediately to set loading to false
    // This prevents buttons from being stuck in loading state on app start
    useAuthStore.getState().checkUser()
  } else {
    // If Supabase is not configured, set loading to false immediately
    useAuthStore.setState({ loading: false, initialized: true, error: 'Supabase not configured' })
  }
} catch (error) {
  console.warn('Supabase auth initialization skipped:', error)
  // Ensure loading is set to false even if initialization fails
  useAuthStore.setState({ loading: false, initialized: true, error: 'Auth initialization failed' })
}
