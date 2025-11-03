// src/components/onboarding/Step3Interests.tsx
import { useState } from 'react'
import { ArrowLeft, Check, Star, ShoppingBag, Coffee, Utensils, Car, Home, Heart, Music } from 'lucide-react'
import { OnboardingData } from './OnboardingFlow'

interface Step3InterestsProps {
  data: OnboardingData
  onUpdate: (updates: Partial<OnboardingData>) => void
  onComplete: () => void
  onBack: () => void
  isCompleting: boolean
}

// Interest categories with icons and descriptions
const interestCategories = [
  {
    id: 'food',
    name: 'Food & Dining',
    icon: Utensils,
    description: 'Restaurants, cafes, food delivery',
    color: 'bg-orange-100 text-orange-600'
  },
  {
    id: 'shopping',
    name: 'Shopping & Retail',
    icon: ShoppingBag,
    description: 'Fashion, electronics, home goods',
    color: 'bg-purple-100 text-purple-600'
  },
  {
    id: 'coffee',
    name: 'Coffee & Beverages',
    icon: Coffee,
    description: 'Coffee shops, bars, smoothies',
    color: 'bg-amber-100 text-amber-600'
  },
  {
    id: 'automotive',
    name: 'Automotive',
    icon: Car,
    description: 'Car services, gas stations, repairs',
    color: 'bg-blue-100 text-blue-600'
  },
  {
    id: 'home',
    name: 'Home & Garden',
    icon: Home,
    description: 'Home improvement, gardening, decor',
    color: 'bg-green-100 text-green-600'
  },
  {
    id: 'health',
    name: 'Health & Beauty',
    icon: Heart,
    description: 'Spas, fitness, health services',
    color: 'bg-pink-100 text-pink-600'
  },
  {
    id: 'entertainment',
    name: 'Entertainment',
    icon: Music,
    description: 'Movies, concerts, events',
    color: 'bg-indigo-100 text-indigo-600'
  },
  {
    id: 'premium',
    name: 'Premium Services',
    icon: Star,
    description: 'Luxury experiences, premium brands',
    color: 'bg-yellow-100 text-yellow-600'
  }
]

export default function Step3Interests({ 
  data, 
  onUpdate, 
  onComplete, 
  onBack, 
  isCompleting 
}: Step3InterestsProps) {
  const [selectedInterests, setSelectedInterests] = useState<string[]>(data.interests || [])
  const [notificationPrefs, setNotificationPrefs] = useState(data.notificationPreferences)

  const toggleInterest = (interestId: string) => {
    const newInterests = selectedInterests.includes(interestId)
      ? selectedInterests.filter(id => id !== interestId)
      : [...selectedInterests, interestId]
    
    setSelectedInterests(newInterests)
    onUpdate({ interests: newInterests })
  }

  const updateNotificationPref = (key: keyof typeof notificationPrefs, value: boolean) => {
    const newPrefs = { ...notificationPrefs, [key]: value }
    setNotificationPrefs(newPrefs)
    onUpdate({ notificationPreferences: newPrefs })
  }

  const handleComplete = () => {
    // Ensure we have at least the notification preferences updated
    onUpdate({ 
      interests: selectedInterests,
      notificationPreferences: notificationPrefs
    })
    onComplete()
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Your Interests
        </h2>
        <p className="text-gray-600">
          Select categories you're interested in to personalize your deals
        </p>
      </div>

      <div className="space-y-8">
        {/* Interest Categories */}
        <div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {interestCategories.map((category) => {
              const isSelected = selectedInterests.includes(category.id)
              const IconComponent = category.icon
              
              return (
                <button
                  key={category.id}
                  onClick={() => toggleInterest(category.id)}
                  className={`
                    relative p-4 border-2 rounded-lg text-left transition-all duration-200 ease-in-out
                    ${isSelected 
                      ? 'border-indigo-500 bg-indigo-50 shadow-md' 
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                    }
                  `}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`
                      p-2 rounded-lg ${category.color}
                      ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-1' : ''}
                    `}>
                      <IconComponent className="h-5 w-5" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className={`
                          text-sm font-medium
                          ${isSelected ? 'text-indigo-900' : 'text-gray-900'}
                        `}>
                          {category.name}
                        </h4>
                        {isSelected && (
                          <div className="flex-shrink-0">
                            <div className="w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          </div>
                        )}
                      </div>
                      <p className={`
                        text-xs mt-1
                        ${isSelected ? 'text-indigo-700' : 'text-gray-500'}
                      `}>
                        {category.description}
                      </p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
          
          {selectedInterests.length > 0 && (
            <div className="mt-4 p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800">
                Great! You've selected <strong>{selectedInterests.length}</strong> categories. 
                We'll personalize your deal recommendations based on these interests.
              </p>
            </div>
          )}
        </div>

        {/* Notification Preferences */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Notification Preferences
          </h3>
          
          <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Email Notifications</h4>
                <p className="text-xs text-gray-600">Weekly deal roundup and special offers</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationPrefs.email}
                  onChange={(e) => updateNotificationPref('email', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Push Notifications</h4>
                <p className="text-xs text-gray-600">Real-time alerts for new deals near you</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationPrefs.push}
                  onChange={(e) => updateNotificationPref('push', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Deal Alerts</h4>
                <p className="text-xs text-gray-600">Notifications for deals in your selected categories</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationPrefs.deals}
                  onChange={(e) => updateNotificationPref('deals', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Final Message */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4">
          <h4 className="font-medium text-indigo-900 mb-2">You're almost done!</h4>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        <button
          onClick={onBack}
          disabled={isCompleting}
          className="flex items-center justify-center px-6 py-3 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 ease-in-out"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </button>

        <button
          onClick={handleComplete}
          disabled={isCompleting}
          className="flex-1 flex items-center justify-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 ease-in-out"
        >
          {isCompleting ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Completing Setup...
            </div>
          ) : (
            <>
              Complete Setup
              <Star className="ml-2 h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}