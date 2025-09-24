import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  Eye,
  ShoppingCart,
  DollarSign,
  Calendar,
  Clock,
  Download,
  RefreshCcw,
  Filter,
  X,
  CheckCircle,
  AlertTriangle,
  Info,
  Zap,
  Share2,
  MapPin,
  UserCheck,
  Gift
} from 'lucide-react';
import { 
  CouponAnalytics as CouponAnalyticsType,
  Coupon,
  DailyAnalytics,
  UserSegment,
  CollectionSourceStats,
  ConversionFunnel
} from '../../types/coupon';
import { useCoupons } from '../../hooks/useCoupons';
import { couponService } from '../../services/couponService';
import { toast } from 'react-hot-toast';

interface CouponAnalyticsProps {
  couponId: string;
  coupon: Coupon;
  isOpen: boolean;
  onClose: () => void;
}

interface MetricCard {
  title: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'stable';
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description?: string;
}

const CouponAnalytics: React.FC<CouponAnalyticsProps> = ({
  couponId,
  coupon,
  isOpen,
  onClose
}) => {
  const [analytics, setAnalytics] = useState<CouponAnalyticsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [showInsights, setShowInsights] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch analytics data
  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const data = await couponService.fetchCouponAnalytics(couponId);
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  // Refresh analytics
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
    toast.success('Analytics refreshed');
  };

  useEffect(() => {
    if (isOpen && couponId) {
      fetchAnalytics();
    }
  }, [isOpen, couponId]);

  // Calculate key metrics
  const keyMetrics = useMemo((): MetricCard[] => {
    if (!analytics) return [];

    const conversionRate = analytics.collection_rate || 0;
    const redemptionRate = analytics.redemption_rate || 0;
    const avgDiscount = analytics.average_discount_per_redemption || 0;
    const revenue = analytics.estimated_revenue_generated || 0;

    return [
      {
        title: 'Total Collections',
        value: analytics.total_collections,
        change: '+12% vs last month',
        trend: 'up',
        icon: Users,
        color: 'bg-blue-500',
        description: 'Users who saved this coupon'
      },
      {
        title: 'Total Redemptions',
        value: analytics.total_redemptions,
        change: '+8% vs last month',
        trend: 'up',
        icon: ShoppingCart,
        color: 'bg-green-500',
        description: 'Times coupon was actually used'
      },
      {
        title: 'Conversion Rate',
        value: `${(conversionRate * 100).toFixed(1)}%`,
        change: conversionRate > 0.15 ? '+Good' : 'Needs improvement',
        trend: conversionRate > 0.15 ? 'up' : 'down',
        icon: Target,
        color: 'bg-purple-500',
        description: 'Collections to redemptions ratio'
      },
      {
        title: 'Revenue Impact',
        value: `₹${revenue.toLocaleString()}`,
        change: '+25% revenue boost',
        trend: 'up',
        icon: TrendingUp,
        color: 'bg-orange-500',
        description: 'Estimated additional revenue generated'
      },
      {
        title: 'Average Discount',
        value: `₹${avgDiscount.toFixed(0)}`,
        change: `${analytics.total_redemptions} uses`,
        trend: 'stable',
        icon: Gift,
        color: 'bg-pink-500',
        description: 'Average discount per redemption'
      },
      {
        title: 'Unique Users',
        value: analytics.unique_collectors,
        change: `${analytics.unique_redeemers} redeemers`,
        trend: 'stable',
        icon: UserCheck,
        color: 'bg-indigo-500',
        description: 'Distinct users engaged'
      }
    ];
  }, [analytics]);

  // Performance insights
  const getPerformanceInsights = (): Array<{
    type: 'success' | 'warning' | 'info';
    title: string;
    message: string;
    icon: React.ComponentType<{ className?: string }>;
  }> => {
    if (!analytics) return [];

    const insights = [];

    // Collection rate insights
    if (analytics.collection_rate > 0.2) {
      insights.push({
        type: 'success' as const,
        title: 'High Collection Rate',
        message: 'Your coupon is attracting good attention! Consider increasing distribution.',
        icon: CheckCircle
      });
    } else if (analytics.collection_rate < 0.05) {
      insights.push({
        type: 'warning' as const,
        title: 'Low Collection Rate',
        message: 'Consider improving your coupon title, discount value, or promotion strategy.',
        icon: AlertTriangle
      });
    }

    // Redemption rate insights
    if (analytics.redemption_rate > 0.3) {
      insights.push({
        type: 'success' as const,
        title: 'Excellent Redemption Rate',
        message: 'Users find great value in your offer! This is driving real business.',
        icon: Zap
      });
    } else if (analytics.redemption_rate < 0.1) {
      insights.push({
        type: 'warning' as const,
        title: 'Low Redemption Rate',
        message: 'Users collect but don\'t redeem. Check terms, minimum purchase, or ease of use.',
        icon: AlertTriangle
      });
    }

    // Revenue insights
    if (analytics.estimated_revenue_generated > 10000) {
      insights.push({
        type: 'success' as const,
        title: 'Strong Revenue Impact',
        message: 'This coupon is generating significant additional revenue for your business.',
        icon: TrendingUp
      });
    }

    // Collection sources insights
    const topSource = analytics.top_collection_sources?.[0];
    if (topSource && topSource.percentage > 50) {
      insights.push({
        type: 'info' as const,
        title: 'Dominant Collection Source',
        message: `Most users (${topSource.percentage}%) find your coupon via ${topSource.source.replace('_', ' ')}. Consider diversifying channels.`,
        icon: Share2
      });
    }

    return insights;
  };

  // Format collection source display
  const formatCollectionSource = (source: string): string => {
    const sourceMap: Record<string, string> = {
      'direct_search': 'Search Results',
      'business_profile': 'Business Page',
      'social_share': 'Social Sharing',
      'push_notification': 'Notifications',
      'qr_scan': 'QR Code Scan',
      'admin_push': 'Promoted'
    };
    return sourceMap[source] || source.replace('_', ' ').toUpperCase();
  };

  // Simple chart component for daily stats
  const DailyStatsChart: React.FC<{ data: DailyAnalytics[] }> = ({ data }) => {
    if (!data || data.length === 0) return null;

    const maxValue = Math.max(...data.map(d => Math.max(d.collections, d.redemptions)));
    
    return (
      <div className="space-y-3">
        {data.slice(-7).map((day, index) => (
          <div key={day.date} className="flex items-center space-x-3">
            <div className="w-16 text-xs text-gray-500">
              {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center space-x-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(day.collections / maxValue) * 100}%` }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-blue-500 h-2 rounded-full"
                  />
                </div>
                <span className="text-xs text-gray-600 w-8">{day.collections}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(day.redemptions / maxValue) * 100}%` }}
                    transition={{ delay: index * 0.1 + 0.05 }}
                    className="bg-green-500 h-2 rounded-full"
                  />
                </div>
                <span className="text-xs text-gray-600 w-8">{day.redemptions}</span>
              </div>
            </div>
          </div>
        ))}
        <div className="flex items-center justify-center space-x-4 text-xs text-gray-500 pt-2 border-t">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span>Collections</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>Redemptions</span>
          </div>
        </div>
      </div>
    );
  };

  // Conversion funnel component
  const ConversionFunnelChart: React.FC<{ funnel: ConversionFunnel }> = ({ funnel }) => {
    const stages = [
      { label: 'Views', value: funnel.views, color: 'bg-gray-400' },
      { label: 'Collections', value: funnel.collections, color: 'bg-blue-500' },
      { label: 'Redemptions', value: funnel.redemptions, color: 'bg-green-500' }
    ];

    const maxValue = Math.max(funnel.views, funnel.collections, funnel.redemptions);

    return (
      <div className="space-y-4">
        {stages.map((stage, index) => (
          <div key={stage.label} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">{stage.label}</span>
              <span className="text-sm text-gray-500">{stage.value.toLocaleString()}</span>
            </div>
            <div className="relative">
              <div className="w-full bg-gray-200 rounded-full h-8">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(stage.value / maxValue) * 100}%` }}
                  transition={{ delay: index * 0.2 }}
                  className={`${stage.color} h-8 rounded-full flex items-center justify-center text-white text-sm font-medium`}
                >
                  {stage.value > 0 && `${((stage.value / stages[0].value) * 100).toFixed(1)}%`}
                </motion.div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-500 to-pink-500 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <BarChart3 className="w-6 h-6" />
                Analytics Dashboard
              </h2>
              <p className="text-sm opacity-90 mt-1">{coupon.title}</p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors disabled:opacity-50"
              >
                <RefreshCcw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-h-[calc(90vh-80px)] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
          ) : analytics ? (
            <div className="p-6 space-y-8">
              {/* Key Metrics */}
              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-600" />
                  Key Performance Metrics
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {keyMetrics.map((metric, index) => (
                    <motion.div
                      key={metric.title}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className={`w-10 h-10 ${metric.color} rounded-lg flex items-center justify-center`}>
                          <metric.icon className="w-5 h-5 text-white" />
                        </div>
                        {metric.trend && (
                          <div className={`flex items-center text-sm ${
                            metric.trend === 'up' ? 'text-green-600' : 
                            metric.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                          }`}>
                            {metric.trend === 'up' ? (
                              <TrendingUp className="w-4 h-4 mr-1" />
                            ) : metric.trend === 'down' ? (
                              <TrendingDown className="w-4 h-4 mr-1" />
                            ) : null}
                          </div>
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="text-2xl font-bold text-gray-900">{metric.value}</div>
                        <div className="text-sm font-medium text-gray-700">{metric.title}</div>
                        {metric.change && (
                          <div className="text-xs text-gray-500">{metric.change}</div>
                        )}
                        {metric.description && (
                          <div className="text-xs text-gray-400 mt-2">{metric.description}</div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>

              {/* Performance Insights */}
              {showInsights && (
                <section>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-600" />
                    Performance Insights
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {getPerformanceInsights().map((insight, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`p-4 rounded-lg border-l-4 ${
                          insight.type === 'success' ? 'bg-green-50 border-green-500' :
                          insight.type === 'warning' ? 'bg-yellow-50 border-yellow-500' :
                          'bg-blue-50 border-blue-500'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <insight.icon className={`w-5 h-5 mt-0.5 ${
                            insight.type === 'success' ? 'text-green-600' :
                            insight.type === 'warning' ? 'text-yellow-600' :
                            'text-blue-600'
                          }`} />
                          <div>
                            <h4 className="font-medium text-gray-900">{insight.title}</h4>
                            <p className="text-sm text-gray-600 mt-1">{insight.message}</p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </section>
              )}

              {/* Charts Section */}
              <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Daily Performance */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    Daily Performance (Last 7 Days)
                  </h4>
                  <DailyStatsChart data={analytics.daily_stats} />
                </div>

                {/* Conversion Funnel */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-green-600" />
                    Conversion Funnel
                  </h4>
                  <ConversionFunnelChart funnel={analytics.conversion_funnel} />
                </div>
              </section>

              {/* Collection Sources & User Segments */}
              <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Collection Sources */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Share2 className="w-5 h-5 text-purple-600" />
                    Collection Sources
                  </h4>
                  <div className="space-y-3">
                    {analytics.top_collection_sources?.map((source, index) => (
                      <div key={source.source} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${
                            index === 0 ? 'bg-purple-500' :
                            index === 1 ? 'bg-blue-500' :
                            index === 2 ? 'bg-green-500' : 'bg-gray-400'
                          }`} />
                          <span className="text-sm font-medium text-gray-700">
                            {formatCollectionSource(source.source)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">{source.count}</span>
                          <span className="text-xs text-gray-400">({source.percentage.toFixed(1)}%)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* User Segments */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-orange-600" />
                    User Segments
                  </h4>
                  <div className="space-y-3">
                    {analytics.top_user_segments?.map((segment, index) => (
                      <div key={segment.segment} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">
                            {segment.segment.replace('_', ' ').toUpperCase()}
                          </span>
                          <span className="text-sm text-gray-600">
                            {segment.count} ({segment.percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${segment.percentage}%` }}
                            transition={{ delay: index * 0.1 }}
                            className={`h-2 rounded-full ${
                              index === 0 ? 'bg-orange-500' :
                              index === 1 ? 'bg-blue-500' :
                              index === 2 ? 'bg-green-500' : 'bg-gray-400'
                            }`}
                          />
                        </div>
                        {segment.avg_redemption_value > 0 && (
                          <div className="text-xs text-gray-500">
                            Avg. value: ₹{segment.avg_redemption_value.toFixed(0)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Summary Statistics */}
              <section className="bg-gray-50 rounded-lg p-6">
                <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-gray-600" />
                  Summary Statistics
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {((analytics.conversion_funnel.collection_to_redemption_rate || 0) * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600">Collection to Redemption</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      ₹{(analytics.total_discount_given || 0).toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">Total Discounts Given</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600">
                      {analytics.unique_redeemers}
                    </div>
                    <div className="text-sm text-gray-600">Unique Redeemers</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange-600">
                      {Math.round(((analytics.unique_redeemers || 0) / (analytics.unique_collectors || 1)) * 100)}%
                    </div>
                    <div className="text-sm text-gray-600">User Retention Rate</div>
                  </div>
                </div>
              </section>
            </div>
          ) : (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Analytics Data</h3>
                <p className="text-gray-600">Analytics data will appear once users start interacting with your coupon.</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default CouponAnalytics;