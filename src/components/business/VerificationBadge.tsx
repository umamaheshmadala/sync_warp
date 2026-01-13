import React from 'react';
import { Shield, ShieldCheck, ShieldQuestion, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VerificationBadgeProps {
    status: string; // Using string to be flexible with DB values
    phoneVerified?: boolean;
    size?: 'sm' | 'md' | 'lg';
    showTooltip?: boolean;
    className?: string;
}

const statusConfig: Record<string, { icon: any; label: string; color: string; tooltip: string }> = {
    unclaimed: {
        icon: ShieldQuestion,
        label: 'Unclaimed',
        color: 'text-gray-400 bg-gray-100',
        tooltip: 'This business has not been claimed by its owner.'
    },
    claimed_pending: {
        icon: Clock,
        label: 'Pending',
        color: 'text-amber-600 bg-amber-100',
        tooltip: 'Ownership verification in progress.'
    },
    claimed_verified: {
        icon: ShieldCheck,
        label: 'Verified',
        color: 'text-green-600 bg-green-100',
        tooltip: 'Business owner verified via phone.'
    },
    claimed_manual: {
        icon: Shield,
        label: 'Verified',
        color: 'text-blue-600 bg-blue-100',
        tooltip: 'Business verified by admin review.'
    },
    manual: {
        icon: Shield,
        label: 'Listed',
        color: 'text-gray-500 bg-gray-100',
        tooltip: 'Business registered but not verified.'
    }
};

const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5 gap-1',
    md: 'text-sm px-2 py-1 gap-1.5',
    lg: 'text-base px-3 py-1.5 gap-2'
};

const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
};

export function VerificationBadge({
    status,
    phoneVerified = false,
    size = 'md',
    showTooltip = true,
    className
}: VerificationBadgeProps) {
    const config = statusConfig[status] || statusConfig.unclaimed;

    // Override to verified if phone is verified, regardless of claim status (legacy support/robustness)
    const effectiveConfig = (phoneVerified && status !== 'claimed_verified' && status !== 'claimed_manual')
        ? statusConfig.claimed_verified
        : config;

    // If status is claimed_verified, use that config
    const finalConfig = status === 'claimed_verified' ? statusConfig.claimed_verified : effectiveConfig;

    const EffectiveIcon = finalConfig.icon;

    return (
        <div
            className={cn(
                "inline-flex items-center rounded-full font-medium",
                sizeClasses[size],
                finalConfig.color,
                className
            )}
            title={showTooltip ? finalConfig.tooltip : undefined}
        >
            <EffectiveIcon className={iconSizes[size]} />
            <span>{finalConfig.label}</span>
        </div>
    );
}

export default VerificationBadge;
