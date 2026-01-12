import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';
import { QuickHoursTemplate } from '../components/QuickHoursTemplate';

interface OperatingHours {
    open: string;
    close: string;
    closed: boolean;
}

interface Step4_OperatingHoursProps {
    operatingHours: Record<string, OperatingHours>;
    onHoursChange: (day: string, field: string, value: any) => void;
    onBulkHoursChange: (hours: Record<string, OperatingHours>) => void;
    errors: Record<string, string>;
}

export function Step4_OperatingHours({
    operatingHours,
    onHoursChange,
    onBulkHoursChange,
    errors
}: Step4_OperatingHoursProps) {
    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

    const days = [
        'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
    ];

    const handleTemplateSelect = (templateHours: Record<string, OperatingHours>) => {
        onBulkHoursChange(templateHours);
        // Determine template ID based on logic or just set 'custom' if edited later
        // For now, we don't strictly track template ID in parent state, just local UI feedback
    };

    return (
        <div className="space-y-6">
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
            >
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-orange-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Operating Hours</h2>
                </div>
                <p className="text-gray-600">
                    When can customers visit your business?
                </p>
            </motion.div>

            {/* Templates */}
            <QuickHoursTemplate
                selectedTemplate={selectedTemplate}
                onSelectTemplate={(hours) => {
                    handleTemplateSelect(hours);
                    // Auto-detect template ID logic could go here, for now simpler is better
                    setSelectedTemplate('custom'); // Or specific ID if passed from child
                }}
            />

            {/* Manual Entry Grid */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {days.map((day) => (
                    <div
                        key={day}
                        className="p-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                    >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center justify-between sm:w-32">
                                <span className="capitalize font-medium text-gray-700">
                                    {day}
                                </span>
                                <label className="flex items-center cursor-pointer ml-3">
                                    <input
                                        type="checkbox"
                                        checked={operatingHours[day].closed}
                                        onChange={(e) => onHoursChange(day, 'closed', e.target.checked)}
                                        className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                                    />
                                    <span className="ml-2 text-sm text-gray-500">Closed</span>
                                </label>
                            </div>

                            {!operatingHours[day].closed && (
                                <div className="flex-1 grid grid-cols-2 gap-4">
                                    <div>
                                        <input
                                            type="time"
                                            value={operatingHours[day].open}
                                            onChange={(e) => onHoursChange(day, 'open', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                                        />
                                    </div>
                                    <div>
                                        <input
                                            type="time"
                                            value={operatingHours[day].close}
                                            onChange={(e) => onHoursChange(day, 'close', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                        {errors[`${day}_hours`] && (
                            <p className="mt-2 text-sm text-red-600 text-right">
                                {errors[`${day}_hours`]}
                            </p>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
