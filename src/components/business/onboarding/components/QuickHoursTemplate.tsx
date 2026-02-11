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
        if (template.id === 'custom') {
            // Just notify parent that custom was selected, passing null for hours implies no bulk change
            // But the current prop expects strict type. We might need to adjust or just handle it here.
            // Since the parent controls selectedTemplate, we need a way to tell it "Custom selected".
            // For now, we'll cheat slightly: The parent component in Step4 mostly cares about the hours.
            // But we want to update the UI.
            // Let's rely on the user manually editing to trigger "Custom" state in reality,
            // but for the button click, we want to visually select it.
            // Actually, the simplest fix for "cluttered" is layout.
            // I will strictly fix the layout first.
        }

        if (template.hours) {
            const deepCopy = JSON.parse(JSON.stringify(template.hours));
            onSelectTemplate(deepCopy);
        } else if (template.id === 'custom') {
            // If we really want to support clicking custom to just "highlight" it:
            // We can't because onSelectTemplate requires hours.
            // I'll leave logic alone for now to avoid breaking types, just fix UI.
        }
    };

    return (
        <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
                Quick Select Schedule
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {templates.map(template => {
                    const Icon = template.icon;
                    const isSelected = selectedTemplate === template.id;

                    return (
                        <button
                            key={template.id}
                            type="button"
                            onClick={() => handleSelectTemplate(template)}
                            className={cn(
                                "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all text-center h-auto min-h-[100px]",
                                isSelected
                                    ? "border-indigo-500 bg-indigo-50"
                                    : "border-gray-200 hover:border-indigo-300 hover:bg-gray-50"
                            )}
                        >
                            <div className={cn(
                                "p-2 rounded-full mb-2",
                                isSelected ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-500"
                            )}>
                                <Icon className="w-5 h-5" />
                            </div>
                            <p className={cn(
                                "font-medium text-sm w-full truncate",
                                isSelected ? "text-indigo-900" : "text-gray-900"
                            )}>
                                {template.name}
                            </p>
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2 px-1">
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
