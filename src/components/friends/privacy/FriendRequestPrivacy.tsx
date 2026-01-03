import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { usePrivacySettings } from '@/hooks/usePrivacySettings';
import { Globe, Users, UserX } from 'lucide-react';

export function FriendRequestPrivacy() {
    const { settings, updateSetting, isUpdating } = usePrivacySettings();

    const options = [
        {
            value: 'everyone',
            label: 'Everyone',
            description: 'Anyone can send you friend requests',
            icon: Globe,
        },
        {
            value: 'friends_of_friends',
            label: 'Friends of Friends',
            description: 'Only friends of your friends can send requests',
            icon: Users,
        },
        {
            value: 'no_one',
            label: 'No One',
            description: 'You won\'t receive any friend requests',
            icon: UserX,
        },
    ];

    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-lg font-medium">Friend Requests</h3>
                <p className="text-sm text-muted-foreground">
                    Choose who can send you friend requests.
                </p>
            </div>

            <RadioGroup
                value={settings?.friend_requests || 'everyone'}
                onValueChange={(value) => updateSetting({ key: 'friend_requests', value })}
                disabled={isUpdating}
                className="space-y-3"
            >
                {options.map((option) => {
                    const Icon = option.icon;
                    return (
                        <div
                            key={option.value}
                            className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent/50 transition-colors"
                        >
                            <RadioGroupItem value={option.value} id={`privacy-${option.value}`} className="mt-1" />
                            <div className="flex-1 space-y-2">
                                <Label htmlFor={`privacy-${option.value}`} className="flex items-center gap-2 cursor-pointer">
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
    );
}
