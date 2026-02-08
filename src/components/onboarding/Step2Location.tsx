// src/components/onboarding/Step2Location.tsx
import { useState, useEffect } from 'react'
import { MapPin, ArrowRight, ArrowLeft, Locate } from 'lucide-react'
import { OnboardingData } from './OnboardingFlow'
import { CityService, CitySearchResult } from '../../services/cityService'

interface Step2LocationProps {
  data: OnboardingData
  onUpdate: (updates: Partial<OnboardingData>) => void
  onNext: () => void
  onBack: () => void
  isFirstStep?: boolean
}

export default function Step2Location({ data, onUpdate, onNext, onBack, isFirstStep = false }: Step2LocationProps) {
  const [city, setCity] = useState(data.city || '')
  const [citySuggestions, setCitySuggestions] = useState<CitySearchResult[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [cityError, setCityError] = useState('')
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [isLoadingCities, setIsLoadingCities] = useState(false)

  // Search cities based on input
  useEffect(() => {
    const searchCities = async () => {
      if (city.length > 1) {
        setIsLoadingCities(true)
        try {
          const results = await CityService.searchCities(city, 8)
          setCitySuggestions(results)
          setShowSuggestions(results.length > 0)
        } catch (error) {
          console.error('Error searching cities:', error)
          setCitySuggestions([])
          setShowSuggestions(false)
        } finally {
          setIsLoadingCities(false)
        }
      } else {
        setCitySuggestions([])
        setShowSuggestions(false)
      }
    }

    const timeoutId = setTimeout(searchCities, 300) // Debounce search
    return () => clearTimeout(timeoutId)
  }, [city])

  // Load popular cities on component mount
  useEffect(() => {
    const loadPopularCities = async () => {
      try {
        const popularCities = await CityService.getPopularCities('Tier 1', 10)
        if (city.length <= 1) {
          setCitySuggestions(popularCities)
        }
      } catch (error) {
        console.error('Error loading popular cities:', error)
      }
    }

    loadPopularCities()
  }, [])

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('[data-city-search]')) {
        setShowSuggestions(false)
      }
    }

    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showSuggestions])

  const handleCityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setCity(value)
    setCityError('')
    onUpdate({ city: value })
  }

  const selectCity = (selectedCity: CitySearchResult) => {
    const cityDisplayName = `${selectedCity.name}, ${selectedCity.state}`
    setCity(cityDisplayName)
    setShowSuggestions(false)
    setCityError('')
    onUpdate({ city: cityDisplayName })
  }

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setCityError('Geolocation is not supported by your browser')
      return
    }

    setIsGettingLocation(true)
    setCityError('')

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords

          // Try to find nearest city from database
          const nearestCity = await CityService.findNearestCity(latitude, longitude)

          if (nearestCity) {
            const cityDisplayName = `${nearestCity.name}, ${nearestCity.state}`
            setCity(cityDisplayName)
            onUpdate({ city: cityDisplayName })
            setCityError('')
          } else {
            setCityError('Unable to determine your city. Please select manually.')
          }
        } catch (error) {
          console.error('Geocoding error:', error)
          setCityError('Unable to get your location. Please enter manually.')
        } finally {
          setIsGettingLocation(false)
        }
      },
      () => {
        setCityError('Unable to access your location. Please enter manually.')
        setIsGettingLocation(false)
      },
      { timeout: 10000 }
    )
  }

  const validateCity = async () => {
    // City is now optional, so empty is valid
    return true
  }

  const handleNext = async () => {
    if (await validateCity()) {
      onNext()
    }
  }

  const handleSkip = () => {
    onUpdate({ city: '' })
    onNext()
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Your Location
        </h2>
        <p className="text-gray-600">
          Help us find the best deals in your area
        </p>
      </div>

      <div className="space-y-6">
        {/* Location Input */}
        <div className="relative" data-city-search>
          <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
            City <span className="text-gray-400 font-normal">(Optional)</span>
          </label>
          <div className="relative">
            <input
              type="text"
              id="city"
              value={city}
              onChange={handleCityChange}
              onFocus={() => {
                if (city.length > 1 || citySuggestions.length > 0) {
                  setShowSuggestions(true)
                }
              }}
              className={`
                block w-full px-4 py-3 pl-12 border rounded-lg shadow-sm
                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                ${cityError ? 'border-red-300' : 'border-gray-300'}
              `}
              placeholder="Enter your city (e.g., Mumbai, Bangalore, Delhi)"
            />
            <MapPin className="h-5 w-5 text-gray-400 absolute left-4 top-3.5" />
          </div>

          {/* City Suggestions */}
          {(showSuggestions && (citySuggestions.length > 0 || isLoadingCities)) && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
              {isLoadingCities && (
                <div className="px-4 py-3 text-center text-gray-500">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 mr-2"></div>
                    Searching cities...
                  </div>
                </div>
              )}
              {!isLoadingCities && citySuggestions.map((suggestedCity, index) => (
                <button
                  key={suggestedCity.id || index}
                  onClick={() => selectCity(suggestedCity)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none first:rounded-t-lg last:rounded-b-lg"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 text-gray-400 mr-3" />
                      <div>
                        <span className="text-gray-900 font-medium">{suggestedCity.name}</span>
                        <span className="text-gray-500 text-sm ml-2">{suggestedCity.state}</span>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${suggestedCity.tier === 'Tier 1' ? 'bg-green-100 text-green-800' :
                        suggestedCity.tier === 'Tier 2' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                      }`}>
                      {suggestedCity.tier}
                    </span>
                  </div>
                </button>
              ))}
              {!isLoadingCities && citySuggestions.length === 0 && city.length > 1 && (
                <div className="px-4 py-3 text-center text-gray-500">
                  No cities found matching "{city}"
                </div>
              )}
            </div>
          )}

          {cityError && (
            <p className="mt-1 text-sm text-red-600">{cityError}</p>
          )}
        </div>

        {/* Get Current Location */}
        <div className="text-center">
          <button
            onClick={getCurrentLocation}
            disabled={isGettingLocation}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 ease-in-out"
          >
            {isGettingLocation ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
            ) : (
              <Locate className="mr-2 h-4 w-4" />
            )}
            {isGettingLocation ? 'Getting location...' : 'Use current location'}
          </button>
        </div>

      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        {!isFirstStep && (
          <button
            onClick={onBack}
            className="flex items-center justify-center px-6 py-3 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </button>
        )}

        {isFirstStep && (
          <button
            onClick={handleSkip}
            className="flex items-center justify-center px-6 py-3 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out"
          >
            Skip for now
          </button>
        )}

        <button
          onClick={handleNext}
          className="flex-1 flex items-center justify-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out"
        >
          {city ? 'Continue' : 'Skip & Continue'}
          <ArrowRight className="ml-2 h-4 w-4" />
        </button>
      </div>
    </div>
  )
}