import React from 'react'

interface DateSeparatorProps {
    label: string
}

export const DateSeparator: React.FC<DateSeparatorProps> = ({ label }) => {
    return (
        <div
            className="flex justify-center py-4 pointer-events-none"
            data-testid="date-separator"
        >
            <span className="px-3 py-1 text-xs font-medium text-gray-500 bg-gray-100/80 backdrop-blur-sm rounded-full border border-gray-100 shadow-sm">
                {label}
            </span>
        </div>
    )
}
