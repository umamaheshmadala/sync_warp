import { Bell, Mail, UserPlus, Check, Share2, Gift, Moon, Clock } from 'lucide-react';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { useSystemNotificationSettings } from '@/hooks/useSystemNotificationSettings';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useEffect } from 'react';

export default function NotificationSettings() {
    const { preferences, isLoading: isLoadingPrefs, updatePreferences, isUpdating: isUpdatingPrefs } = useNotificationPreferences();
    const { settings: systemSettings, isLoading: isLoadingSystem, updateSettings: updateSystemSettings, isUpdating: isUpdatingSystem } = useSystemNotificationSettings();

    const isLoading = isLoadingPrefs || isLoadingSystem;

    // Auto-detect and save timezone
    useEffect(() => {
        if (systemSettings?.timezone) {
            const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            if (systemSettings.timezone !== userTimezone) {
                console.log('[NotificationSettings] Updating timezone:', userTimezone);
                updateSystemSettings({ timezone: userTimezone });
            }
        }
    }, [systemSettings?.timezone]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4" />
                    <p className="text-sm text-gray-500">Loading preferences...</p>
                </div>
            </div>
        );
    }

    const handlePrefToggle = (key: keyof typeof preferences) => {
        updatePreferences({ [key]: !preferences[key] });
    };

    const handleSystemToggle = (key: keyof typeof systemSettings) => {
        if (!systemSettings) return;
        // @ts-ignore - dynamic key access
        updateSystemSettings({ [key]: !systemSettings[key] });
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6 pb-12">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Notification Settings</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Manage how you receive notifications from Sync
                </p>
            </div>

            {/* Global Settings */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bell className="h-5 w-5" />
                        Global Settings
                    </CardTitle>
                    <CardDescription>
                        Control delivery channels
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Push Notifications */}
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                                <Bell className="h-4 w-4 text-gray-500" />
                                <label className="text-sm font-medium">Push Notifications</label>
                            </div>
                            <p className="text-xs text-gray-500">
                                Receive push notifications on your device
                            </p>
                        </div>
                        <Switch
                            checked={preferences.push_enabled}
                            onCheckedChange={() => handlePrefToggle('push_enabled')}
                            disabled={isUpdatingPrefs}
                        />
                    </div>

                    <Separator />

                    {/* Email Notifications */}
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-gray-500" />
                                <label className="text-sm font-medium">Email Notifications</label>
                            </div>
                            <p className="text-xs text-gray-500">
                                Receive notifications via email
                            </p>
                        </div>
                        <Switch
                            checked={preferences.email_enabled}
                            onCheckedChange={() => handlePrefToggle('email_enabled')}
                            disabled={isUpdatingPrefs}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Quiet Hours */}
            {systemSettings && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Moon className="h-5 w-5" />
                            Quiet Hours
                        </CardTitle>
                        <CardDescription>
                            Pause notifications during specific times (Timezone: {systemSettings.timezone})
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">Enable Quiet Hours</label>
                            <Switch
                                checked={systemSettings.quiet_hours_enabled}
                                onCheckedChange={() => handleSystemToggle('quiet_hours_enabled')}
                                disabled={isUpdatingSystem}
                            />
                        </div>

                        {systemSettings.quiet_hours_enabled && (
                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
                                        <Clock className="h-3 w-3" /> Start Time
                                    </label>
                                    <input
                                        type="time"
                                        value={systemSettings.quiet_hours_start}
                                        onChange={(e) => updateSystemSettings({ quiet_hours_start: e.target.value })}
                                        className="w-full text-sm border rounded-md p-2"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
                                        <Clock className="h-3 w-3" /> End Time
                                    </label>
                                    <input
                                        type="time"
                                        value={systemSettings.quiet_hours_end}
                                        onChange={(e) => updateSystemSettings({ quiet_hours_end: e.target.value })}
                                        className="w-full text-sm border rounded-md p-2"
                                    />
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Notification Types */}
            <Card>
                <CardHeader>
                    <CardTitle>Notification Types</CardTitle>
                    <CardDescription>
                        Choose which types of notifications you want to receive
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Friends Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <UserPlus className="h-4 w-4" />
                            Friends
                        </h3>

                        {/* Friend Requests */}
                        <div className="flex items-center justify-between pl-6">
                            <div className="space-y-0.5">
                                <label className="text-sm font-medium">Friend Requests</label>
                                <p className="text-xs text-gray-500">
                                    When someone sends you a friend request
                                </p>
                            </div>
                            <Switch
                                checked={preferences.friend_requests}
                                onCheckedChange={() => handlePrefToggle('friend_requests')}
                                disabled={isUpdatingPrefs || !preferences.push_enabled}
                            />
                        </div>

                        {/* Friend Accepted */}
                        <div className="flex items-center justify-between pl-6">
                            <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                    <Check className="h-3 w-3 text-gray-400" />
                                    <label className="text-sm font-medium">Friend Accepted</label>
                                </div>
                                <p className="text-xs text-gray-500">
                                    When someone accepts your friend request
                                </p>
                            </div>
                            <Switch
                                checked={preferences.friend_accepted}
                                onCheckedChange={() => handlePrefToggle('friend_accepted')}
                                disabled={isUpdatingPrefs || !preferences.push_enabled}
                            />
                        </div>
                    </div>

                    <Separator />

                    {/* Deals Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <Share2 className="h-4 w-4" />
                            Deals
                        </h3>

                        {/* Deal Shared */}
                        <div className="flex items-center justify-between pl-6">
                            <div className="space-y-0.5">
                                <label className="text-sm font-medium">Deal Shared</label>
                                <p className="text-xs text-gray-500">
                                    When a friend shares a deal with you
                                </p>
                            </div>
                            <Switch
                                checked={preferences.deal_shared}
                                onCheckedChange={() => handlePrefToggle('deal_shared')}
                                disabled={isUpdatingPrefs || !preferences.push_enabled}
                            />
                        </div>
                    </div>

                    <Separator />

                    {/* Reminders Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <Gift className="h-4 w-4" />
                            Reminders
                        </h3>

                        {/* Birthday Reminders */}
                        <div className="flex items-center justify-between pl-6">
                            <div className="space-y-0.5">
                                <label className="text-sm font-medium">Birthday Reminders</label>
                                <p className="text-xs text-gray-500">
                                    Reminders for your friends' birthdays
                                </p>
                            </div>
                            <Switch
                                checked={preferences.birthday_reminders}
                                onCheckedChange={() => handlePrefToggle('birthday_reminders')}
                                disabled={isUpdatingPrefs || !preferences.push_enabled}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Info Note */}
            {!preferences.push_enabled && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-sm text-amber-800">
                        <strong>Note:</strong> Push notifications are disabled. Enable them to receive specific notification types.
                    </p>
                </div>
            )}
        </div>
    );
}
