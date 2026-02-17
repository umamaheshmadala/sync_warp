import React from 'react'

interface DateSeparatorProps {
    label: string
}

export const DateSeparator: React.FC<DateSeparatorProps> = ({ label }) => {
    return (
        <div
            className="sticky top-0 z-50 flex justify-center py-2 pointer-events-none date-separator-fade"
            data-testid="date-separator"
        >
            <span className="px-3 py-1 text-xs font-medium text-gray-500 bg-white/85 backdrop-blur-md shadow-sm rounded-full border border-gray-100 transition-opacity duration-300">
                {label}
            </span>
        </div>
    )
}
