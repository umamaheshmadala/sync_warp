import React from 'react';
import { Clock, Building2, Utensils, Sun, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OperatingHours {
    open: string;
    close: string;
    closed: boolean;
}

interface QuickHoursTemplateProps {
    onSelectTemplate: (hours: Record<string, OperatingHours>) => void;
    selectedTemplate: string | null;
}

const templates = [
    {
        id: 'standard',
        name: 'Standard Business',
        description: 'Mon-Fri 9-6, Sat 10-4',
        icon: Building2,
        hours: {
            monday: { open: '09:00', close: '18:00', closed: false },
            tuesday: { open: '09:00', close: '18:00', closed: false },
            wednesday: { open: '09:00', close: '18:00', closed: false },
            thursday: { open: '09:00', close: '18:00', closed: false },
            friday: { open: '09:00', close: '18:00', closed: false },
            saturday: { open: '10:00', close: '16:00', closed: false },
            sunday: { open: '09:00', close: '18:00', closed: true }
        }
    },
    {
        id: 'always_open',
        name: 'Always Open',
        description: '24 hours, 7 days a week',
        icon: Sun,
        hours: {
            monday: { open: '00:00', close: '23:59', closed: false },
            tuesday: { open: '00:00', close: '23:59', closed: false },
            wednesday: { open: '00:00', close: '23:59', closed: false },
            thursday: { open: '00:00', close: '23:59', closed: false },
            friday: { open: '00:00', close: '23:59', closed: false },
            saturday: { open: '00:00', close: '23:59', closed: false },
            sunday: { open: '00:00', close: '23:59', closed: false }
        }
    },
    {
        id: 'restaurant',
        name: 'Restaurant Hours',
        description: '11am-10pm daily',
        icon: Utensils,
        hours: {
            monday: { open: '11:00', close: '22:00', closed: false },
            tuesday: { open: '11:00', close: '22:00', closed: false },
            wednesday: { open: '11:00', close: '22:00', closed: false },
            thursday: { open: '11:00', close: '22:00', closed: false },
            friday: { open: '11:00', close: '23:00', closed: false },
            saturday: { open: '11:00', close: '23:00', closed: false },
            sunday: { open: '11:00', close: '22:00', closed: false }
        }
    },
    {
        id: 'retail',
        name: 'Retail Hours',
        description: '10am-9pm daily',
        icon: Clock,
        hours: {
            monday: { open: '10:00', close: '21:00', closed: false },
            tuesday: { open: '10:00', close: '21:00', closed: false },
            wednesday: { open: '10:00', close: '21:00', closed: false },
            thursday: { open: '10:00', close: '21:00', closed: false },
            friday: { open: '10:00', close: '21:00', closed: false },
            saturday: { open: '10:00', close: '21:00', closed: false },
            sunday: { open: '11:00', close: '20:00', closed: false }
        }
    },
    {
        id: 'custom',
        name: 'Custom',
        description: 'Set your own hours',
        icon: Settings,
        hours: null // No pre-fill, just clears selection in UI if needed, but logic handles null check
    }
];

export function QuickHoursTemplate({
    onSelectTemplate,
    selectedTemplate
}: QuickHoursTemplateProps) {
    const handleSelectTemplate = (template: typeof templates[0]) => {
        if (template.hours) {
            // Create a copy to avoid mutation issues if template is reused directly
            const deepCopy = JSON.parse(JSON.stringify(template.hours));
            onSelectTemplate(deepCopy);
        }
    };

    return (
        <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
                Quick Select Schedule
            </label>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
                {templates.map(template => {
                    const Icon = template.icon;
                    const isSelected = selectedTemplate === template.id;

                    return (
                        <button
                            key={template.id}
                            type="button"
                            onClick={() => handleSelectTemplate(template)}
                            className={cn(
                                "p-3 rounded-xl border-2 text-left transition-all h-full",
                                isSelected
                                    ? "border-indigo-500 bg-indigo-50"
                                    : "border-gray-200 hover:border-indigo-300 hover:bg-gray-50"
                            )}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <Icon className={cn(
                                    "w-4 h-4",
                                    isSelected ? "text-indigo-600" : "text-gray-400"
                                )} />
                                <p className={cn(
                                    "font-medium text-sm",
                                    isSelected ? "text-indigo-900" : "text-gray-900"
                                )}>
                                    {template.name}
                                </p>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                                {template.description}
                            </p>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export default QuickHoursTemplate;
