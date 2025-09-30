/**
 * Tests for authStore
 * 
 * Tests authentication flows, state management, error handling, and profile operations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAuthStore } from '../authStore';
import { supabase } from '../../lib/supabase';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getUser: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } }
      }))
    },
    from: vi.fn(() => ({
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn()
    }))
  }
}));

// Mock environment variables
vi.stubGlobal('import', {
  meta: {
    env: {
      VITE_SUPABASE_URL: 'https://test.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key'
    }
  }
});

describe('authStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state
    useAuthStore.setState({
      user: null,
      profile: null,
      loading: false,
      initialized: false,
      error: null
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('signUp', () => {
    it('should successfully sign up a new user', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        user_metadata: {}
      };

      const mockSignUpResponse = {
        data: { user: mockUser },
        error: null
      };

      vi.mocked(supabase.auth.signUp).mockResolvedValue(mockSignUpResponse as any);
      
      // Mock profile insertion
      const mockFrom = vi.fn(() => ({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null })
      }));
      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const { signUp } = useAuthStore.getState();
      
      await signUp('test@example.com', 'password123', { full_name: 'Test User' });

      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          data: { full_name: 'Test User' }
        }
      });

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.loading).toBe(false);
    });

    it('should handle duplicate user error', async () => {
      const mockError = new Error('User already registered');
      
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: null },
        error: mockError
      } as any);

      const { signUp } = useAuthStore.getState();

      await expect(signUp('test@example.com', 'password123')).rejects.toThrow('already registered');
      
      const state = useAuthStore.getState();
      expect(state.loading).toBe(false);
    });

    it('should handle weak password error', async () => {
      const mockError = new Error('Password should be at least 8 characters');
      
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: null },
        error: mockError
      } as any);

      const { signUp } = useAuthStore.getState();

      await expect(signUp('test@example.com', '123')).rejects.toThrow('Password does not meet requirements');
      
      const state = useAuthStore.getState();
      expect(state.loading).toBe(false);
    });

    it('should handle invalid email error', async () => {
      const mockError = new Error('Invalid email format');
      
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: null },
        error: mockError
      } as any);

      const { signUp } = useAuthStore.getState();

      await expect(signUp('invalid-email', 'password123')).rejects.toThrow('Invalid email address');
    });

    it('should handle network timeout', async () => {
      vi.useFakeTimers();
      
      vi.mocked(supabase.auth.signUp).mockImplementation(() => 
        new Promise((resolve) => {
          setTimeout(() => resolve({ data: { user: null }, error: null }), 35000);
        }) as any
      );

      const { signUp } = useAuthStore.getState();
      
      const signUpPromise = signUp('test@example.com', 'password123');
      
      // Advance past timeout
      vi.advanceTimersByTime(31000);
      
      await expect(signUpPromise).rejects.toThrow(/timeout|connection/i);
      
      vi.useRealTimers();
    });

    it('should create profile for new user', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        user_metadata: {}
      };

      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: mockUser },
        error: null
      } as any);

      const mockInsert = vi.fn().mockReturnThis();
      const mockFrom = vi.fn(() => ({
        insert: mockInsert,
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null })
      }));
      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const { signUp } = useAuthStore.getState();
      await signUp('test@example.com', 'password123', { full_name: 'Test User' });

      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(mockInsert).toHaveBeenCalled();
    });

    it('should not fail signup if profile creation fails', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        user_metadata: {}
      };

      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: mockUser },
        error: null
      } as any);

      // Mock profile insertion failure
      const mockFrom = vi.fn(() => ({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockRejectedValue(new Error('Profile creation failed'))
      }));
      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const { signUp } = useAuthStore.getState();
      
      // Should not throw even though profile creation failed
      await expect(signUp('test@example.com', 'password123')).resolves.not.toThrow();
      
      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
    });
  });

  describe('signIn', () => {
    it('should successfully sign in a user', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        user_metadata: {}
      };

      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: mockUser, session: {} },
        error: null
      } as any);

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      } as any);

      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ 
          data: { id: mockUser.id, email: mockUser.email },
          error: null 
        })
      }));
      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const { signIn } = useAuthStore.getState();
      
      await signIn('test@example.com', 'password123');

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.loading).toBe(false);
    });

    it('should handle invalid credentials', async () => {
      const mockError = new Error('Invalid login credentials');
      
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: null },
        error: mockError
      } as any);

      const { signIn } = useAuthStore.getState();

      await expect(signIn('test@example.com', 'wrongpassword')).rejects.toThrow('Invalid email or password');
      
      const state = useAuthStore.getState();
      expect(state.loading).toBe(false);
    });

    it('should handle too many requests error', async () => {
      const mockError = new Error('Too many requests');
      
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: null },
        error: mockError
      } as any);

      const { signIn } = useAuthStore.getState();

      await expect(signIn('test@example.com', 'password123')).rejects.toThrow(/too many login attempts/i);
    });

    it('should fetch user profile after signin', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        user_metadata: {}
      };

      const mockProfile = {
        id: 'test-user-id',
        email: 'test@example.com',
        full_name: 'Test User'
      };

      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: mockUser, session: {} },
        error: null
      } as any);

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      } as any);

      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ 
          data: mockProfile,
          error: null 
        })
      }));
      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const { signIn } = useAuthStore.getState();
      await signIn('test@example.com', 'password123');

      const state = useAuthStore.getState();
      expect(state.profile).toEqual(mockProfile);
    });

    it('should not fail signin if profile fetch fails', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        user_metadata: {}
      };

      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: mockUser, session: {} },
        error: null
      } as any);

      vi.mocked(supabase.auth.getUser).mockRejectedValue(new Error('Profile fetch failed'));

      const { signIn } = useAuthStore.getState();
      
      // Should not throw even though profile fetch failed
      await expect(signIn('test@example.com', 'password123')).resolves.not.toThrow();
      
      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
    });
  });

  describe('signOut', () => {
    it('should successfully sign out a user', async () => {
      // Set initial user state
      useAuthStore.setState({
        user: { id: 'test-user-id', email: 'test@example.com' } as any,
        profile: { id: 'test-user-id', email: 'test@example.com' } as any
      });

      vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null });

      const { signOut } = useAuthStore.getState();
      await signOut();

      expect(supabase.auth.signOut).toHaveBeenCalled();
      
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.profile).toBeNull();
    });

    it('should handle sign out error', async () => {
      const mockError = new Error('Sign out failed');
      
      vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: mockError });

      const { signOut } = useAuthStore.getState();

      await expect(signOut()).rejects.toThrow('Sign out failed');
    });
  });

  describe('updateProfile', () => {
    it('should update existing profile', async () => {
      const mockUser = { id: 'test-user-id', email: 'test@example.com' };
      const mockUpdatedProfile = {
        id: 'test-user-id',
        email: 'test@example.com',
        full_name: 'Updated Name',
        city: 'New City'
      };

      useAuthStore.setState({ user: mockUser as any });

      const mockFrom = vi.fn(() => ({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ 
          data: mockUpdatedProfile,
          error: null 
        })
      }));
      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const { updateProfile } = useAuthStore.getState();
      await updateProfile({ full_name: 'Updated Name', city: 'New City' });

      const state = useAuthStore.getState();
      expect(state.profile).toEqual(mockUpdatedProfile);
    });

    it('should create profile if it does not exist', async () => {
      const mockUser = { id: 'test-user-id', email: 'test@example.com' };
      const mockNewProfile = {
        id: 'test-user-id',
        email: 'test@example.com',
        full_name: 'New User',
        city: 'Test City'
      };

      useAuthStore.setState({ user: mockUser as any });

      // First call (update) returns PGRST116 error (no rows)
      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn()
        .mockResolvedValueOnce({ 
          data: null,
          error: { code: 'PGRST116', message: 'No rows' }
        });

      // Second call (insert) succeeds
      const mockInsert = vi.fn().mockReturnThis();
      const mockInsertSingle = vi.fn().mockResolvedValue({ 
        data: mockNewProfile,
        error: null 
      });

      let callCount = 0;
      const mockFrom = vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          // First call - update attempt
          return {
            update: mockUpdate,
            eq: mockEq,
            select: mockSelect,
            single: mockSingle
          };
        } else {
          // Second call - insert
          return {
            insert: mockInsert,
            select: vi.fn().mockReturnThis(),
            single: mockInsertSingle
          };
        }
      });
      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const { updateProfile } = useAuthStore.getState();
      await updateProfile({ full_name: 'New User', city: 'Test City' });

      const state = useAuthStore.getState();
      expect(state.profile).toEqual(mockNewProfile);
      expect(mockInsert).toHaveBeenCalled();
    });

    it('should throw error if no user is logged in', async () => {
      useAuthStore.setState({ user: null });

      const { updateProfile } = useAuthStore.getState();

      await expect(updateProfile({ full_name: 'Test' })).rejects.toThrow('No user found');
    });

    it('should ensure city is never empty when creating profile', async () => {
      const mockUser = { id: 'test-user-id', email: 'test@example.com' };

      useAuthStore.setState({ user: mockUser as any });

      const mockInsert = vi.fn().mockReturnThis();
      const mockFrom = vi.fn(() => ({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({ 
            data: null,
            error: { code: 'PGRST116' }
          }),
        insert: mockInsert
      }));
      
      let insertedData: any;
      mockInsert.mockImplementation((data) => {
        insertedData = data;
        return {
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ 
            data: { ...data, id: mockUser.id },
            error: null 
          })
        };
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const { updateProfile } = useAuthStore.getState();
      await updateProfile({ full_name: 'Test User' }); // No city provided

      // City should be set to 'Unknown' by default
      expect(insertedData).toHaveProperty('city', 'Unknown');
    });
  });

  describe('checkUser', () => {
    it('should check and set current user', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        user_metadata: {}
      };

      const mockProfile = {
        id: 'test-user-id',
        email: 'test@example.com',
        full_name: 'Test User'
      };

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      } as any);

      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ 
          data: mockProfile,
          error: null 
        })
      }));
      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const { checkUser } = useAuthStore.getState();
      await checkUser();

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.profile).toEqual(mockProfile);
      expect(state.initialized).toBe(true);
      expect(state.loading).toBe(false);
    });

    it('should handle no user found', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      } as any);

      const { checkUser } = useAuthStore.getState();
      await checkUser();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.initialized).toBe(true);
      expect(state.loading).toBe(false);
    });

    it('should not fail if profile fetch fails', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        user_metadata: {}
      };

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      } as any);

      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockRejectedValue(new Error('Profile fetch failed'))
      }));
      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const { checkUser } = useAuthStore.getState();
      
      // Should not throw
      await expect(checkUser()).resolves.not.toThrow();
      
      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.profile).toBeNull();
    });
  });

  describe('forgotPassword', () => {
    it('should send password reset email', async () => {
      vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({ 
        data: {},
        error: null 
      } as any);

      const { forgotPassword } = useAuthStore.getState();
      await forgotPassword('test@example.com');

      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        expect.objectContaining({
          redirectTo: expect.stringContaining('/auth/reset-password')
        })
      );
    });

    it('should handle user not found error', async () => {
      const mockError = new Error('User not found');
      
      vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({ 
        data: {},
        error: mockError 
      } as any);

      const { forgotPassword } = useAuthStore.getState();

      await expect(forgotPassword('test@example.com')).rejects.toThrow(/no account found/i);
    });

    it('should handle rate limit error', async () => {
      const mockError = new Error('rate limit exceeded');
      
      vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({ 
        data: {},
        error: mockError 
      } as any);

      const { forgotPassword } = useAuthStore.getState();

      await expect(forgotPassword('test@example.com')).rejects.toThrow(/too many reset requests/i);
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        user_metadata: {}
      };

      vi.mocked(supabase.auth.updateUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      } as any);

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      } as any);

      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null })
      }));
      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const { resetPassword } = useAuthStore.getState();
      await resetPassword('newpassword123');

      expect(supabase.auth.updateUser).toHaveBeenCalledWith({
        password: 'newpassword123'
      });

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
    });

    it('should handle weak password error', async () => {
      const mockError = new Error('Password should be at least 8 characters');
      
      vi.mocked(supabase.auth.updateUser).mockResolvedValue({
        data: { user: null },
        error: mockError
      } as any);

      const { resetPassword } = useAuthStore.getState();

      await expect(resetPassword('123')).rejects.toThrow(/password does not meet/i);
    });

    it('should handle expired token error', async () => {
      const mockError = new Error('token expired');
      
      vi.mocked(supabase.auth.updateUser).mockResolvedValue({
        data: { user: null },
        error: mockError
      } as any);

      const { resetPassword } = useAuthStore.getState();

      await expect(resetPassword('newpassword123')).rejects.toThrow(/reset link has expired/i);
    });
  });

  describe('clearError', () => {
    it('should clear error state', () => {
      useAuthStore.setState({ error: 'Some error' });

      const { clearError } = useAuthStore.getState();
      clearError();

      const state = useAuthStore.getState();
      expect(state.error).toBeNull();
    });
  });
});