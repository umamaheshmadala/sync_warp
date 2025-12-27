import React from 'react'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '../ui/alert-dialog'
import { Ban, ShieldOff } from 'lucide-react'

interface BlockUserDialogProps {
    isOpen: boolean
    isBlocked: boolean
    userName: string
    onClose: () => void
    onConfirm: () => void
}

export function BlockUserDialog({
    isOpen,
    isBlocked,
    userName,
    onClose,
    onConfirm,
}: BlockUserDialogProps) {
    return (
        <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <AlertDialogContent className="max-w-md">
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        {isBlocked ? (
                            <>
                                <ShieldOff className="h-5 w-5 text-green-600" />
                                Unblock {userName}?
                            </>
                        ) : (
                            <>
                                <Ban className="h-5 w-5 text-orange-600" />
                                Block {userName}?
                            </>
                        )}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        {isBlocked ? (
                            <>
                                This user will be able to message you again. You can block them again at any time.
                            </>
                        ) : (
                            <>
                                You will no longer receive messages from this user. They will not be notified that you blocked them.
                                <br /><br />
                                <strong>Note:</strong> Blocking will also remove them from your friends list.
                            </>
                        )}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        className={isBlocked
                            ? "bg-green-600 hover:bg-green-700"
                            : "bg-orange-600 hover:bg-orange-700"
                        }
                    >
                        {isBlocked ? 'Unblock' : 'Block User'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
