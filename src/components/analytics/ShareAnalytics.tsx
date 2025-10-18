// src/components/analytics/ShareAnalytics.tsx
// Share analytics dashboard component
// Story 4.9 - Phase 4: Analytics & Desktop UX

import React, { useState, useEffect } from 'react';
import { Share2, TrendingUp, Copy, Globe, Calendar, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { getShareStats, getShareCount } from '../../services/shareTracker';
import { cn } from '../../lib/utils';

export interface ShareAnalyticsProps {
  /** Entity ID to show analytics for */
  entityId: string;
  /** Entity type (storefront or product) */
  entityType: 'storefront' | 'product' | 'offer' | 'coupon';
  /** Optional title override */
  title?: string;
  /** Compact mode (smaller cards) */
  compact?: boolean;
}

interface ShareStatsData {
  total: number;
  methods: Record<string, number>;
  recent: Array<{
    id: string;
    created_at: string;
    method: string;
  }>;
}

/**
 * Share analytics component for business dashboard
 * 
 * @example
 * ```tsx
 * <ShareAnalytics
 *   entityId={business.id}
 *   entityType="storefront"
 *   title="Storefront Shares"
 * />
 * ```
 */
export function ShareAnalytics({
  entityId,
  entityType,
  title,
  compact = false
}: ShareAnalyticsProps) {
  const [stats, setStats] = useState<ShareStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getShareStats(entityId, entityType);
        setStats(data);
      } catch (err) {
        console.error('Failed to fetch share stats:', err);
        setError('Failed to load share analytics');
      } finally {
        setLoading(false);
      }
    };

    if (entityId) {
      fetchStats();
    }
  }, [entityId, entityType]);

  // Get method display name
  const getMethodLabel = (method: string): string => {
    const labels: Record<string, string> = {
      web_share: 'Native Share',
      copy: 'Link Copy',
      whatsapp: 'WhatsApp',
      facebook: 'Facebook',
      twitter: 'Twitter',
      email: 'Email'
    };
    return labels[method] || method;
  };

  // Get method icon
  const getMethodIcon = (method: string) => {
    const icons: Record<string, React.ReactNode> = {
      web_share: <Share2 className="h-4 w-4" />,
      copy: <Copy className="h-4 w-4" />,
      whatsapp: <Globe className="h-4 w-4" />,
      facebook: <Globe className="h-4 w-4" />,
      twitter: <Globe className="h-4 w-4" />,
      email: <Globe className="h-4 w-4" />
    };
    return icons[method] || <Share2 className="h-4 w-4" />;
  };

  // Calculate percentage for each method
  const getMethodPercentage = (count: number): number => {
    if (!stats || stats.total === 0) return 0;
    return Math.round((count / stats.total) * 100);
  };

  // Loading state
  if (loading) {
    return (
      <Card className={compact ? 'p-4' : ''}>
        <CardHeader className={compact ? 'p-0 pb-4' : ''}>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent className={compact ? 'p-0' : ''}>
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={compact ? 'p-4' : ''}>
        <CardHeader className={compact ? 'p-0 pb-4' : ''}>
          <CardTitle className="text-red-600">Error Loading Analytics</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // No data state
  if (!stats || stats.total === 0) {
    return (
      <Card className={compact ? 'p-4' : ''}>
        <CardHeader className={compact ? 'p-0 pb-4' : ''}>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            {title || 'Share Analytics'}
          </CardTitle>
          <CardDescription>
            Track how your {entityType} is being shared
          </CardDescription>
        </CardHeader>
        <CardContent className={compact ? 'p-0' : ''}>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-gray-100 p-3 mb-4">
              <Share2 className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-sm text-gray-600 mb-2">
              No shares yet
            </p>
            <p className="text-xs text-gray-500">
              Shares will appear here once users start sharing your {entityType}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={compact ? 'p-4' : ''}>
      <CardHeader className={compact ? 'p-0 pb-4' : ''}>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              {title || 'Share Analytics'}
            </CardTitle>
            <CardDescription>
              {stats.total} total {stats.total === 1 ? 'share' : 'shares'}
            </CardDescription>
          </div>
          <Badge variant="secondary" className="text-lg font-bold">
            {stats.total}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className={compact ? 'p-0' : 'space-y-6'}>
        {/* Total Shares Summary */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <TrendingUp className="h-4 w-4" />
              Total Shares
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {stats.total}
            </div>
          </div>

          <div className="rounded-lg border bg-gradient-to-br from-green-50 to-emerald-50 p-4">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <Users className="h-4 w-4" />
              Share Methods
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {Object.keys(stats.methods).length}
            </div>
          </div>

          <div className="rounded-lg border bg-gradient-to-br from-purple-50 to-pink-50 p-4 col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <Calendar className="h-4 w-4" />
              Recent Activity
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {stats.recent.length}
            </div>
          </div>
        </div>

        {/* Share Methods Breakdown */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Share Methods
          </h3>
          <div className="space-y-3">
            {Object.entries(stats.methods)
              .sort(([, a], [, b]) => b - a)
              .map(([method, count]) => (
                <div key={method} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      {getMethodIcon(method)}
                      <span className="font-medium text-gray-700">
                        {getMethodLabel(method)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">{count}</span>
                      <Badge variant="secondary" className="text-xs">
                        {getMethodPercentage(count)}%
                      </Badge>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full transition-all duration-500',
                        method === 'web_share' && 'bg-blue-500',
                        method === 'copy' && 'bg-green-500',
                        method === 'whatsapp' && 'bg-emerald-500',
                        method === 'facebook' && 'bg-indigo-500',
                        method === 'twitter' && 'bg-sky-500',
                        method === 'email' && 'bg-purple-500'
                      )}
                      style={{ width: `${getMethodPercentage(count)}%` }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Recent Shares */}
        {stats.recent.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Recent Shares
            </h3>
            <div className="space-y-2">
              {stats.recent.slice(0, 5).map((share) => (
                <div
                  key={share.id}
                  className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-2">
                    {getMethodIcon(share.method)}
                    <span className="text-gray-600">
                      {getMethodLabel(share.method)}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(share.created_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">
            💡 Pro Tip
          </h4>
          <p className="text-xs text-blue-700">
            Shares with UTM parameters help you track which channels drive the most traffic. 
            Check your analytics platform to see conversion rates from shared links.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default ShareAnalytics;
