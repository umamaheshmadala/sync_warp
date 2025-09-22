// src/components/ForgotPassword.tsx
import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useLoadingTimeout, useLoadingDebug } from '../hooks/useLoadingTimeout';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address')
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

const ForgotPassword: React.FC = () => {
  const { forgotPassword, loading } = useAuthStore();
  const [authError, setAuthError] = useState<string | null>(null);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [emailSentTo, setEmailSentTo] = useState<string>('');

  // Force reset loading state if it gets stuck
  const handleLoadingTimeout = useCallback(() => {
    setAuthError('Request timed out. Please try again.');
  }, []);

  // Add timeout protection
  useLoadingTimeout(loading || false, handleLoadingTimeout, 45000);
  
  // Debug loading state in development
  if (process.env.NODE_ENV === 'development') {
    useLoadingDebug('ForgotPassword', loading || false);
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema)
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setAuthError(null);
      await forgotPassword(data.email);
      
      // Success - show confirmation
      setEmailSentTo(data.email);
      setIsEmailSent(true);
    } catch (error: any) {
      console.error('Forgot password error:', error);
      setAuthError(error.message || 'Failed to send reset email. Please try again.');
    }
  };

  // Success screen after email is sent
  if (isEmailSent) {
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

          <div className="bg-white py-8 px-4 shadow-xl rounded-lg sm:px-10">
            {/* Success Icon */}
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>

            {/* Header */}
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Check your email
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                We've sent a password reset link to:
              </p>
              <p className="text-sm font-medium text-indigo-600 bg-indigo-50 px-3 py-2 rounded-md mb-6">
                {emailSentTo}
              </p>
            </div>

            {/* Instructions */}
            <div className="text-left space-y-3 mb-6">
              <h3 className="font-medium text-gray-900">Next steps:</h3>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-1.5 h-1.5 bg-indigo-600 rounded-full mt-2 mr-3"></span>
                  Check your email inbox (and spam folder)
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-1.5 h-1.5 bg-indigo-600 rounded-full mt-2 mr-3"></span>
                  Click the "Reset Password" link in the email
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-1.5 h-1.5 bg-indigo-600 rounded-full mt-2 mr-3"></span>
                  Enter your new password and confirm
                </li>
              </ul>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <Link
                to="/auth/login"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Back to login
              </Link>
              
              <button
                type="button"
                onClick={() => {
                  setIsEmailSent(false);
                  setEmailSentTo('');
                }}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Send to different email
              </button>
            </div>

            {/* Help text */}
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                Didn't receive an email? Check your spam folder or try again with a different email address.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main forgot password form
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
            Reset your password
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter your email address and we'll send you a link to reset your password.
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

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1 relative">
                <input
                  {...register('email')}
                  type="email"
                  autoComplete="email"
                  autoFocus
                  className={`appearance-none block w-full px-3 py-2 pl-10 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                    errors.email ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter your email address"
                />
                <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
              </div>
              {errors.email && (
                <p className="mt-2 text-sm text-red-600">{errors.email.message}</p>
              )}
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
                  'Send reset email'
                )}
              </button>
            </div>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Remember your password?{' '}
              <Link to="/auth/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;