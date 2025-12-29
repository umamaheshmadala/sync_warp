// src/components/SignUp.tsx
import { useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { Eye, EyeOff, Mail, Lock, User, CheckCircle, XCircle } from 'lucide-react'
import { useLoadingTimeout, useLoadingDebug } from '../hooks/useLoadingTimeout'

interface FormData {
  email: string
  password: string
  confirmPassword: string
  fullName: string
}

interface FormErrors {
  email?: string
  password?: string
  confirmPassword?: string
  fullName?: string
  general?: string
}

export default function SignUp() {
  const navigate = useNavigate()
  const { signUp, loading } = useAuthStore()

  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: ''
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Force reset loading state if it gets stuck
  const handleLoadingTimeout = useCallback(() => {
    setErrors({ general: 'Request timed out. Please try again.' });
    setIsSubmitting(false);
  }, []);

  // Add timeout protection
  useLoadingTimeout(loading || isSubmitting, handleLoadingTimeout, 45000);

  // Debug loading state in development
  if (process.env.NODE_ENV === 'development') {
    useLoadingDebug('SignUp', loading || isSubmitting);
  }

  // Password strength validation
  const validatePassword = (password: string) => {
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    }

    const score = Object.values(checks).filter(Boolean).length
    return { checks, score }
  }

  const passwordValidation = validatePassword(formData.password)

  // Email validation
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Form validation
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    // Full name validation
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required'
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = 'Full name must be at least 2 characters'
    }

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (passwordValidation.score < 3) {
      newErrors.password = 'Password is too weak. Please include more variety.'
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))

    // Clear specific error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setErrors({})

    try {
      await signUp(formData.email, formData.password, {
        full_name: formData.fullName
      })

      // Success - redirect to onboarding with a small delay to ensure loading state updates properly
      setTimeout(() => {
        navigate('/onboarding')
      }, 100)

    } catch (error: any) {
      console.error('Sign up error:', error)

      // Handle specific Supabase errors and configuration issues
      if (error.message?.includes('Supabase not configured')) {
        setErrors({ general: 'Authentication service is not configured. Please contact support.' })
      } else if (error.message?.includes('already registered')) {
        setErrors({ email: 'An account with this email already exists' })
      } else if (error.message?.includes('Password')) {
        setErrors({ password: 'Password does not meet requirements' })
      } else if (error.message?.includes('Email') || error.message?.includes('email')) {
        setErrors({ email: 'Invalid email address' })
      } else if (error.message?.includes('network') || error.message?.includes('Network')) {
        setErrors({ general: 'Network error. Please check your connection and try again.' })
      } else if (error.message?.includes('timeout') || error.message?.includes('Timeout')) {
        setErrors({ general: 'Request timed out. Please check your connection and try again.' })
      } else {
        // Fallback for any other errors
        const errorMessage = error.message || 'Failed to create account. Please try again.'
        setErrors({ general: errorMessage })
      }
    } finally {
      // Ensure loading state is always reset
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto flex justify-center mb-2">
            <img
              src="/Logo/Logo Text Transparent PNG 2.png"
              alt="Sync"
              className="h-16 sm:h-24 w-auto"
            />
          </div>
        </div>
      </div>

      <div className="mt-2 mx-auto w-[85%] sm:w-full sm:max-w-md sm:px-0">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-2xl sm:py-10 sm:px-12 border border-gray-100">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* General error message */}
            {errors.general && (
              <div className="rounded-lg bg-red-50 p-4 border border-red-100">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <XCircle className="h-5 w-5 text-red-500" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Sign up failed</h3>
                    <p className="mt-2 text-sm text-red-700">{errors.general}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {/* Full Name */}
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <div className="mt-2 relative">
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    autoComplete="name"
                    required
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className={`appearance-none block w-full px-4 py-3 pl-11 border rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all start-1 ${errors.fullName ? 'border-red-300' : 'border-gray-200 bg-gray-50/50'
                      }`}
                    placeholder="Enter your full name"
                  />
                  <User className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
                {errors.fullName && (
                  <p className="mt-2 text-sm text-red-600">{errors.fullName}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <div className="mt-2 relative">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`appearance-none block w-full px-4 py-3 pl-11 border rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all start-1 ${errors.email ? 'border-red-300' : 'border-gray-200 bg-gray-50/50'
                      }`}
                    placeholder="Enter your email"
                  />
                  <Mail className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
                {errors.email && (
                  <p className="mt-2 text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="mt-2 relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`appearance-none block w-full px-4 py-3 pl-11 pr-11 border rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${errors.password ? 'border-red-300' : 'border-gray-200 bg-gray-50/50'
                      }`}
                    placeholder="Create a password"
                  />
                  <Lock className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <button
                    type="button"
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 hover:text-gray-600 transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5 text-gray-400" /> : <Eye className="w-5 h-5 text-gray-400" />}
                  </button>
                </div>

                {/* Password strength indicator */}
                {formData.password && (
                  <div className="mt-2 space-y-2">
                    <div className="flex space-x-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded ${i <= passwordValidation.score
                            ? passwordValidation.score <= 2
                              ? 'bg-red-400'
                              : passwordValidation.score <= 3
                                ? 'bg-yellow-400'
                                : 'bg-green-400'
                            : 'bg-gray-200'
                            }`}
                        />
                      ))}
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className={`h-3 w-3 ${passwordValidation.checks.length ? 'text-green-500' : 'text-gray-300'}`} />
                        <span>At least 8 characters</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className={`h-3 w-3 ${passwordValidation.checks.uppercase ? 'text-green-500' : 'text-gray-300'}`} />
                        <span>One uppercase letter</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className={`h-3 w-3 ${passwordValidation.checks.number ? 'text-green-500' : 'text-gray-300'}`} />
                        <span>One number</span>
                      </div>
                    </div>
                  </div>
                )}

                {errors.password && (
                  <p className="mt-2 text-sm text-red-600">{errors.password}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <div className="mt-2 relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className={`appearance-none block w-full px-4 py-3 pl-11 pr-11 border rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${errors.confirmPassword ? 'border-red-300' : 'border-gray-200 bg-gray-50/50'
                      }`}
                    placeholder="Confirm your password"
                  />
                  <Lock className="w-5 h-5 text-gray-400 absolute left-3.5 top-3.5" />
                  <button
                    type="button"
                    className="absolute right-3.5 top-3.5 hover:text-gray-600 transition-colors"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5 text-gray-400" /> : <Eye className="w-5 h-5 text-gray-400" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-2 text-sm text-red-600">{errors.confirmPassword}</p>
                )}
              </div>
            </div>

            {/* Submit button */}
            <div>
              <button
                type="submit"
                disabled={isSubmitting || loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-indigo-200 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
              >
                {isSubmitting || loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating account...
                  </div>
                ) : (
                  'Create account'
                )}
              </button>
            </div>

            {/* Sign in link - Moved to footer */}
            <div className="mt-8 text-center border-t border-gray-100 pt-6">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link
                  to="/auth/login"
                  className="font-semibold text-indigo-600 hover:text-indigo-500 transition-colors"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>

      {/* Spacer to balance the logo and center the card */}
      <div className="h-16 sm:h-24 sm:mx-auto sm:w-full sm:max-w-md" aria-hidden="true" />
    </div>
  )
}