// =====================================================
// Story 5.2: Review Statistics Component
// =====================================================

import React from 'react';
import { motion } from 'framer-motion';
import {
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Image as ImageIcon,
  Tag,
  TrendingUp,
} from 'lucide-react';
import type { ReviewStats as ReviewStatsType } from '../../types/review';

interface ReviewStatsProps {
  stats: ReviewStatsType;
  loading?: boolean;
}

export default function ReviewStats({ stats, loading = false }: ReviewStatsProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      icon: MessageSquare,
      label: 'Total Reviews',
      value: stats.total_reviews,
      color: 'blue',
    },
    {
      icon: ThumbsUp,
      label: 'Recommend',
      value: stats.recommend_count,
      color: 'green',
      percentage: stats.recommend_percentage,
    },
    {
      icon: ThumbsDown,
      label: 'Don\'t Recommend',
      value: stats.not_recommend_count,
      color: 'red',
      percentage: 100 - stats.recommend_percentage,
    },
    {
      icon: ImageIcon,
      label: 'With Photos',
      value: stats.reviews_with_photos,
      color: 'purple',
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header with Recommendation Percentage */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-1">Review Statistics</h3>
            <p className="text-blue-100 text-sm">
              Based on {stats.total_reviews} {stats.total_reviews === 1 ? 'review' : 'reviews'}
            </p>
          </div>
          {stats.total_reviews > 0 && (
            <div className="text-right">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-6 h-6" />
                <span className="text-4xl font-bold">{stats.recommend_percentage}%</span>
              </div>
              <p className="text-blue-100 text-sm mt-1">Recommend</p>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {stats.total_reviews > 0 && (
          <div className="mt-4">
            <div className="h-3 bg-white bg-opacity-20 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${stats.recommend_percentage}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full bg-white rounded-full"
              />
            </div>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-gray-200">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          const colorClasses = {
            blue: 'text-blue-600 bg-blue-50',
            green: 'text-green-600 bg-green-50',
            red: 'text-red-600 bg-red-50',
            purple: 'text-purple-600 bg-purple-50',
          };

          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white p-6"
            >
              <div className={`w-10 h-10 rounded-lg ${colorClasses[stat.color as keyof typeof colorClasses]} flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-gray-900">
                  {stat.value}
                </span>
                {stat.percentage !== undefined && (
                  <span className="text-sm text-gray-500">
                    ({stat.percentage.toFixed(0)}%)
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1">{stat.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Additional Stats */}
      {stats.total_reviews > 0 && (
        <div className="p-6 bg-gray-50 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600">
                {stats.reviews_with_text} with text
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600">
                Avg {stats.average_tags_per_review.toFixed(1)} tags/review
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
