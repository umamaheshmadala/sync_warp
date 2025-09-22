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
  // Password reset methods
  forgotPassword: (email: string) => Promise<void>
  resetPassword: (password: string) => Promise<void>
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
      // First, try to update existing profile
      const { data: updatedData, error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single()

      if (updateError) {
        // If no rows were affected (profile doesn't exist), create a new one
        if (updateError.code === 'PGRST116') {
          console.log('Profile not found, creating new profile...')
          
          // Ensure city is never empty or null
          const safeUpdates = {
            ...updates,
            city: updates.city || 'Unknown'
          }
          
          const profileData = {
            id: user.id,
            email: user.email || '',
            full_name: user.user_metadata?.full_name,
            role: 'customer' as const,
            is_driver: false,
            driver_score: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            // Default values
            interests: [],
            // Apply safe updates (includes city)
            ...safeUpdates
          }
          
          const { data: newData, error: insertError } = await supabase
            .from('profiles')
            .insert(profileData)
            .select()
            .single()

          if (insertError) {
            console.error('Insert profile error:', insertError)
            throw new Error(`Failed to create profile: ${insertError.message}`)
          }
          
          set({ profile: newData })
          return newData
        } else {
          console.error('Update profile error:', updateError)
          throw new Error(`Failed to update profile: ${updateError.message}`)
        }
      }
      
      set({ profile: updatedData })
      return updatedData
    } catch (error: any) {
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
  },

  forgotPassword: async (email: string) => {
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
      const resetPromise = supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      })
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout. Please check your connection.')), 30000) // 30 second timeout
      })
      
      const { error } = await Promise.race([resetPromise, timeoutPromise]) as any
      
      if (error) {
        console.error('Supabase forgot password error:', error)
        throw error
      }
      
    } catch (error: any) {
      console.error('Forgot password error:', error)
      
      // Transform Supabase errors to user-friendly messages
      if (error.message?.includes('User not found') || error.message?.includes('not found')) {
        throw new Error('No account found with this email address')
      } else if (error.message?.includes('Invalid') || error.message?.includes('invalid')) {
        throw new Error('Invalid email address')
      } else if (error.message?.includes('Supabase not configured')) {
        throw error // Pass through configuration errors
      } else if (error.message?.includes('timeout') || error.message?.includes('network')) {
        throw new Error('Network error. Please check your connection and try again.')
      } else if (error.message?.includes('rate limit') || error.message?.includes('too many')) {
        throw new Error('Too many reset requests. Please wait before trying again.')
      } else {
        throw new Error(error.message || 'Failed to send reset email. Please try again.')
      }
    } finally {
      set({ loading: false })
    }
  },

  resetPassword: async (password: string) => {
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
      const updatePromise = supabase.auth.updateUser({
        password: password
      })
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout. Please check your connection.')), 30000) // 30 second timeout
      })
      
      const { data, error } = await Promise.race([updatePromise, timeoutPromise]) as any
      
      if (error) {
        console.error('Supabase reset password error:', error)
        throw error
      }
      
      if (data.user) {
        set({ user: data.user as AuthUser })
        
        // Fetch profile after successful password reset
        try {
          const profilePromise = get().checkUser()
          const profileTimeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Profile fetch timeout')), 10000) // 10 second timeout
          })
          
          await Promise.race([profilePromise, profileTimeoutPromise])
        } catch (profileError) {
          console.warn('Profile fetch failed, but password reset was successful:', profileError)
          // Don't fail the entire reset process for profile fetch errors
        }
      }
    } catch (error: any) {
      console.error('Reset password error:', error)
      
      // Transform Supabase errors to user-friendly messages
      if (error.message?.includes('Password') || error.message?.includes('password')) {
        throw new Error('Password does not meet security requirements')
      } else if (error.message?.includes('token') || error.message?.includes('expired')) {
        throw new Error('Reset link has expired. Please request a new one.')
      } else if (error.message?.includes('Invalid') || error.message?.includes('invalid')) {
        throw new Error('Invalid reset link. Please request a new one.')
      } else if (error.message?.includes('Supabase not configured')) {
        throw error // Pass through configuration errors
      } else if (error.message?.includes('timeout') || error.message?.includes('network')) {
        throw new Error('Network error. Please check your connection and try again.')
      } else {
        throw new Error(error.message || 'Failed to reset password. Please try again.')
      }
    } finally {
      set({ loading: false })
    }
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
