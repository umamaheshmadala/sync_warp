import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { usePrivacySettings } from '@/hooks/usePrivacySettings';
import { Globe, Users, UserCheck, Search } from 'lucide-react';

export function ProfileVisibilitySettings() {
    const { settings, updateSetting, isUpdating } = usePrivacySettings();

    const visibilityOptions = [
        {
            value: 'public',
            label: 'Public',
            description: 'Anyone can view your profile details',
            icon: Globe,
        },
        {
            value: 'friends_of_friends',
            label: 'Friends of Friends',
            description: 'Only friends and their friends can view your profile',
            icon: Users,
        },
        {
            value: 'friends',
            label: 'Friends Only',
            description: 'Only your direct friends can view your profile',
            icon: UserCheck,
        },
    ];

    return (
        <div className="space-y-8">
            {/* Profile Visibility Section */}
            <div className="space-y-4">
                <div>
                    <h3 className="text-lg font-medium">Profile Visibility</h3>
                    <p className="text-sm text-muted-foreground">
                        Control who can see your profile details, posts, and activity.
                    </p>
                </div>

                <RadioGroup
                    value={settings?.profile_visibility || 'public'}
                    onValueChange={(value) => updateSetting({ key: 'profile_visibility', value })}
                    disabled={isUpdating}
                    className="space-y-3"
                >
                    {visibilityOptions.map((option) => {
                        const Icon = option.icon;
                        return (
                            <div
                                key={option.value}
                                className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent/50 transition-colors"
                            >
                                <RadioGroupItem value={option.value} id={`profile-${option.value}`} className="mt-1" />
                                <div className="flex-1 space-y-2">
                                    <Label htmlFor={`profile-${option.value}`} className="flex items-center gap-2 cursor-pointer">
                                        <Icon className="h-4 w-4" />
                                        <span className="font-medium">{option.label}</span>
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        {option.description}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </RadioGroup>
            </div>

            {/* Search Visibility Section */}
            <div className="space-y-4">
                <div>
                    <h3 className="text-lg font-medium">Search Visibility</h3>
                    <p className="text-sm text-muted-foreground">
                        Manage how people can find you on the platform.
                    </p>
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4 hover:bg-accent/50 transition-colors">
                    <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                            <Search className="h-4 w-4" />
                            <Label htmlFor="search-visibility" className="text-base font-medium cursor-pointer">
                                Show me in search results
                            </Label>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            If disabled, people won't be able to find you by searching for your name or username.
                        </p>
                    </div>
                    <Switch
                        id="search-visibility"
                        checked={settings?.search_visibility ?? true}
                        onCheckedChange={(checked) => updateSetting({ key: 'search_visibility', value: checked })}
                        disabled={isUpdating}
                    />
                </div>
            </div>
        </div>
    );
}
