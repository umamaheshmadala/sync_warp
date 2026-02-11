import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Activity, Clock, FileCheck, FileX, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Stats {
    total: number;
    pending: number;
    active: number;
    rejected: number;
    deleted: number;
}

interface BusinessStatsCardsProps {
    stats?: Stats;
    onCardClick?: (status: string) => void;
    getCardUrl?: (status: string) => string;
    className?: string;
}

export function BusinessStatsCards({ stats, onCardClick, getCardUrl, className }: BusinessStatsCardsProps) {
    if (!stats) return null;

    const cards = [
        {
            label: 'Total Businesses',
            value: stats.total,
            icon: Activity,
            status: 'all',
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
        },
        {
            label: 'Pending Approval',
            value: stats.pending,
            icon: Clock,
            status: 'pending',
            color: 'text-yellow-600',
            bgColor: 'bg-yellow-50',
        },
        {
            label: 'Active Businesses',
            value: stats.active,
            icon: FileCheck,
            status: 'active',
            color: 'text-green-600',
            bgColor: 'bg-green-50',
        },
        {
            label: 'Rejected',
            value: stats.rejected,
            icon: FileX,
            status: 'rejected',
            color: 'text-red-600',
            bgColor: 'bg-red-50',
        },
        {
            label: 'Deleted',
            value: stats.deleted,
            icon: Trash2,
            status: 'deleted',
            color: 'text-gray-600',
            bgColor: 'bg-gray-50',
        },
    ];

    return (
        <div className={cn("grid grid-cols-2 md:grid-cols-5 gap-4", className)}>
            {cards.map((card) => {
                const cardContent = (
                    <Card
                        className={cn(
                            "transition-all hover:shadow-md border-l-4 h-full",
                            (onCardClick || getCardUrl) ? "cursor-pointer" : "",
                            card.status === 'pending' ? 'border-l-yellow-500' :
                                card.status === 'active' ? 'border-l-green-500' :
                                    card.status === 'rejected' ? 'border-l-red-500' :
                                        card.status === 'deleted' ? 'border-l-gray-500' :
                                            'border-l-blue-500'
                        )}
                        onClick={() => onCardClick?.(card.status)}
                    >
                        <CardContent className="p-4 flex flex-col items-center justify-between h-full">
                            <div className="flex flex-col items-center gap-2 mb-2 w-full">
                                <div className="flex items-center justify-center gap-2">
                                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        {card.label}
                                    </span>
                                    <div className={cn("p-1.5 rounded-full", card.bgColor)}>
                                        <card.icon className={cn("w-4 h-4", card.color)} />
                                    </div>
                                </div>
                            </div>
                            <div className="text-2xl font-bold text-gray-900 text-center">
                                {card.value.toLocaleString()}
                            </div>
                        </CardContent>
                    </Card>
                );

                if (getCardUrl) {
                    return (
                        <Link key={card.label} to={getCardUrl(card.status)} className="block h-full">
                            {cardContent}
                        </Link>
                    );
                }

                return <div key={card.label} className="h-full">{cardContent}</div>;
            })}
        </div>
    );
}
