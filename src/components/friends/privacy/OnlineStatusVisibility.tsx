import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { usePrivacySettings } from '@/hooks/usePrivacySettings';
import { Globe, Users, UserX } from 'lucide-react';

export function OnlineStatusVisibility() {
    const { settings, updateSetting, isUpdating } = usePrivacySettings();

    const options = [
        {
            value: 'everyone',
            label: 'Everyone',
            description: 'Anyone can see when you are online',
            icon: Globe,
        },
        {
            value: 'friends',
            label: 'Friends Only',
            description: 'Only your friends can see when you are online',
            icon: Users,
        },
        {
            value: 'no_one',
            label: 'No One',
            description: 'No one can see when you are online',
            icon: UserX,
        },
    ];

    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-lg font-medium">Online Status</h3>
                <p className="text-sm text-muted-foreground">
                    Choose who can see your online status and last active time.
                </p>
            </div>

            <RadioGroup
                value={settings?.online_status_visibility || 'everyone'}
                onValueChange={(value) => updateSetting({ key: 'online_status_visibility', value })}
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
                            <RadioGroupItem value={option.value} id={`online-${option.value}`} className="mt-1" />
                            <div className="flex-1 space-y-2">
                                <Label htmlFor={`online-${option.value}`} className="flex items-center gap-2 cursor-pointer">
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
