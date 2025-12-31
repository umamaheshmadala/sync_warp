import React, { useState } from 'react';
import { Settings, Bell, Eye, Shield, Trash2, Smartphone, MapPin } from 'lucide-react';
import { Switch } from '../ui/switch';
import { useAuthStore } from '../../store/authStore';
import { useNavigationPreferences } from '../../hooks/useNavigationState';
import { ProfileEditForm } from './ProfileEditForm';
import UserReviewsList from '../reviews/UserReviewsList';

export const ProfileSettings: React.FC = () => {
  const { profile, user, updateProfile } = useAuthStore();
  const { preferences, updatePreference } = useNavigationPreferences();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [profileVisibility, setProfileVisibility] = useState<'public' | 'private'>('public');
  const [onlineStatus, setOnlineStatus] = useState(true);
  const [activityTracking, setActivityTracking] = useState(true);

  const handleDeleteAccount = () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      // Implement account deletion logic
      console.log('Account deletion requested');
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Edit Profile Section */}
      <section>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4">
            <ProfileEditForm />
          </div>
        </div>
      </section>

      {/* 2. Navigation Preferences (Stats Removed) */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-200 flex items-center">
          <Settings className="h-5 w-5 mr-2" />
          Navigation Preferences
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center">
              <Smartphone className="h-4 w-4 text-gray-400 mr-2" />
              <div>
                <span className="text-sm font-medium text-gray-700">Swipe Gestures</span>
                <p className="text-xs text-gray-500">Navigate between pages</p>
              </div>
            </div>
            <Switch
              checked={preferences.swipeGesturesEnabled}
              onCheckedChange={(checked) => updatePreference('swipeGesturesEnabled', checked)}
            />

          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <span className="text-sm font-medium text-gray-700">Haptic Feedback</span>
              <p className="text-xs text-gray-500">Feel vibrations</p>
            </div>
            <Switch
              checked={preferences.enableHapticFeedback}
              onCheckedChange={(checked) => updatePreference('enableHapticFeedback', checked)}
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <span className="text-sm font-medium text-gray-700">Page Animations</span>
              <p className="text-xs text-gray-500">Smooth transitions</p>
            </div>
            <Switch
              checked={preferences.enableAnimations}
              onCheckedChange={(checked) => updatePreference('enableAnimations', checked)}
            />
          </div>
        </div>
      </div>

      {/* 3. Privacy Settings Section */}
      <section>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-200 flex items-center">
              <Eye className="w-5 h-5 mr-2" />
              Privacy
            </h2>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Profile Visibility</p>
                  <p className="text-sm text-gray-500">
                    Control who can see your profile
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-900">
                    {profileVisibility === 'public' ? 'Public' : 'Private'}
                  </span>
                  <Switch
                    checked={profileVisibility === 'public'}
                    onCheckedChange={(checked) => setProfileVisibility(checked ? 'public' : 'private')}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Show Online Status</p>
                  <p className="text-sm text-gray-500">
                    Let others see when you're online
                  </p>
                </div>
                <Switch
                  checked={onlineStatus}
                  onCheckedChange={setOnlineStatus}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Activity Tracking</p>
                  <p className="text-sm text-gray-500">
                    Allow us to track your activity for analytics
                  </p>
                </div>
                <Switch
                  checked={activityTracking}
                  onCheckedChange={setActivityTracking}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Notification Settings Section */}
      <section>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-200 flex items-center">
              <Bell className="w-5 h-5 mr-2" />
              Notifications
            </h2>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Email Notifications</p>
                  <p className="text-sm text-gray-500">
                    Receive updates via email
                  </p>
                </div>
                <Switch
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Push Notifications</p>
                  <p className="text-sm text-gray-500">
                    Receive push notifications in browser
                  </p>
                </div>
                <Switch
                  checked={pushNotifications}
                  onCheckedChange={setPushNotifications}
                />
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="font-medium text-gray-900 mb-3">
                  Email me about:
                </p>
                <div className="space-y-3">
                  <label className="flex items-center cursor-pointer">
                    <div className="relative flex items-center">
                      <input type="checkbox" defaultChecked className="peer h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    </div>
                    <span className="ml-2 text-sm text-gray-700">New messages</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <div className="relative flex items-center">
                      <input type="checkbox" defaultChecked className="peer h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    </div>
                    <span className="ml-2 text-sm text-gray-700">Offer responses</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <div className="relative flex items-center">
                      <input type="checkbox" className="peer h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    </div>
                    <span className="ml-2 text-sm text-gray-700">Weekly digest</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <div className="relative flex items-center">
                      <input type="checkbox" className="peer h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    </div>
                    <span className="ml-2 text-sm text-gray-700">Marketing updates</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. User Reviews Section */}
      <section>
        <UserReviewsList />
      </section>

      {/* 6. Danger Zone */}
      <section>
        <div className="bg-red-50 rounded-lg shadow-sm border border-red-200 overflow-hidden">
          <div className="p-4 flex items-center justify-between gap-4">
            <div>
              <h4 className="text-base font-semibold text-red-700 flex flex-wrap items-baseline gap-2">
                Delete Account
                <span className="text-xs font-normal text-red-500/80">
                  (Member since: {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Recently'})
                </span>
              </h4>
              <p className="text-xs text-red-600 mt-0.5">
                Once you delete your account, there is no going back. Please be certain.
              </p>
            </div>

            <button
              onClick={handleDeleteAccount}
              className="flex-shrink-0 flex items-center space-x-2 px-3 py-1.5 bg-red-100/50 hover:bg-red-200/50 text-red-700 border border-red-200 rounded-lg transition-colors text-sm"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
