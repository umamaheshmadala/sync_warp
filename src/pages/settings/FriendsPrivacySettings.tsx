import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FriendRequestPrivacy } from '@/components/friends/privacy/FriendRequestPrivacy';
import { ProfileVisibilitySettings } from '@/components/friends/privacy/ProfileVisibilitySettings';
import { OnlineStatusVisibility } from '@/components/friends/privacy/OnlineStatusVisibility';
import { BlockList } from '@/components/friends/privacy/BlockList';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Download, Shield, Users, UserX, Eye } from 'lucide-react';
import { privacyService } from '@/services/privacyService';
import { toast } from 'react-hot-toast';

export function FriendsPrivacySettings() {
    const navigate = useNavigate();
    const [isExporting, setIsExporting] = useState(false);

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
        <div className="container max-w-2xl mx-auto py-6 px-4 space-y-8">
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
                <TabsContent value="privacy" className="space-y-8 animate-in fade-in-50">
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 text-primary pb-2 border-b">
                            <Users className="h-5 w-5" />
                            <h2 className="text-lg font-semibold">Friend Requests</h2>
                        </div>
                        <FriendRequestPrivacy />
                    </section>

                    <section className="space-y-4">
                        <div className="flex items-center gap-2 text-primary pb-2 border-b">
                            <Eye className="h-5 w-5" />
                            <h2 className="text-lg font-semibold">Visibility</h2>
                        </div>
                        <ProfileVisibilitySettings />
                    </section>

                    <section className="space-y-4">
                        <div className="flex items-center gap-2 text-primary pb-2 border-b">
                            <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                            <h2 className="text-lg font-semibold">Online Status</h2>
                        </div>
                        <OnlineStatusVisibility />
                    </section>

                    <section className="pt-8 border-t">
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
                    </section>
                </TabsContent>

                {/* Blocked Users Tab */}
                <TabsContent value="blocking" className="animate-in fade-in-50">
                    <BlockList />
                </TabsContent>
            </Tabs>
        </div>
    );
}
