import { Bell, Mail, UserPlus, Check, Share2, Gift } from 'lucide-react';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function NotificationSettings() {
    const { preferences, isLoading, updatePreferences, isUpdating } = useNotificationPreferences();

    console.log('[NotificationSettings] Component rendered', { preferences, isLoading, isUpdating });

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

    const handleToggle = (key: keyof typeof preferences) => {
        console.log('[NotificationSettings] handleToggle called', { key, currentValue: preferences[key], newValue: !preferences[key] });
        console.log('[NotificationSettings] updatePreferences function:', typeof updatePreferences);

        try {
            updatePreferences({ [key]: !preferences[key] });
            console.log('[NotificationSettings] updatePreferences called successfully');
        } catch (error) {
            console.error('[NotificationSettings] Error calling updatePreferences:', error);
            window.alert(`Error in handleToggle: ${error}`);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
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
                        Control all notifications at once
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
                            onCheckedChange={() => handleToggle('push_enabled')}
                            disabled={isUpdating}
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
                            onCheckedChange={() => handleToggle('email_enabled')}
                            disabled={isUpdating}
                        />
                    </div>
                </CardContent>
            </Card>

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
                                onCheckedChange={() => handleToggle('friend_requests')}
                                disabled={isUpdating || !preferences.push_enabled}
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
                                onCheckedChange={() => handleToggle('friend_accepted')}
                                disabled={isUpdating || !preferences.push_enabled}
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
                                onCheckedChange={() => handleToggle('deal_shared')}
                                disabled={isUpdating || !preferences.push_enabled}
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
                                onCheckedChange={() => handleToggle('birthday_reminders')}
                                disabled={isUpdating || !preferences.push_enabled}
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
