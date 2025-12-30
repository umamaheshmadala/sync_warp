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
    <div className="space-y-8">
      {/* 1. Edit Profile Section */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
          <Settings className="w-5 h-5 mr-2" />
          Edit Profile
        </h2>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6">
            <ProfileEditForm />
          </div>
        </div>
      </section>

      {/* 2. Navigation Preferences (Stats Removed) */}
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
            <Switch
              checked={preferences.swipeGesturesEnabled}
              onCheckedChange={(checked) => updatePreference('swipeGesturesEnabled', checked)}
            />

          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Haptic Feedback</span>
              <p className="text-xs text-gray-500 dark:text-gray-400">Feel vibrations</p>
            </div>
            <Switch
              checked={preferences.enableHapticFeedback}
              onCheckedChange={(checked) => updatePreference('enableHapticFeedback', checked)}
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Page Animations</span>
              <p className="text-xs text-gray-500 dark:text-gray-400">Smooth transitions</p>
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
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
          <Eye className="w-5 h-5 mr-2" />
          Privacy
        </h2>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Profile Visibility</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Control who can see your profile
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
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
                <p className="font-medium text-gray-900 dark:text-white">Show Online Status</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
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
                <p className="font-medium text-gray-900 dark:text-white">Activity Tracking</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
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
      </section>

      {/* 4. Notification Settings Section */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
          <Bell className="w-5 h-5 mr-2" />
          Notifications
        </h2>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Email Notifications</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
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
                <p className="font-medium text-gray-900 dark:text-white">Push Notifications</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Receive push notifications in browser
                </p>
              </div>
              <Switch
                checked={pushNotifications}
                onCheckedChange={setPushNotifications}
              />
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <p className="font-medium text-gray-900 dark:text-white mb-3">
                Email me about:
              </p>
              <div className="space-y-3">
                <label className="flex items-center cursor-pointer">
                  <div className="relative flex items-center">
                    <input type="checkbox" defaultChecked className="peer h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  </div>
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">New messages</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <div className="relative flex items-center">
                    <input type="checkbox" defaultChecked className="peer h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  </div>
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Offer responses</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <div className="relative flex items-center">
                    <input type="checkbox" className="peer h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  </div>
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Weekly digest</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <div className="relative flex items-center">
                    <input type="checkbox" className="peer h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  </div>
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Marketing updates</span>
                </label>
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
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg shadow-sm border border-red-200 dark:border-red-900 overflow-hidden">
          <div className="p-6">
            <h4 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">Delete Account</h4>
            <p className="text-sm text-red-600 dark:text-red-300 mb-4">
              Once you delete your account, there is no going back. Please be certain.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Member since: {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Recently'}
              </span>
              <button
                onClick={handleDeleteAccount}
                className="flex items-center space-x-2 px-4 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-800 dark:hover:bg-red-700 text-red-700 dark:text-red-100 border border-red-200 dark:border-red-600 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Account</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
