import { useState } from 'react';
import { BlockedUser } from '@/services/blockService';
import { useBlockedUsers } from '@/hooks/useBlockedUsers';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, UserX } from 'lucide-react';
import { format } from 'date-fns';

interface BlockedUserItemProps {
    blockedUser: BlockedUser;
}

export function BlockedUserItem({ blockedUser }: BlockedUserItemProps) {
    const { unblockUser, isUnblocking } = useBlockedUsers();
    const [showConfirm, setShowConfirm] = useState(false);

    const user = blockedUser.blocked_user;
    if (!user) return null;

    const initials = (user.display_name || user.username || '?')
        .slice(0, 2)
        .toUpperCase();

    const handleUnblock = () => {
        unblockUser(user.id, {
            onSuccess: () => setShowConfirm(false),
        });
    };

    return (
        <>
            <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-3">
                    <Avatar>
                        <AvatarImage src={user.avatar_url || undefined} alt={user.display_name || user.username} />
                        <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-medium">{user.display_name || user.username}</p>
                        <p className="text-xs text-muted-foreground">
                            Blocked on {format(new Date(blockedUser.created_at), 'MMM d, yyyy')}
                        </p>
                    </div>
                </div>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowConfirm(true)}
                    disabled={isUnblocking}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                >
                    {isUnblocking ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <div className="flex items-center gap-2">
                            <UserX className="h-4 w-4" />
                            <span>Unblock</span>
                        </div>
                    )}
                </Button>
            </div>

            <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Unblock {user.display_name || user.username}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            They will be able to see your profile and posts again. This will not automatically add them back as a friend.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleUnblock}>Unblock</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
