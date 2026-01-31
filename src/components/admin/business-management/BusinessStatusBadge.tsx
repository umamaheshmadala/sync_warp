import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface BusinessStatusBadgeProps {
    status: string;
    className?: string;
}

export function BusinessStatusBadge({ status, className }: BusinessStatusBadgeProps) {
    const getVariant = (status: string) => {
        switch (status.toLowerCase()) {
            case 'active':
                return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200';
            case 'rejected':
                return 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200';
            case 'deleted':
                return 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200';
            case 'suspended':
                return 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    return (
        <Badge
            variant="outline"
            className={cn("capitalize whitespace-nowrap", getVariant(status), className)}
        >
            {status}
        </Badge>
    );
}
