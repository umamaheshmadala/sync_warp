import { Award, Star, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { BADGE_CONFIG, BadgeTier } from '@/services/badgeService';
import { cn } from '@/lib/utils';

interface RecommendationBadgeProps {
    tier: BadgeTier;
    percentage?: number;
    reviewCount?: number;
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
    className?: string; // Allow custom classes
}

const BADGE_ICONS = {
    recommended: Award,
    highly_recommended: Star,
    very_highly_recommended: Trophy
};

export function RecommendationBadge({
    tier,
    percentage,
    reviewCount,
    size = 'md',
    showLabel = true,
    className
}: RecommendationBadgeProps) {
    if (!tier || !BADGE_CONFIG[tier]) return null;

    const config = BADGE_CONFIG[tier];
    const Icon = BADGE_ICONS[tier];

    const sizeClasses = {
        sm: 'text-xs px-1.5 py-0.5 h-6',
        md: 'text-sm px-2 py-1 h-7',
        lg: 'text-base px-3 py-1.5 h-8'
    };

    const iconSizes = {
        sm: 'w-3 h-3',
        md: 'w-4 h-4',
        lg: 'w-5 h-5'
    };

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className={cn("inline-flex", className)}>
                        <Badge
                            variant="outline"
                            className={cn(
                                config.color,
                                config.bgColor,
                                'border-0 cursor-pointer flex items-center gap-1.5 font-medium shrink-0',
                                sizeClasses[size]
                            )}
                        >
                            <Icon className={iconSizes[size]} />
                            {showLabel && (size === 'lg' ? config.label : config.shortLabel)}
                        </Badge>
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <div className="text-center p-1">
                        <p className="font-semibold mb-1">{config.label}</p>
                        {percentage !== undefined && reviewCount !== undefined && (
                            <p className="text-xs text-muted-foreground">
                                {percentage}% of {reviewCount} reviewers recommend this business
                            </p>
                        )}
                        {percentage === undefined && (
                            <p className="text-xs text-muted-foreground">Trusted by customers</p>
                        )}
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
