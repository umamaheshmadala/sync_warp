import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';
import { QuickHoursTemplate } from '../components/QuickHoursTemplate';
import { Switch } from '@/components/ui/switch';

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
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
                {days.map((day) => {
                    const isClosed = operatingHours[day].closed;
                    return (
                        <div
                            key={day}
                            className="p-4 hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                                <div className="flex items-center justify-between min-w-[110px]">
                                    <span className="font-medium text-gray-700">
                                        {day.slice(0, 3).toUpperCase()}
                                    </span>
                                    <Switch
                                        checked={!isClosed}
                                        onCheckedChange={(checked) => onHoursChange(day, 'closed', !checked)}
                                    />
                                </div>

                                <div className="flex-1">
                                    {isClosed ? (
                                        <div className="flex items-center text-gray-400 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200 border-dashed justify-center sm:justify-start w-full sm:w-auto">
                                            <span className="text-sm font-medium">Closed</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 min-w-0">
                                                <input
                                                    type="time"
                                                    value={operatingHours[day].open}
                                                    onChange={(e) => onHoursChange(day, 'open', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                                                />
                                            </div>
                                            <span className="text-gray-400 font-medium shrink-0">-</span>
                                            <div className="flex-1 min-w-0">
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
                            </div>
                            {errors[`${day}_hours`] && (
                                <p className="mt-2 text-sm text-red-600 text-right">
                                    {errors[`${day}_hours`]}
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
