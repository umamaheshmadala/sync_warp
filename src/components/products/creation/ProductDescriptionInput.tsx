
import React from 'react';
import { cn } from '../../../lib/utils';

interface ProductDescriptionInputProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    maxChars?: number;
    error?: string;
}

export const ProductDescriptionInput: React.FC<ProductDescriptionInputProps> = ({
    label = "Description",
    maxChars = 300,
    value,
    className,
    error,
    onChange,
    ...props
}) => {
    const currentLength = (value as string)?.length || 0;
    const isNearLimit = currentLength > maxChars * 0.9;
    const isOverLimit = currentLength > maxChars;

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        // Optional: Enforce strict limit (prevent typing)
        // e.target.value = e.target.value.slice(0, maxChars);
        // For now, let them type but show error state or rely on parent validation
        if (onChange) onChange(e);
    };

    return (
        <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {label}
            </label>
            <div className="relative">
                <textarea
                    value={value}
                    onChange={handleChange}
                    maxLength={maxChars} // Native limit
                    className={cn(
                        "w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[100px] resize-y",
                        error ? "border-red-500 focus:ring-red-500" : "border-gray-300 dark:border-gray-700",
                        "bg-white text-gray-900",
                        className
                    )}
                    {...props}
                />
                <div className={cn(
                    "absolute bottom-2 right-2 text-xs font-medium pointer-events-none transition-colors",
                    isOverLimit ? "text-red-600" : isNearLimit ? "text-yellow-600" : "text-gray-400"
                )}>
                    {currentLength}/{maxChars}
                </div>
            </div>
            {error && (
                <p className="text-red-500 text-sm">{error}</p>
            )}
        </div>
    );
};
