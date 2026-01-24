import { Clock, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface ModerationStatusBadgeProps {
    status: 'pending' | 'approved' | 'rejected';
    rejectionReason?: string;
}

export function ModerationStatusBadge({
    status,
    rejectionReason
}: ModerationStatusBadgeProps) {
    if (status === 'approved') {
        // Don't show badge for approved reviews unless explicitly requested?
        // For now, per requirements, we hide it.
        return null;
    }

    if (status === 'pending') {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 cursor-help">
                            <Clock className="w-3 h-3 mr-1" />
                            Pending Approval
                        </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Your review will be visible after admin approval.</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            This usually takes less than 24 hours.
                        </p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    if (status === 'rejected') {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Badge variant="destructive" className="cursor-help">
                            <XCircle className="w-3 h-3 mr-1" />
                            Not Approved
                        </Badge>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                        <p className="font-semibold">This review was not approved.</p>
                        {rejectionReason ? (
                            <p className="text-xs mt-1">Reason: {rejectionReason}</p>
                        ) : (
                            <p className="text-xs mt-1">It may violate our review guidelines.</p>
                        )}
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    return null;
}
