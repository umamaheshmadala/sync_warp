import React from 'react';
import { Sparkles, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PrefilledFieldIndicatorProps {
    isPrefilled: boolean;
    onEdit?: () => void;
    className?: string;
}

export function PrefilledFieldIndicator({
    isPrefilled,
    onEdit,
    className
}: PrefilledFieldIndicatorProps) {
    if (!isPrefilled) return null;

    return (
        <div className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full",
            className
        )}>
            <Sparkles className="w-3 h-3" />
            <span>Auto-filled</span>
            {onEdit && (
                <button
                    type="button"
                    onClick={onEdit}
                    className="ml-1 hover:text-blue-900"
                >
                    <Edit2 className="w-3 h-3" />
                </button>
            )}
        </div>
    );
}

// Hook to track pre-filled fields
export function usePrefilledFields(initialPrefilled: string[] = []) {
    const [prefilledFields, setPrefilledFields] = React.useState<Set<string>>(
        new Set(initialPrefilled)
    );

    const markAsEdited = (field: string) => {
        setPrefilledFields(prev => {
            const next = new Set(prev);
            next.delete(field);
            return next;
        });
    };

    const isPrefilled = (field: string) => prefilledFields.has(field);

    return { isPrefilled, markAsEdited };
}

export default PrefilledFieldIndicator;
