
import React from 'react';
import { ProductTagConfig, ProductTagType } from '../../../types/product';
import * as Icons from 'lucide-react';
import { cn } from '../../../lib/utils'; // Assuming utils exist, or I can use clsx/tailwind directly

interface ProductTagPillProps {
    type: ProductTagType;
    config: ProductTagConfig;
    className?: string;
    size?: 'sm' | 'md';
}

export const ProductTagPill: React.FC<ProductTagPillProps> = ({ type, config, className, size = 'md' }) => {
    // Dynamically get icon component
    const IconComponent = config.icon ? (Icons as any)[config.icon] : null;

    return (
        <div
            className={cn(
                "inline-flex items-center rounded-full font-medium border border-transparent",
                size === 'sm' ? "px-2 py-0.5 text-xs" : "px-2.5 py-0.5 text-sm",
                className
            )}
            style={{
                backgroundColor: config.bgColor,
                color: config.color
            }}
        >
            {IconComponent && (
                <IconComponent className={cn("mr-1", size === 'sm' ? "w-3 h-3" : "w-4 h-4")} />
            )}
            {config.label}
        </div>
    );
};
