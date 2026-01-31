import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Clock, Plus, X } from 'lucide-react';

interface OperatingHours {
    [key: string]: {
        open: string;
        close: string;
        closed: boolean;
    };
}

interface OperatingHoursEditorProps {
    value: OperatingHours;
    onChange: (value: OperatingHours) => void;
}

const DAYS = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' },
];

export function OperatingHoursEditor({ value, onChange }: OperatingHoursEditorProps) {
    // Ensure value has all days initialized
    const safeValue = React.useMemo(() => {
        const newValue = { ...value };
        DAYS.forEach(day => {
            if (!newValue[day.key]) {
                newValue[day.key] = { open: '09:00', close: '17:00', closed: false };
            }
        });
        return newValue;
    }, [value]);

    const handleChange = (day: string, field: string, val: any) => {
        const newValue = {
            ...safeValue,
            [day]: {
                ...safeValue[day],
                [field]: val
            }
        };
        onChange(newValue);
    };

    const copyToAll = (sourceDay: string) => {
        const source = safeValue[sourceDay];
        const newValue = { ...safeValue };
        DAYS.forEach(day => {
            if (day.key !== sourceDay) {
                newValue[day.key] = { ...source };
            }
        });
        onChange(newValue);
    };

    return (
        <div className="space-y-4 border rounded-md p-4 bg-gray-50/50">
            <div className="flex items-center justify-between mb-2">
                <Label className="text-base font-medium">Operating Hours</Label>
                <div className="text-xs text-gray-500">
                    Format: 24-hour clock
                </div>
            </div>

            <div className="space-y-3">
                {DAYS.map(day => {
                    const hours = safeValue[day.key];
                    const isClosed = hours.closed;

                    return (
                        <div key={day.key} className="flex items-center gap-3 p-2 rounded-md hover:bg-white transition-colors border border-transparent hover:border-gray-200">
                            <div className="w-28 font-medium text-sm flex items-center justify-between">
                                {day.label}
                                {day.key === 'monday' && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-5 text-[10px] px-1 text-blue-600 hover:text-blue-700 hidden group-hover:block"
                                        onClick={() => copyToAll(day.key)}
                                        title="Copy Monday's schedule to all days"
                                    >
                                        Copy All
                                    </Button>
                                )}
                            </div>

                            <div className="flex items-center gap-2 flex-1">
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id={`closed-${day.key}`}
                                        checked={isClosed}
                                        onCheckedChange={(checked) => handleChange(day.key, 'closed', checked)}
                                    />
                                    <Label htmlFor={`closed-${day.key}`} className="text-sm text-gray-600 cursor-pointer">
                                        Closed
                                    </Label>
                                </div>

                                {!isClosed && (
                                    <>
                                        <div className="h-4 w-px bg-gray-300 mx-2" />
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type="time"
                                                value={hours.open}
                                                onChange={(e) => handleChange(day.key, 'open', e.target.value)}
                                                className="w-24 h-8"
                                            />
                                            <span className="text-gray-400">-</span>
                                            <Input
                                                type="time"
                                                value={hours.close}
                                                onChange={(e) => handleChange(day.key, 'close', e.target.value)}
                                                className="w-24 h-8"
                                            />
                                        </div>
                                    </>
                                )}

                                {isClosed && (
                                    <Badge variant="outline" className="ml-4 text-gray-400 border-dashed">
                                        No hours set
                                    </Badge>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
