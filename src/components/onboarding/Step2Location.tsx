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
}

export default function Step2Location({ data, onUpdate, onNext, onBack }: Step2LocationProps) {
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
      async (_position) => {
        try {
          // In a real app, you would use a geocoding service here
          // For now, we'll simulate getting a city name
          // const { latitude, longitude } = position.coords
          
          // Simulate API call delay
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          // This would be replaced with actual reverse geocoding
          const mockCity = 'Current Location' // You could use a geocoding service
          
          setCity(mockCity)
          onUpdate({ city: mockCity })
          setCityError('')
        } catch (error) {
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
    if (!city.trim()) {
      setCityError('Please enter your city or select from suggestions')
      return false
    }
    
    // For now, accept any non-empty city name
    // In future, could validate against database
    setCityError('')
    return true
  }

  const handleNext = async () => {
    if (await validateCity()) {
      onNext()
    }
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
            City <span className="text-red-500">*</span>
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
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      suggestedCity.tier === 'Tier 1' ? 'bg-green-100 text-green-800' :
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

        {/* Location Benefits */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <MapPin className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-blue-900 mb-1">Why we need your location</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Find local businesses and deals near you</li>
                <li>• Get personalized recommendations for your city</li>
                <li>• Connect with people in your area</li>
                <li>• Discover trending offers in your locality</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">
            Why we need your location:
          </h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Find deals and businesses near you</li>
            <li>• Show distance to each location</li>
            <li>• Send location-specific notifications</li>
            <li>• Personalize your deal recommendations</li>
          </ul>
        </div>

        {/* Privacy Note */}
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs text-gray-600">
            <strong>Privacy:</strong> Your location is only used to show you relevant deals. 
            We never share your exact location with businesses or other users.
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        <button
          onClick={onBack}
          className="flex items-center justify-center px-6 py-3 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </button>

        <button
          onClick={handleNext}
          className="flex-1 flex items-center justify-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out"
        >
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </button>
      </div>
    </div>
  )
}