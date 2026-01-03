import React, { useState, useEffect } from 'react';
import { Settings, Bell, Eye, Shield, Trash2, Smartphone, Mail, Moon, Clock, UserPlus, Check, Share2, Gift } from 'lucide-react';
import { Switch } from '../ui/switch';
import { useAuthStore } from '../../store/authStore';
import { useNavigationPreferences } from '../../hooks/useNavigationState';
import { ProfileEditForm } from './ProfileEditForm';

import { ReadReceiptPrivacy } from '../friends/privacy/ReadReceiptPrivacy';
import { usePrivacySettings } from '@/hooks/usePrivacySettings';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { useSystemNotificationSettings } from '@/hooks/useSystemNotificationSettings';
import { Separator } from '@/components/ui/separator';

import { DeleteAccountModal } from './DeleteAccountModal';

export const ProfileSettings: React.FC = () => {
  const { profile, user, updateProfile } = useAuthStore();
  const { preferences: navPreferences, updatePreference } = useNavigationPreferences();

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Notification Hooks
  const { preferences: notifPrefs, isLoading: isLoadingNotif, updatePreferences: updateNotifPrefs, isUpdating: isUpdatingNotif } = useNotificationPreferences();
  const { settings: systemSettings, isLoading: isLoadingSystem, updateSettings: updateSystemSettings, isUpdating: isUpdatingSystem } = useSystemNotificationSettings();
  const { settings: privacySettings, updateSettings: updatePrivacySettings, isUpdating: isUpdatingPrivacy } = usePrivacySettings();



  // Auto-detect and save timezone (from NotificationSettings logic)
  useEffect(() => {
    if (systemSettings?.timezone) {
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (systemSettings.timezone !== userTimezone) {
        console.log('[ProfileSettings] Updating timezone:', userTimezone);
        updateSystemSettings({ timezone: userTimezone });
      }
    }
  }, [systemSettings?.timezone]);

  const handleNotifToggle = (key: keyof typeof notifPrefs) => {
    updateNotifPrefs({ [key]: !notifPrefs[key] });
  };

  const handleSystemToggle = (key: keyof typeof systemSettings) => {
    if (!systemSettings) return;
    // @ts-ignore
    updateSystemSettings({ [key]: !systemSettings[key] });
  };

  const confirmDeleteAccount = () => {
    // Implement account deletion logic
    console.log('Account deletion confirmed');
    setShowDeleteModal(false);
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
          Navigation
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-1">
            <div>
              <span className="text-sm font-medium text-gray-900">Swipe Gestures</span>
              <p className="text-xs text-gray-500">Navigate between pages</p>
            </div>
            <Switch
              checked={navPreferences.swipeGesturesEnabled}
              onCheckedChange={(checked) => updatePreference('swipeGesturesEnabled', checked)}
            />
          </div>

          <div className="flex items-center justify-between py-1">
            <div>
              <span className="text-sm font-medium text-gray-900">Haptic Feedback</span>
              <p className="text-xs text-gray-500">Feel vibrations</p>
            </div>
            <Switch
              checked={navPreferences.enableHapticFeedback}
              onCheckedChange={(checked) => updatePreference('enableHapticFeedback', checked)}
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
            <div className="space-y-4">
              {/* Read Receipts Privacy */}
              <div>
                <ReadReceiptPrivacy />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Private Profile</p>
                  <p className="text-xs text-gray-500">
                    Hide your profile from global search results
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={privacySettings?.profile_visibility === 'friends'}
                    onCheckedChange={(checked) => updatePrivacySettings({ profile_visibility: checked ? 'friends' : 'public' })}
                    disabled={isUpdatingPrivacy}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Show Online Status</p>
                  <p className="text-xs text-gray-500">
                    Let others see when you're online
                  </p>
                </div>
                <Switch
                  checked={privacySettings?.online_status_visibility === 'everyone'}
                  onCheckedChange={(checked) => updatePrivacySettings({ online_status_visibility: checked ? 'everyone' : 'no_one' })}
                  disabled={isUpdatingPrivacy}
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
              {isLoadingNotif ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" />
                </div>
              ) : (
                <>
                  {/* Global Channels */}
                  <div className="space-y-3">
                    {/* Email Notifications (Disabled) */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Email Notifications</p>
                        <p className="text-xs text-gray-500">Receive specific updates via email</p>
                        <p className="text-[10px] text-amber-600 font-medium mt-0.5">Note: Email service is not currently integrated.</p>
                      </div>
                      <Switch
                        checked={false}
                        onCheckedChange={() => { }}
                        disabled={true}
                      />
                    </div>

                    {/* Push Notifications */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Push Notifications</p>
                        <p className="text-xs text-gray-500">Receive notifications on this device</p>
                      </div>
                      <Switch
                        checked={notifPrefs.push_enabled}
                        onCheckedChange={() => handleNotifToggle('push_enabled')}
                        disabled={isUpdatingNotif}
                      />
                    </div>
                  </div>

                  {/* Quiet Hours */}
                  {systemSettings && (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">Quiet Hours</p>
                          <p className="text-xs text-gray-500">Pause notifications during specific times ({systemSettings.timezone})</p>
                        </div>
                        <Switch
                          checked={systemSettings.quiet_hours_enabled}
                          onCheckedChange={() => handleSystemToggle('quiet_hours_enabled')}
                          disabled={isUpdatingSystem}
                        />
                      </div>

                      {systemSettings.quiet_hours_enabled && (
                        <div className="grid grid-cols-2 gap-4 pl-0">
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                              Start Time
                            </label>
                            <input
                              type="time"
                              value={systemSettings.quiet_hours_start}
                              onChange={(e) => updateSystemSettings({ quiet_hours_start: e.target.value })}
                              className="w-full text-xs border border-gray-300 rounded-md px-2 py-1.5 bg-gray-50 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                              End Time
                            </label>
                            <input
                              type="time"
                              value={systemSettings.quiet_hours_end}
                              onChange={(e) => updateSystemSettings({ quiet_hours_end: e.target.value })}
                              className="w-full text-xs border border-gray-300 rounded-md px-2 py-1.5 bg-gray-50 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Specific Types (Friends) */}
                  <div className="space-y-3 pt-2">
                    <h3 className="text-sm font-medium text-gray-900">
                      Friend Activity
                    </h3>
                    <p className="text-[10px] text-amber-600 font-medium mt-0.5">The backend is implemented, but it hasn't been user-tested yet.</p>
                    <div className="pl-0 space-y-3">
                      <div className="flex items-center justify-between group py-0.5">
                        <label className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                          Friend Requests
                        </label>
                        <Switch
                          checked={notifPrefs.friend_requests}
                          onCheckedChange={() => handleNotifToggle('friend_requests')}
                          disabled={!notifPrefs.push_enabled}
                        />
                      </div>
                      <div className="flex items-center justify-between group py-0.5">
                        <label className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                          Friend Accepted
                        </label>
                        <Switch
                          checked={notifPrefs.friend_accepted}
                          onCheckedChange={() => handleNotifToggle('friend_accepted')}
                          disabled={!notifPrefs.push_enabled}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Specific Types (Deals & Reminders) */}
                  <div className="space-y-3 pt-2">
                    <h3 className="text-sm font-medium text-gray-900">
                      Reminders & Promotion
                    </h3>
                    <p className="text-[10px] text-amber-600 font-medium mt-0.5">The backend is implemented, but it hasn't been user-tested yet.</p>
                    <div className="pl-0 space-y-3">
                      <div className="flex items-center justify-between group py-0.5">
                        <label className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                          Birthday Reminders
                        </label>
                        <Switch
                          checked={notifPrefs.birthday_reminders}
                          onCheckedChange={() => handleNotifToggle('birthday_reminders')}
                          disabled={!notifPrefs.push_enabled}
                        />
                      </div>
                      <div className="flex items-center justify-between group py-0.5">
                        <label className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                          Deal Sharing
                        </label>
                        <Switch
                          checked={notifPrefs.deal_shared}
                          onCheckedChange={() => handleNotifToggle('deal_shared')}
                          disabled={!notifPrefs.push_enabled}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section >



      {/* 6. Danger Zone */}
      < section >
        <div className="bg-red-50 rounded-lg shadow-sm border border-red-200 overflow-hidden">
          <div className="p-4 flex items-center justify-between gap-4">
            <div>
              <h4 className="text-base font-semibold text-red-700 flex flex-wrap items-baseline gap-2">
                Delete Account
                <span className="text-xs font-normal text-red-500/80">
                  • Joined {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-GB') : 'Recently'}
                </span>
              </h4>
              <p className="text-xs text-red-600 mt-0.5 max-w-[250px] sm:max-w-none">
                This action cannot be undone.
              </p>
            </div>

            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex-shrink-0 flex items-center space-x-2 px-3 py-1.5 bg-red-100/50 hover:bg-red-200/50 text-red-700 border border-red-200 rounded-lg transition-colors text-sm"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      </section >

      {/* Delete Confirmation Modal */}
      < DeleteAccountModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDeleteAccount}
      />
    </div >
  );
};
