// src/components/Profile.tsx
// User profile management page

import { useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { useNavigationPreferences } from '../hooks/useNavigationState'
import { User, MapPin, Phone, Mail, Edit3, Camera, Settings, Smartphone, MessageSquare, FileText } from 'lucide-react'
import UserReviewsList from './reviews/UserReviewsList'
import { AvatarUpload, ProfileEditForm, ProfileSettings, ProfileCompletionWizard, InlineEditField, MyActivityTab } from './profile/index'
import { useCities } from '../hooks/useCities'

export default function Profile() {
  const { user, profile, updateProfile } = useAuthStore()
  const { preferences, updatePreference } = useNavigationPreferences()
  const { cities, loading: citiesLoading } = useCities()
  const [activeTab, setActiveTab] = useState<'settings' | 'activity'>('settings')

  // Global edit mode
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [editFullName, setEditFullName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editCity, setEditCity] = useState('')
  const [editBio, setEditBio] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleStartEdit = () => {
    setEditFullName(profile?.full_name || user?.user_metadata?.full_name || '')
    setEditEmail(user?.email || '')
    setEditCity(profile?.city || '')
    setEditBio(profile?.bio || '')
    setIsEditingProfile(true)
  }

  const handleSaveProfile = async () => {
    setIsSaving(true)
    try {
      await updateProfile({
        full_name: editFullName.trim(),
        city: editCity,
        bio: editBio.trim(),
      })
      setIsEditingProfile(false)
    } catch (error) {
      console.error('Failed to save profile:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setIsEditingProfile(false)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-4">
      {/* Profile Completion Wizard */}
      <ProfileCompletionWizard onStepClick={() => setActiveTab('settings')} />

      {/* Profile Header */}
      <div className="bg-white text-gray-900 rounded-lg shadow-md border border-gray-200 mb-2 relative">
        {/* Single Edit Button in top right corner */}
        {!isEditingProfile && (
          <button
            onClick={handleStartEdit}
            className="absolute top-3 right-3 z-10 p-2 text-gray-400 hover:text-blue-600 transition-all hover:bg-blue-50 rounded-lg"
            title="Edit Profile"
          >
            <Edit3 className="h-5 w-5" />
          </button>
        )}

        <div className="px-3 py-2.5">
          <div className="flex flex-col md:flex-row items-center md:items-center space-y-2 md:space-y-0 md:space-x-4">
            {/* Avatar Upload Component */}
            <div className="flex-shrink-0">
              <AvatarUpload currentAvatar={profile?.avatar_url} />
            </div>

            {/* User Info */}
            <div className="flex-1 text-center md:text-left min-w-0 space-y-1">
              {/* Name */}
              <div>
                <InlineEditField
                  value={profile?.full_name || user?.user_metadata?.full_name || 'User'}
                  placeholder="Your Name"
                  maxLength={30}
                  className="text-lg font-bold text-gray-900 leading-tight"
                  editable={isEditingProfile}
                  globalEditMode={isEditingProfile}
                  externalValue={editFullName}
                  onValueChange={setEditFullName}
                  onSave={async (value) => {
                    await updateProfile({ full_name: value });
                  }}
                />
              </div>

              {/* Email - No Icon */}
              <div>
                <InlineEditField
                  value={user?.email || ''}
                  placeholder="Your Email"
                  type="email"
                  className="text-sm text-gray-500 font-medium"
                  editable={false}
                  globalEditMode={isEditingProfile}
                  externalValue={editEmail}
                  onValueChange={setEditEmail}
                  onSave={async (value) => {
                    await updateProfile({ email: value });
                  }}
                />
              </div>

              {/* City - No Icon */}
              <div>
                {citiesLoading ? (
                  <div className="flex items-center justify-center md:justify-start text-sm text-gray-400">
                    <span className="loader mr-2" /> Loading...
                  </div>
                ) : (
                  <InlineEditField
                    value={profile?.city || ''}
                    type="select"
                    placeholder="Select City"
                    className="text-sm text-gray-500 font-medium"
                    editable={isEditingProfile}
                    globalEditMode={isEditingProfile}
                    externalValue={editCity}
                    onValueChange={setEditCity}
                    options={Array.from(new Map(cities.map(city => [city.name, city])).values()).map(city => ({
                      label: `${city.name}, ${city.state}`,
                      value: city.name
                    }))}
                    onSave={async (value) => {
                      await updateProfile({ city: value });
                    }}
                  />
                )}
              </div>

              {/* Bio - No Icon */}
              <div>
                <InlineEditField
                  value={profile?.bio || ''}
                  multiline
                  maxLength={150}
                  placeholder="Add a bio..."
                  className="text-sm text-gray-600 mt-1"
                  editable={isEditingProfile}
                  globalEditMode={isEditingProfile}
                  externalValue={editBio}
                  onValueChange={setEditBio}
                  onSave={async (value) => {
                    await updateProfile({ bio: value });
                  }}
                  validate={(value) => {
                    if (value.length > 150) return 'Bio must be 150 characters or less';
                    return null;
                  }}
                />
              </div>

              {/* Save/Cancel buttons when in edit mode */}
              {isEditingProfile && (
                <div className="flex gap-2 justify-center md:justify-start mt-3">
                  <button
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </>
                    ) : 'Save Changes'}
                  </button>
                </div>
              )
              }
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-t border-gray-100">
          <div className="flex">
            {[
              { id: 'settings', label: 'Settings' },
              { id: 'activity', label: 'My Activity' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${activeTab === tab.id
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
      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="max-w-4xl mx-auto">
          <ProfileSettings />
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        <MyActivityTab />
      </div>
    </div>
  )
}
