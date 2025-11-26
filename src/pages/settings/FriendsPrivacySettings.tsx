import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BlockList } from '@/components/friends/privacy/BlockList';
import { PrivacyAuditLog } from '@/components/privacy/PrivacyAuditLog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Download, Shield, UserX, Save, RotateCcw, Check } from 'lucide-react';
import { privacyService } from '@/services/privacyService';
import { usePrivacySettings, PrivacySettings } from '@/hooks/usePrivacySettings';
import { toast } from 'react-hot-toast';

const DEFAULT_SETTINGS: Partial<PrivacySettings> = {
    friend_requests: 'everyone',
    profile_visibility: 'public',
    search_visibility: true,
    online_status_visibility: 'friends',
};

export function FriendsPrivacySettings() {
    const navigate = useNavigate();
    const { settings, isLoading, updateSettings } = usePrivacySettings();
    const [isExporting, setIsExporting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // Local state for form
    const [friendRequests, setFriendRequests] = useState<PrivacySettings['friend_requests']>('everyone');
    const [profileVisibility, setProfileVisibility] = useState<PrivacySettings['profile_visibility']>('public');
    const [searchVisibility, setSearchVisibility] = useState(true);
    const [onlineStatus, setOnlineStatus] = useState<PrivacySettings['online_status_visibility']>('friends');

    // Load settings from server
    useEffect(() => {
        if (settings) {
            setFriendRequests(settings.friend_requests || 'everyone');
            setProfileVisibility(settings.profile_visibility || 'public');
            setSearchVisibility(settings.search_visibility ?? true);
            setOnlineStatus(settings.online_status_visibility || 'friends');
        }
    }, [settings]);

    // Check for changes
    useEffect(() => {
        if (settings) {
            const changed =
                friendRequests !== (settings.friend_requests || 'everyone') ||
                profileVisibility !== (settings.profile_visibility || 'public') ||
                searchVisibility !== (settings.search_visibility ?? true) ||
                onlineStatus !== (settings.online_status_visibility || 'friends');
            setHasChanges(changed);
        }
    }, [friendRequests, profileVisibility, searchVisibility, onlineStatus, settings]);

    const handleSave = async () => {
        try {
            setIsSaving(true);
            await updateSettings({
                friend_requests: friendRequests,
                profile_visibility: profileVisibility,
                search_visibility: searchVisibility,
                online_status_visibility: onlineStatus,
            });
            toast.success('Privacy settings saved successfully');
            setHasChanges(false);
        } catch (error: any) {
            toast.error(error.message || 'Failed to save settings');
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = () => {
        setFriendRequests(DEFAULT_SETTINGS.friend_requests);
        setProfileVisibility(DEFAULT_SETTINGS.profile_visibility);
        setSearchVisibility(DEFAULT_SETTINGS.search_visibility);
        setOnlineStatus(DEFAULT_SETTINGS.online_status_visibility);
    };

    const handleExportData = async () => {
        try {
            setIsExporting(true);
            const { data, success, error } = await privacyService.exportUserData();

            if (!success || !data) {
                throw new Error(error || 'Failed to export data');
            }

            // Create and download JSON file
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `my-data-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            toast.success('Data exported successfully');
        } catch (error: any) {
            toast.error(error.message || 'Failed to export data');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="container max-w-3xl mx-auto py-6 px-4 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">Friends & Privacy</h1>
                    <p className="text-muted-foreground">Manage your privacy settings and blocked users</p>
                </div>
            </div>

            <Tabs defaultValue="privacy" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="privacy" className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Privacy Settings
                    </TabsTrigger>
                    <TabsTrigger value="blocking" className="flex items-center gap-2">
                        <UserX className="h-4 w-4" />
                        Blocked Users
                    </TabsTrigger>
                </TabsList>

                {/* Privacy Settings Tab */}
                <TabsContent value="privacy" className="space-y-6">
                    <div className="bg-card rounded-lg border p-6 space-y-6">
                        {/* Friend Requests */}
                        <div className="space-y-3">
                            <div>
                                <label className="text-sm font-medium">Who can send you friend requests?</label>
                                <p className="text-xs text-muted-foreground">Control who can send you friend requests</p>
                            </div>
                            <Select value={friendRequests} onValueChange={(value) => setFriendRequests(value as PrivacySettings['friend_requests'])}>
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-popover border shadow-md">
                                    <SelectItem value="everyone">
                                        <div className="flex items-center gap-2">
                                            <Check className={friendRequests === 'everyone' ? 'h-4 w-4 text-primary' : 'h-4 w-4 opacity-0'} />
                                            <div>
                                                <div className="font-medium">Everyone</div>
                                                <div className="text-xs text-muted-foreground">Anyone can send you requests</div>
                                            </div>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="friends_of_friends">
                                        <div className="flex items-center gap-2">
                                            <Check className={friendRequests === 'friends_of_friends' ? 'h-4 w-4 text-primary' : 'h-4 w-4 opacity-0'} />
                                            <div>
                                                <div className="font-medium">Friends of Friends</div>
                                                <div className="text-xs text-muted-foreground">Only mutual connections</div>
                                            </div>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="no_one">
                                        <div className="flex items-center gap-2">
                                            <Check className={friendRequests === 'no_one' ? 'h-4 w-4 text-primary' : 'h-4 w-4 opacity-0'} />
                                            <div>
                                                <div className="font-medium">No One</div>
                                                <div className="text-xs text-muted-foreground">Block all requests</div>
                                            </div>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="border-t" />

                        {/* Profile Visibility */}
                        <div className="space-y-3">
                            <div>
                                <label className="text-sm font-medium">Who can view your profile?</label>
                                <p className="text-xs text-muted-foreground">Control who can see your full profile</p>
                            </div>
                            <Select value={profileVisibility} onValueChange={(value) => setProfileVisibility(value as PrivacySettings['profile_visibility'])}>
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-popover border shadow-md">
                                    <SelectItem value="public">
                                        <div className="flex items-center gap-2">
                                            <Check className={profileVisibility === 'public' ? 'h-4 w-4 text-primary' : 'h-4 w-4 opacity-0'} />
                                            <div>
                                                <div className="font-medium">Public</div>
                                                <div className="text-xs text-muted-foreground">Anyone can view your profile</div>
                                            </div>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="friends">
                                        <div className="flex items-center gap-2">
                                            <Check className={profileVisibility === 'friends' ? 'h-4 w-4 text-primary' : 'h-4 w-4 opacity-0'} />
                                            <div>
                                                <div className="font-medium">Friends Only</div>
                                                <div className="text-xs text-muted-foreground">Only friends can view</div>
                                            </div>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="friends_of_friends">
                                        <div className="flex items-center gap-2">
                                            <Check className={profileVisibility === 'friends_of_friends' ? 'h-4 w-4 text-primary' : 'h-4 w-4 opacity-0'} />
                                            <div>
                                                <div className="font-medium">Friends of Friends</div>
                                                <div className="text-xs text-muted-foreground">Friends and their friends</div>
                                            </div>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="border-t" />

                        {/* Search Visibility */}
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <label className="text-sm font-medium">Appear in search results</label>
                                <p className="text-xs text-muted-foreground">Allow others to find you by searching</p>
                            </div>
                            <Switch checked={searchVisibility} onCheckedChange={setSearchVisibility} />
                        </div>

                        <div className="border-t" />

                        {/* Online Status */}
                        <div className="space-y-3">
                            <div>
                                <label className="text-sm font-medium">Who can see when you're online?</label>
                                <p className="text-xs text-muted-foreground">Control your online status visibility</p>
                            </div>
                            <Select value={onlineStatus} onValueChange={(value) => setOnlineStatus(value as PrivacySettings['online_status_visibility'])}>
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-popover border shadow-md">
                                    <SelectItem value="everyone">
                                        <div className="flex items-center gap-2">
                                            <Check className={onlineStatus === 'everyone' ? 'h-4 w-4 text-primary' : 'h-4 w-4 opacity-0'} />
                                            <div>
                                                <div className="font-medium">Everyone</div>
                                                <div className="text-xs text-muted-foreground">All users can see</div>
                                            </div>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="friends">
                                        <div className="flex items-center gap-2">
                                            <Check className={onlineStatus === 'friends' ? 'h-4 w-4 text-primary' : 'h-4 w-4 opacity-0'} />
                                            <div>
                                                <div className="font-medium">Friends Only</div>
                                                <div className="text-xs text-muted-foreground">Only friends can see</div>
                                            </div>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="no_one">
                                        <div className="flex items-center gap-2">
                                            <Check className={onlineStatus === 'no_one' ? 'h-4 w-4 text-primary' : 'h-4 w-4 opacity-0'} />
                                            <div>
                                                <div className="font-medium">No One</div>
                                                <div className="text-xs text-muted-foreground">Stay invisible</div>
                                            </div>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    {hasChanges && (
                        <div className="flex items-center justify-between bg-muted/50 rounded-lg p-4 border border-primary/20">
                            <p className="text-sm text-muted-foreground">You have unsaved changes</p>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={handleReset} disabled={isSaving}>
                                    <RotateCcw className="h-4 w-4 mr-2" />
                                    Reset to Default
                                </Button>
                                <Button size="sm" onClick={handleSave} disabled={isSaving}>
                                    <Save className="h-4 w-4 mr-2" />
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Data Export */}
                    <div className="bg-card rounded-lg border p-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <h3 className="font-medium">Download Your Data</h3>
                                <p className="text-sm text-muted-foreground">
                                    Get a copy of your personal data, including profile, friends, and settings.
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                onClick={handleExportData}
                                disabled={isExporting}
                                className="flex items-center gap-2"
                            >
                                <Download className="h-4 w-4" />
                                {isExporting ? 'Exporting...' : 'Download JSON'}
                            </Button>
                        </div>
                    </div>

                    {/* Privacy Audit Log */}
                    <div className="bg-card rounded-lg border p-6">
                        <PrivacyAuditLog />
                    </div>
                </TabsContent>

                {/* Blocked Users Tab */}
                <TabsContent value="blocking" className="animate-in fade-in-50">
                    <BlockList />
                </TabsContent>
            </Tabs>
        </div>
    );
}
