// src/components/checkins/BusinessCheckinAnalytics.tsx
// Analytics dashboard for business owners to track customer check-ins

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  MapPin,
  Users,
  TrendingUp,
  Calendar,
  Clock,
  Target,
  BarChart3,
  Download,
  Filter,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Star,
  Award,
} from 'lucide-react';
import { useCheckins, CheckinData } from '../../hooks/useCheckins';
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { toast } from 'react-hot-toast';

interface BusinessCheckinAnalyticsProps {
  businessId: string;
  businessName?: string;
}

interface AnalyticsState {
  timeRange: '7d' | '30d' | '90d' | 'all';
  selectedDate: Date | null;
  showFilters: boolean;
}

interface CheckinAnalytics {
  totalCheckins: number;
  uniqueVisitors: number;
  avgCheckinsPerDay: number;
  topDays: Array<{ day: string; count: number }>;
  hourlyDistribution: Array<{ hour: number; count: number }>;
  verificationStats: {
    gps: number;
    qr_code: number;
    manual: number;
  };
  recentCheckins: CheckinData[];
  growthRate: number;
}

const BusinessCheckinAnalytics: React.FC<BusinessCheckinAnalyticsProps> = ({
  businessId,
  businessName,
}) => {
  const checkins = useCheckins();
  const [businessCheckins, setBusinessCheckins] = useState<CheckinData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [state, setState] = useState<AnalyticsState>({
    timeRange: '30d',
    selectedDate: null,
    showFilters: false,
  });

  // Load business check-ins
  useEffect(() => {
    const loadBusinessCheckins = async () => {
      setIsLoading(true);
      try {
        const data = await checkins.getBusinessCheckins(businessId);
        setBusinessCheckins(data);
      } catch (error) {
        console.error('Error loading business check-ins:', error);
        toast.error('Failed to load check-in analytics');
      } finally {
        setIsLoading(false);
      }
    };

    if (businessId) {
      loadBusinessCheckins();
    }
  }, [businessId, checkins]);

  // Filter check-ins based on time range
  const filteredCheckins = useMemo(() => {
    if (state.timeRange === 'all') return businessCheckins;

    const now = new Date();
    const days = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
    };

    const startDate = startOfDay(subDays(now, days[state.timeRange]));
    const endDate = endOfDay(now);

    return businessCheckins.filter(checkin => 
      isWithinInterval(new Date(checkin.checked_in_at), { start: startDate, end: endDate })
    );
  }, [businessCheckins, state.timeRange]);

  // Calculate analytics
  const analytics = useMemo((): CheckinAnalytics => {
    if (filteredCheckins.length === 0) {
      return {
        totalCheckins: 0,
        uniqueVisitors: 0,
        avgCheckinsPerDay: 0,
        topDays: [],
        hourlyDistribution: [],
        verificationStats: { gps: 0, qr_code: 0, manual: 0 },
        recentCheckins: [],
        growthRate: 0,
      };
    }

    // Basic stats
    const totalCheckins = filteredCheckins.length;
    const uniqueVisitors = new Set(filteredCheckins.map(c => c.user_id)).size;
    
    // Days calculation
    const days = state.timeRange === 'all' 
      ? Math.ceil((new Date().getTime() - new Date(filteredCheckins[filteredCheckins.length - 1].checked_in_at).getTime()) / (1000 * 60 * 60 * 24))
      : { '7d': 7, '30d': 30, '90d': 90 }[state.timeRange];
    
    const avgCheckinsPerDay = totalCheckins / Math.max(days, 1);

    // Day of week analysis
    const dayCount = filteredCheckins.reduce((acc, checkin) => {
      const day = format(new Date(checkin.checked_in_at), 'EEEE');
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topDays = Object.entries(dayCount)
      .map(([day, count]) => ({ day, count }))
      .sort((a, b) => b.count - a.count);

    // Hourly distribution
    const hourCount = filteredCheckins.reduce((acc, checkin) => {
      const hour = new Date(checkin.checked_in_at).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const hourlyDistribution = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: hourCount[hour] || 0,
    }));

    // Verification method stats
    const verificationStats = filteredCheckins.reduce((acc, checkin) => {
      acc[checkin.verification_method] = (acc[checkin.verification_method] || 0) + 1;
      return acc;
    }, { gps: 0, qr_code: 0, manual: 0 } as { gps: number; qr_code: number; manual: number });

    // Recent check-ins (last 10)
    const recentCheckins = [...filteredCheckins]
      .sort((a, b) => new Date(b.checked_in_at).getTime() - new Date(a.checked_in_at).getTime())
      .slice(0, 10);

    // Growth rate calculation (compare to previous period)
    let growthRate = 0;
    if (state.timeRange !== 'all') {
      const periodDays = { '7d': 7, '30d': 30, '90d': 90 }[state.timeRange];
      const currentPeriodStart = subDays(new Date(), periodDays);
      const previousPeriodStart = subDays(currentPeriodStart, periodDays);
      
      const previousPeriodCheckins = businessCheckins.filter(checkin => 
        isWithinInterval(new Date(checkin.checked_in_at), { 
          start: previousPeriodStart, 
          end: currentPeriodStart 
        })
      );

      if (previousPeriodCheckins.length > 0) {
        growthRate = ((totalCheckins - previousPeriodCheckins.length) / previousPeriodCheckins.length) * 100;
      } else if (totalCheckins > 0) {
        growthRate = 100; // 100% growth from 0
      }
    }

    return {
      totalCheckins,
      uniqueVisitors,
      avgCheckinsPerDay,
      topDays,
      hourlyDistribution,
      verificationStats,
      recentCheckins,
      growthRate,
    };
  }, [filteredCheckins, businessCheckins, state.timeRange]);

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const data = await checkins.getBusinessCheckins(businessId);
      setBusinessCheckins(data);
      toast.success('Analytics refreshed');
    } catch (error) {
      toast.error('Failed to refresh analytics');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportData = () => {
    const csvData = filteredCheckins.map(checkin => ({
      date: format(new Date(checkin.checked_in_at), 'yyyy-MM-dd'),
      time: format(new Date(checkin.checked_in_at), 'HH:mm:ss'),
      verification_method: checkin.verification_method,
      distance: checkin.distance_from_business,
      verified: checkin.verified,
    }));

    const csv = [
      'Date,Time,Verification Method,Distance (m),Verified',
      ...csvData.map(row => 
        `${row.date},${row.time},${row.verification_method},${row.distance},${row.verified}`
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${businessName}-checkins-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatHour = (hour: number): string => {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    if (hour < 12) return `${hour} AM`;
    return `${hour - 12} PM`;
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading check-in analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Check-in Analytics</h2>
          <p className="text-gray-600">{businessName}</p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Time Range Filter */}
          <select
            value={state.timeRange}
            onChange={(e) => setState(prev => ({ ...prev, timeRange: e.target.value as any }))}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All time</option>
          </select>
          
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          
          <button
            onClick={handleExportData}
            disabled={filteredCheckins.length === 0}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg border p-6"
        >
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Check-ins</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.totalCheckins}</p>
              {analytics.growthRate !== 0 && (
                <p className={`text-xs ${analytics.growthRate > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {analytics.growthRate > 0 ? '+' : ''}{analytics.growthRate.toFixed(1)}%
                </p>
              )}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-lg border p-6"
        >
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Unique Visitors</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.uniqueVisitors}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-lg border p-6"
        >
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Daily Average</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.avgCheckinsPerDay.toFixed(1)}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-lg border p-6"
        >
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Target className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">GPS Verified</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.totalCheckins > 0 
                  ? Math.round((analytics.verificationStats.gps / analytics.totalCheckins) * 100)
                  : 0}%
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Days */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-lg border p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Busiest Days</h3>
          <div className="space-y-3">
            {analytics.topDays.slice(0, 7).map((day, index) => (
              <div key={day.day} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">{day.day}</span>
                <div className="flex items-center space-x-3">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${analytics.topDays.length > 0 ? (day.count / analytics.topDays[0].count) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 w-8 text-right">{day.count}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Hourly Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-lg border p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Peak Hours</h3>
          <div className="space-y-2">
            {analytics.hourlyDistribution
              .sort((a, b) => b.count - a.count)
              .slice(0, 6)
              .map((hour) => (
                <div key={hour.hour} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {formatHour(hour.hour)}
                  </span>
                  <div className="flex items-center space-x-3">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{
                          width: `${analytics.hourlyDistribution.length > 0 
                            ? (hour.count / Math.max(...analytics.hourlyDistribution.map(h => h.count))) * 100 
                            : 0}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-8 text-right">{hour.count}</span>
                  </div>
                </div>
              ))}
          </div>
        </motion.div>
      </div>

      {/* Recent Check-ins */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white rounded-lg border"
      >
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Recent Check-ins</h3>
        </div>
        <div className="divide-y">
          {analytics.recentCheckins.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p>No check-ins yet</p>
            </div>
          ) : (
            analytics.recentCheckins.map((checkin, index) => (
              <div key={checkin.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      checkin.verified ? 'bg-green-500' : 'bg-yellow-500'
                    }`} />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900">
                          Check-in #{index + 1}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          checkin.verification_method === 'gps' 
                            ? 'bg-blue-100 text-blue-800'
                            : checkin.verification_method === 'qr_code'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {checkin.verification_method.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                        <span>
                          {Math.round(checkin.distance_from_business)}m away
                        </span>
                        <span>
                          {format(new Date(checkin.checked_in_at), 'MMM d, yyyy')}
                        </span>
                        <span>
                          {format(new Date(checkin.checked_in_at), 'h:mm a')}
                        </span>
                      </div>
                    </div>
                  </div>
                  {checkin.verified && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default BusinessCheckinAnalytics;