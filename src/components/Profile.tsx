// src/components/Profile.tsx
// User profile management page

import { useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { useNavigationPreferences } from '../hooks/useNavigationState'
import { User, MapPin, Phone, Mail, Edit3, Camera, Settings, Smartphone, MessageSquare, FileText } from 'lucide-react'
import UserReviewsList from './reviews/UserReviewsList'
import { AvatarUpload, ProfileEditForm, ProfileSettings, ProfileCompletionWizard, ActivityFeed, InlineEditField } from './profile/index'
import { useCities } from '../hooks/useCities'

export default function Profile() {
  const { user, profile, updateProfile } = useAuthStore()
  const { preferences, updatePreference } = useNavigationPreferences()
  const { cities, loading: citiesLoading } = useCities()
  const [activeTab, setActiveTab] = useState<'settings' | 'activity'>('settings')

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Profile Completion Wizard */}
      <div className="mb-8">
        <ProfileCompletionWizard onStepClick={() => setActiveTab('settings')} />
      </div>

      {/* Profile Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 mb-4">
        <div className="px-3 py-2.5">
          <div className="flex flex-col md:flex-row items-center md:items-center space-y-2 md:space-y-0 md:space-x-4">
            {/* Avatar Upload Component */}
            <div className="flex-shrink-0">
              <AvatarUpload currentAvatar={profile?.avatar_url} />
            </div>

            {/* User Info */}
            <div className="flex-1 text-center md:text-left min-w-0">
              <div className="mb-0">
                <InlineEditField
                  value={profile?.full_name || user?.user_metadata?.full_name || 'User'}
                  placeholder="Your Name"
                  maxLength={30}
                  className="text-xl font-bold"
                  onSave={async (value) => {
                    await updateProfile({ full_name: value });
                  }}
                />
              </div>
              <div className="mb-0">
                <InlineEditField
                  value={user?.email || ''}
                  placeholder="Your Email"
                  type="email"
                  icon={<Mail className="h-4 w-4" />}
                  className="text-sm text-gray-500 dark:text-gray-400"
                  onSave={async (value) => {
                    await updateProfile({ email: value });
                  }}
                />
              </div>

              {/* City Selection */}
              <div className="mb-0">
                {citiesLoading ? (
                  <div className="flex items-center text-sm text-gray-500">
                    <MapPin className="h-4 w-4 mr-2" />
                    Loading cities...
                  </div>
                ) : (
                  <InlineEditField
                    value={profile?.city || ''}
                    type="select"
                    placeholder="Select your city"
                    icon={<MapPin className="h-4 w-4" />}
                    className="text-sm text-gray-600 dark:text-gray-300"
                    options={cities.map(city => ({
                      label: `${city.name}, ${city.state} `,
                      value: city.name
                    }))}
                    onSave={async (value) => {
                      await updateProfile({ city: value });
                    }}
                  />
                )}
              </div>
              <div className="mt-0.5">
                <InlineEditField
                  value={profile?.bio || ''}
                  multiline
                  maxLength={150}
                  placeholder="Describe yourself..."
                  icon={<FileText className="h-4 w-4" />}
                  className="text-sm text-gray-600 dark:text-gray-300"
                  onSave={async (value) => {
                    await updateProfile({ bio: value });
                  }}
                  validate={(value) => {
                    if (value.length > 150) return 'Bio must be 150 characters or less';
                    return null;
                  }}
                />
              </div>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-1.5 text-sm text-gray-500 dark:text-gray-400">


              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-t border-gray-200 dark:border-gray-700">
          <div className="flex">
            {[
              { id: 'settings', label: 'Settings' },
              { id: 'activity', label: 'Activity' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex - 1 px - 6 py - 4 text - sm font - medium transition - colors ${activeTab === tab.id
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  } `}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>





      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="max-w-4xl mx-auto">
          <ProfileSettings />
        </div>
      )}

      {/* Activity Tab */}
      {activeTab === 'activity' && (
        <div className="max-w-4xl mx-auto">
          <ActivityFeed />
        </div>
      )}
    </div>
  )
}
