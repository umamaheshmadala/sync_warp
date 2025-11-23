import { useState } from 'react';
import { useBlockedUsers } from '@/hooks/useBlockedUsers';
import { BlockedUserItem } from './BlockedUserItem';
import { Input } from '@/components/ui/input';
import { Search, ShieldAlert } from 'lucide-react';

export function BlockList() {
    const { blockedUsers, isLoading, error } = useBlockedUsers();
    const [searchQuery, setSearchQuery] = useState('');

    const filteredUsers = blockedUsers.filter((block) => {
        const user = block.blocked_user;
        if (!user) return false;
        const query = searchQuery.toLowerCase();
        return (
            (user.username?.toLowerCase().includes(query) || false) ||
            (user.display_name?.toLowerCase().includes(query) || false)
        );
    });

    if (isLoading) {
        return (
            <div className="flex justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 text-red-500 bg-red-50 rounded-lg">
                Failed to load blocked users. Please try again.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-lg font-medium">Blocked Users</h3>
                <p className="text-sm text-muted-foreground">
                    Manage the people you have blocked. They cannot see your profile or contact you.
                </p>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search blocked users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                />
            </div>

            <div className="space-y-2">
                {filteredUsers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        {searchQuery ? (
                            <p>No blocked users found matching "{searchQuery}"</p>
                        ) : (
                            <div className="flex flex-col items-center gap-2">
                                <ShieldAlert className="h-8 w-8 opacity-50" />
                                <p>You haven't blocked anyone yet</p>
                            </div>
                        )}
                    </div>
                ) : (
                    filteredUsers.map((block) => (
                        <BlockedUserItem key={block.id} blockedUser={block} />
                    ))
                )}
            </div>
        </div>
    );
}
