// src/components/onboarding/Step1BasicInfo.tsx
import { useState } from 'react'
import { Phone, ArrowRight, ChevronRight } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { OnboardingData } from './OnboardingFlow'

interface Step1BasicInfoProps {
  data: OnboardingData
  onUpdate: (updates: Partial<OnboardingData>) => void
  onNext: () => void
  onSkip: () => void
}

export default function Step1BasicInfo({ data, onUpdate, onNext, onSkip }: Step1BasicInfoProps) {
  const { user } = useAuthStore()
  const [phone, setPhone] = useState(data.phone || '')
  const [phoneError, setPhoneError] = useState('')

  // Format phone number as user types
  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '')
    
    // Format as (XXX) XXX-XXXX
    if (digits.length >= 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`
    } else if (digits.length >= 6) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
    } else if (digits.length >= 3) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
    } else {
      return digits
    }
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const formatted = formatPhoneNumber(value)
    
    // Only update if we haven't exceeded 10 digits
    const digits = formatted.replace(/\D/g, '')
    if (digits.length <= 10) {
      setPhone(formatted)
      setPhoneError('')
      onUpdate({ phone: digits }) // Store unformatted digits
    }
  }

  const validatePhone = () => {
    const digits = phone.replace(/\D/g, '')
    if (phone && digits.length !== 10) {
      setPhoneError('Please enter a valid 10-digit phone number')
      return false
    }
    setPhoneError('')
    return true
  }

  const handleNext = () => {
    if (phone && !validatePhone()) {
      return
    }
    onNext()
  }

  const handleSkipStep = () => {
    onUpdate({ phone: '' })
    onNext()
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Basic Information
        </h2>
        <p className="text-gray-600">
          Let's start with some basic details about you
        </p>
      </div>

      {/* Welcome Message */}
      <div className="mb-8 p-4 bg-blue-50 rounded-lg">
        <p className="text-blue-800">
          <strong>Welcome, {user?.user_metadata?.full_name || user?.email}!</strong>
          <br />
          We're excited to help you discover amazing deals in your area.
        </p>
      </div>

      <div className="space-y-6">
        {/* Phone Number */}
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number <span className="text-gray-400 font-normal">(Optional)</span>
          </label>
          <div className="relative">
            <input
              type="tel"
              id="phone"
              value={phone}
              onChange={handlePhoneChange}
              onBlur={validatePhone}
              className={`
                block w-full px-4 py-3 pl-12 border rounded-lg shadow-sm
                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                ${phoneError ? 'border-red-300' : 'border-gray-300'}
              `}
              placeholder="(555) 123-4567"
            />
            <Phone className="h-5 w-5 text-gray-400 absolute left-4 top-3.5" />
          </div>
          {phoneError && (
            <p className="mt-1 text-sm text-red-600">{phoneError}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            We'll use this to send you important updates and deal alerts
          </p>
        </div>

        {/* Benefits Preview */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">What's next:</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Set your location preferences</li>
            <li>• Choose your interests</li>
            <li>• Start discovering personalized deals</li>
          </ul>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleNext}
          className="flex-1 flex items-center justify-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out"
        >
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </button>
        
        <button
          onClick={handleSkipStep}
          className="flex-1 flex items-center justify-center px-6 py-3 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out"
        >
          <ChevronRight className="mr-2 h-4 w-4" />
          Skip for now
        </button>
      </div>

      {/* Skip All Option */}
      <div className="mt-4 text-center">
        <button
          onClick={onSkip}
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Skip entire onboarding
        </button>
      </div>
    </div>
  )
}