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
      }
    } catch (error) {
      console.error('Sign up error:', error)
      throw error
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
