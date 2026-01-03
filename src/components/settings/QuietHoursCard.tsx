// src/components/settings/QuietHoursCard.tsx
// Story 8.6.5: Quiet Hours UI Component

import React from 'react';
import { Moon, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useQuietHours } from '@/hooks/useQuietHours';

export function QuietHoursCard() {
  const { 
    settings, 
    isLoading, 
    toggleQuietHours, 
    setQuietHoursTime,
    isCurrentlyQuietHours 
  } = useQuietHours();

  if (isLoading || !settings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Moon className="h-5 w-5" />
            Quiet Hours
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse h-16 bg-gray-100 rounded" />
        </CardContent>
      </Card>
    );
  }

  const isActive = isCurrentlyQuietHours();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Moon className="h-5 w-5" />
          Quiet Hours
          {isActive && (
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
              Active Now
            </span>
          )}
        </CardTitle>
        <CardDescription>
          Silence notifications during set times
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <label className="text-sm font-medium">Enable Quiet Hours</label>
            <p className="text-xs text-gray-500">
              Pause notifications during specific hours
            </p>
          </div>
          <Switch
            checked={settings.quiet_hours_enabled}
            onCheckedChange={toggleQuietHours}
          />
        </div>

        {/* Time Range */}
        {settings.quiet_hours_enabled && (
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>Schedule</span>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-xs text-gray-500">Start</label>
                <input
                  type="time"
                  value={settings.quiet_hours_start}
                  onChange={(e) => setQuietHoursTime(e.target.value, settings.quiet_hours_end)}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              
              <span className="text-gray-400 pt-5">to</span>
              
              <div className="flex-1">
                <label className="text-xs text-gray-500">End</label>
                <input
                  type="time"
                  value={settings.quiet_hours_end}
                  onChange={(e) => setQuietHoursTime(settings.quiet_hours_start, e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <p className="text-xs text-gray-500 italic">
              Notifications will be silenced from {settings.quiet_hours_start} to {settings.quiet_hours_end}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
