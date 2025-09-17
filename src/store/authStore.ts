// src/store/authStore.ts
import { create } from 'zustand'
import { supabase, Profile, AuthUser } from '../lib/supabase'

interface AuthState {
  user: AuthUser | null
  profile: Profile | null
  loading: boolean
  
  // Actions
  signUp: (email: string, password: string, userData?: any) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<void>
  checkUser: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: true,

  signUp: async (email: string, password: string, userData = {}) => {
    set({ loading: true })
    
    try {
      // Check if Supabase is properly configured
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
        throw new Error('Supabase not configured. Please follow SUPABASE_SETUP_GUIDE.md to set up your database.')
      }
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      })
      
      if (error) throw error
      
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
          
          // Insert profile (this might fail if triggered by auth webhook)
          const { error: profileError } = await supabase
            .from('profiles')
            .insert(profileData)
          
          // Don't throw on profile creation error as it might already exist
          if (profileError && !profileError.message?.includes('duplicate key')) {
            console.warn('Profile creation warning:', profileError)
          }
          
        } catch (profileError) {
          console.warn('Profile creation failed (might already exist):', profileError)
        }
      }
    } catch (error: any) {
      console.error('Sign up error:', error)
      
      // Transform Supabase errors to user-friendly messages
      if (error.message?.includes('User already registered')) {
        throw new Error('already registered')
      } else if (error.message?.includes('Password')) {
        throw new Error('Password does not meet requirements')
      } else if (error.message?.includes('Invalid')) {
        throw new Error('Invalid email address')
      } else if (error.message?.includes('Supabase not configured')) {
        throw error // Pass through configuration errors
      } else {
        throw new Error('Failed to create account. Please try again.')
      }
    } finally {
      set({ loading: false })
    }
  },

  signIn: async (email: string, password: string) => {
    set({ loading: true })
    
    try {
      // Check if Supabase is properly configured
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
        throw new Error('Supabase not configured. Please follow SUPABASE_SETUP_GUIDE.md to set up your database.')
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (error) throw error
      
      if (data.user) {
        set({ user: data.user as AuthUser })
        // Fetch profile after successful login
        await get().checkUser()
      }
    } catch (error) {
      console.error('Sign in error:', error)
      throw error
    } finally {
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
      if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
        console.warn('Supabase not configured. Skipping user check.')
        set({ loading: false })
        return
      }
      
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        set({ user: user as AuthUser })
        
        // Fetch user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        
        if (profile) {
          set({ profile })
        }
      }
    } catch (error) {
      console.error('Check user error:', error)
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
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        useAuthStore.getState().checkUser()
      } else if (event === 'SIGNED_OUT') {
        useAuthStore.setState({ user: null, profile: null })
      }
    })
  }
} catch (error) {
  console.warn('Supabase auth initialization skipped:', error)
}
