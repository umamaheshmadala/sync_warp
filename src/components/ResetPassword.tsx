// src/components/ResetPassword.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Lock, Eye, EyeOff, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useLoadingTimeout, useLoadingDebug } from '../hooks/useLoadingTimeout';

const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/\d/, 'Password must contain at least one number'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { resetPassword, loading } = useAuthStore();
  const [authError, setAuthError] = useState<string | null>(null);
  const [isPasswordReset, setIsPasswordReset] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isValidToken, setIsValidToken] = useState(true);

  // Check if we have access token or error in URL parameters
  useEffect(() => {
    const accessToken = searchParams.get('access_token');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (error) {
      setIsValidToken(false);
      if (errorDescription) {
        setAuthError(decodeURIComponent(errorDescription));
      } else {
        setAuthError('Invalid or expired reset link. Please request a new one.');
      }
    } else if (!accessToken) {
      // Check if this might be a hash-based URL (some email providers)
      const hash = window.location.hash;
      if (!hash.includes('access_token')) {
        setIsValidToken(false);
        setAuthError('Invalid reset link. Please request a new password reset.');
      }
    }
  }, [searchParams]);

  // Force reset loading state if it gets stuck
  const handleLoadingTimeout = useCallback(() => {
    setAuthError('Request timed out. Please try again.');
  }, []);

  // Add timeout protection
  useLoadingTimeout(loading || false, handleLoadingTimeout, 45000);
  
  // Debug loading state in development
  if (process.env.NODE_ENV === 'development') {
    useLoadingDebug('ResetPassword', loading || false);
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema)
  });

  const password = watch('password');

  const onSubmit = async (data: ResetPasswordFormData) => {
    try {
      setAuthError(null);
      await resetPassword(data.password);
      
      // Success - show confirmation
      setIsPasswordReset(true);
      
      // Auto-redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/auth/login', {
          state: { message: 'Password reset successfully. Please log in with your new password.' }
        });
      }, 3000);
    } catch (error: any) {
      console.error('Reset password error:', error);
      setAuthError(error.message || 'Failed to reset password. Please try again.');
    }
  };

  // Invalid token screen
  if (!isValidToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <Link 
            to="/auth/forgot-password" 
            className="inline-flex items-center text-indigo-600 hover:text-indigo-700 mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Request new reset link
          </Link>

          <div className="bg-white py-8 px-4 shadow-xl rounded-lg sm:px-10">
            {/* Error Icon */}
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>

            {/* Header */}
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Invalid Reset Link
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                {authError || 'This password reset link is invalid or has expired.'}
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <Link
                to="/auth/forgot-password"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Request new reset link
              </Link>
              
              <Link
                to="/auth/login"
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Back to login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success screen after password is reset
  if (isPasswordReset) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow-xl rounded-lg sm:px-10">
            {/* Success Icon */}
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>

            {/* Header */}
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Password Updated!
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                Your password has been successfully updated. You can now log in with your new password.
              </p>
            </div>

            {/* Auto-redirect message */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-md p-3 mb-6">
              <p className="text-sm text-indigo-700 text-center">
                Redirecting to login page in 3 seconds...
              </p>
            </div>

            {/* Manual action */}
            <Link
              to="/auth/login"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Continue to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Password strength indicator
  const getPasswordStrength = (password: string) => {
    if (!password) return { strength: 0, label: '', color: '' };
    
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    if (strength <= 2) return { strength, label: 'Weak', color: 'bg-red-500' };
    if (strength <= 3) return { strength, label: 'Fair', color: 'bg-yellow-500' };
    if (strength <= 4) return { strength, label: 'Good', color: 'bg-blue-500' };
    return { strength, label: 'Strong', color: 'bg-green-500' };
  };

  const passwordStrength = getPasswordStrength(password || '');

  // Main reset password form
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Back button */}
        <Link 
          to="/auth/login" 
          className="inline-flex items-center text-indigo-600 hover:text-indigo-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to login
        </Link>

        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">S</span>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Set new password
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Please choose a strong password for your account.
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {/* Error Alert */}
            {authError && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-700">{authError}</div>
              </div>
            )}

            {/* New Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                New Password
              </label>
              <div className="mt-1 relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  autoFocus
                  className={`appearance-none block w-full px-3 py-2 pl-10 pr-10 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                    errors.password ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter your new password"
                />
                <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
                <button
                  type="button"
                  className="absolute right-3 top-2.5"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5 text-gray-400" />
                  ) : (
                    <Eye className="w-5 h-5 text-gray-400" />
                  )}
                </button>
              </div>
              
              {/* Password Strength Indicator */}
              {password && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600">Password strength</span>
                    <span className={`text-xs font-medium ${
                      passwordStrength.strength <= 2 ? 'text-red-600' :
                      passwordStrength.strength <= 3 ? 'text-yellow-600' :
                      passwordStrength.strength <= 4 ? 'text-blue-600' : 'text-green-600'
                    }`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${passwordStrength.color} transition-all duration-300`}
                      style={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}
              
              {errors.password && (
                <p className="mt-2 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm New Password
              </label>
              <div className="mt-1 relative">
                <input
                  {...register('confirmPassword')}
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className={`appearance-none block w-full px-3 py-2 pl-10 pr-10 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                    errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Confirm your new password"
                />
                <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
                <button
                  type="button"
                  className="absolute right-3 top-2.5"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5 text-gray-400" />
                  ) : (
                    <Eye className="w-5 h-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-2 text-sm text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Password Requirements */}
            <div className="text-xs text-gray-600 space-y-1">
              <p className="font-medium">Password must contain:</p>
              <ul className="space-y-1 ml-4">
                <li className={password?.length >= 8 ? 'text-green-600' : 'text-gray-600'}>
                  • At least 8 characters
                </li>
                <li className={/[A-Z]/.test(password || '') ? 'text-green-600' : 'text-gray-600'}>
                  • One uppercase letter
                </li>
                <li className={/[a-z]/.test(password || '') ? 'text-green-600' : 'text-gray-600'}>
                  • One lowercase letter
                </li>
                <li className={/\d/.test(password || '') ? 'text-green-600' : 'text-gray-600'}>
                  • One number
                </li>
              </ul>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={isSubmitting || loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting || loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Update password'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;