// src/components/Profile.tsx
// User profile management page

import { useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { useNavigationPreferences } from '../hooks/useNavigationState'
import { User, MapPin, Phone, Mail, Edit3, Camera, Settings, Smartphone, MessageSquare } from 'lucide-react'
import UserReviewsList from './reviews/UserReviewsList'
import { AvatarUpload, ProfileEditForm, ProfileSettings, ProfileCompletionWizard, ActivityFeed } from './profile/index'

export default function Profile() {
  const { user, profile } = useAuthStore()
  const { preferences, updatePreference } = useNavigationPreferences()
  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'edit' | 'settings' | 'activity'>('overview')

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Profile Completion Wizard */}
      <div className="mb-8">
        <ProfileCompletionWizard onStepClick={() => setActiveTab('edit')} />
      </div>

      {/* Profile Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 mb-8">
        <div className="px-6 py-8">
          <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-6">
            {/* Avatar Upload Component */}
            <div className="flex-shrink-0">
              <AvatarUpload currentAvatar={profile?.avatar_url} />
            </div>

            {/* User Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {profile?.full_name || user?.user_metadata?.full_name || 'User'}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">{user?.email}</p>
              {profile?.bio && (
                <p className="text-gray-700 dark:text-gray-300 mt-3 max-w-2xl">{profile.bio}</p>
              )}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-4 text-sm text-gray-500 dark:text-gray-400">
                {profile?.location && (
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    {profile.location}
                  </div>
                )}
                {profile?.website && (
                  <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700">
                    🌐 Website
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-t border-gray-200 dark:border-gray-700">
          <div className="flex">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'edit', label: 'Edit Profile' },
              { id: 'settings', label: 'Settings' },
              { id: 'activity', label: 'Activity' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Profile Information Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 pb-3 border-b border-gray-200 dark:border-gray-700">Profile Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Address
                </label>
                <div className="flex items-center">
                  <Mail className="h-5 w-5 text-gray-400 mr-3" />
                  <span className="text-gray-900 dark:text-white">{user?.email}</span>
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Phone Number
                </label>
                <div className="flex items-center">
                  <Phone className="h-5 w-5 text-gray-400 mr-3" />
                  <span className="text-gray-900 dark:text-white">
                    {profile?.phone || 'Not provided'}
                  </span>
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  City
                </label>
                <div className="flex items-center">
                  <MapPin className="h-5 w-5 text-gray-400 mr-3" />
                  <span className="text-gray-900 dark:text-white">
                    {profile?.city || 'Not provided'}
                  </span>
                </div>
              </div>

              {/* Interests - Full width */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Interests
                </label>
                <div className="flex flex-wrap gap-2">
                  {profile?.interests?.length ? (
                    profile.interests.map((interest, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 rounded-full text-sm"
                      >
                        {interest}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-500 dark:text-gray-400">No interests selected</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Stats and Preferences Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Account Stats */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">Account Stats</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600 dark:text-gray-400">Member since</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Recently'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600 dark:text-gray-400">Deals saved</span>
                  <span className="font-medium text-gray-900 dark:text-white">0</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600 dark:text-gray-400">Reviews written</span>
                  <span className="font-medium text-gray-900 dark:text-white">0</span>
                </div>
              </div>
            </div>

            {/* Navigation Preferences */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 pb-3 border-b border-gray-200 dark:border-gray-700 flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Navigation Preferences
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center">
                    <Smartphone className="h-4 w-4 text-gray-400 mr-2" />
                    <div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Swipe Gestures</span>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Navigate between pages</p>
                    </div>
                  </div>
                  <button
                    onClick={() => updatePreference('swipeGesturesEnabled', !preferences.swipeGesturesEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      preferences.swipeGesturesEnabled ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                        preferences.swipeGesturesEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                
                <div className="flex items-center justify-between py-2">
                  <div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Haptic Feedback</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Feel vibrations</p>
                  </div>
                  <button
                    onClick={() => updatePreference('enableHapticFeedback', !preferences.enableHapticFeedback)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      preferences.enableHapticFeedback ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                        preferences.enableHapticFeedback ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                
                <div className="flex items-center justify-between py-2">
                  <div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Page Animations</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Smooth transitions</p>
                  </div>
                  <button
                    onClick={() => updatePreference('enableAnimations', !preferences.enableAnimations)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      preferences.enableAnimations ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                        preferences.enableAnimations ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* User Reviews Section */}
          <div>
            <UserReviewsList />
          </div>
        </div>
      )}

      {/* Edit Profile Tab */}
      {activeTab === 'edit' && (
        <div className="max-w-4xl mx-auto">
          <ProfileEditForm />
        </div>
      )}

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
