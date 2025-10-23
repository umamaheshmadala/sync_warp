import React, { useState, useEffect } from 'react';
import { Users, Target, TrendingUp, Clock, Heart } from 'lucide-react';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { supabase } from '../../lib/supabase';

interface FollowerTargetingOptions {
  targetFollowersOnly: boolean;
  minFollowDays?: number;
  engagementLevel?: 'all' | 'high' | 'medium' | 'low';
  includeRecentFollowers?: boolean;
}

interface FollowerTargetingEditorProps {
  businessId: string;
  value: FollowerTargetingOptions;
  onChange: (options: FollowerTargetingOptions) => void;
}

export const FollowerTargetingEditor: React.FC<FollowerTargetingEditorProps> = ({
  businessId,
  value,
  onChange,
}) => {
  const [followerCount, setFollowerCount] = useState<number>(0);
  const [estimatedReach, setEstimatedReach] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFollowerStats();
  }, [businessId]);

  useEffect(() => {
    calculateReach();
  }, [value, followerCount]);

  const fetchFollowerStats = async () => {
    try {
      setLoading(true);
      const { count } = await supabase
        .from('business_followers')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .eq('is_active', true);

      setFollowerCount(count || 0);
    } catch (error) {
      console.error('Error fetching follower stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateReach = () => {
    if (!value.targetFollowersOnly) {
      setEstimatedReach(followerCount);
      return;
    }

    let reach = followerCount;

    // Filter by follow duration
    if (value.minFollowDays) {
      // Estimate: newer followers are about 30% of the base
      if (value.minFollowDays >= 30) reach = Math.floor(reach * 0.7);
      if (value.minFollowDays >= 90) reach = Math.floor(reach * 0.5);
    }

    // Filter by engagement level
    if (value.engagementLevel) {
      switch (value.engagementLevel) {
        case 'high':
          reach = Math.floor(reach * 0.3); // Top 30%
          break;
        case 'medium':
          reach = Math.floor(reach * 0.5); // Top 50%
          break;
        case 'low':
          reach = Math.floor(reach * 0.2); // Bottom 20%
          break;
      }
    }

    setEstimatedReach(Math.max(1, reach));
  };

  const handleToggle = (enabled: boolean) => {
    if (enabled) {
      onChange({
        ...value,
        targetFollowersOnly: true,
        engagementLevel: 'all',
      });
    } else {
      onChange({
        targetFollowersOnly: false,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Target Your Followers</h3>
            <p className="text-sm text-gray-600">
              {loading ? 'Loading...' : `${followerCount.toLocaleString()} active followers`}
            </p>
          </div>
        </div>
        <Switch
          checked={value.targetFollowersOnly}
          onCheckedChange={handleToggle}
          disabled={loading || followerCount === 0}
        />
      </div>

      {followerCount === 0 && !loading && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> You don't have any followers yet. Share your business profile to start building your follower base!
          </p>
        </div>
      )}

      {/* Targeting Options - Only show when followers targeting is enabled */}
      {value.targetFollowersOnly && followerCount > 0 && (
        <div className="space-y-4">
          {/* Engagement Level Filter */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Engagement Level</Label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { value: 'all', label: 'All Followers', icon: Users },
                { value: 'high', label: 'High', icon: TrendingUp },
                { value: 'medium', label: 'Medium', icon: Target },
                { value: 'low', label: 'Low', icon: Clock },
              ].map(({ value: level, label, icon: Icon }) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => onChange({ ...value, engagementLevel: level as any })}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                    value.engagementLevel === level
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <Icon className={`w-5 h-5 mb-1 ${value.engagementLevel === level ? 'text-blue-600' : 'text-gray-600'}`} />
                  <span className={`text-xs font-medium ${value.engagementLevel === level ? 'text-blue-900' : 'text-gray-700'}`}>
                    {label}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500">
              Target followers based on their past engagement with your business
            </p>
          </div>

          {/* Follow Duration Filter */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Minimum Follow Duration</Label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { days: 0, label: 'Any' },
                { days: 7, label: '1 Week+' },
                { days: 30, label: '1 Month+' },
                { days: 90, label: '3 Months+' },
              ].map(({ days, label }) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => onChange({ ...value, minFollowDays: days === 0 ? undefined : days })}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    (value.minFollowDays || 0) === days
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <span className={`text-sm font-medium ${(value.minFollowDays || 0) === days ? 'text-purple-900' : 'text-gray-700'}`}>
                    {label}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500">
              Filter by how long users have been following your business
            </p>
          </div>

          {/* Recent Followers Option */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-pink-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">Include Recent Followers</p>
                <p className="text-xs text-gray-500">Target users who followed in the last 7 days</p>
              </div>
            </div>
            <Switch
              checked={value.includeRecentFollowers ?? false}
              onCheckedChange={(checked) => onChange({ ...value, includeRecentFollowers: checked })}
            />
          </div>
        </div>
      )}

      {/* Estimated Reach Summary */}
      {value.targetFollowersOnly && followerCount > 0 && (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Estimated Reach</p>
              <p className="text-3xl font-bold text-green-900">{estimatedReach.toLocaleString()}</p>
              <p className="text-xs text-green-700 mt-1">
                {followerCount > 0 ? `${((estimatedReach / followerCount) * 100).toFixed(0)}% of your followers` : ''}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              {value.engagementLevel !== 'all' && (
                <Badge variant="outline" className="bg-white">
                  {value.engagementLevel} engagement
                </Badge>
              )}
              {value.minFollowDays && value.minFollowDays > 0 && (
                <Badge variant="outline" className="bg-white">
                  {value.minFollowDays}+ days
                </Badge>
              )}
              {value.includeRecentFollowers && (
                <Badge variant="outline" className="bg-white">
                  + recent
                </Badge>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tips Section */}
      {value.targetFollowersOnly && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 text-sm mb-2">💡 Targeting Tips</h4>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• High engagement followers are 3x more likely to convert</li>
            <li>• Loyal followers (30+ days) show 40% better response rates</li>
            <li>• Recent followers are great for brand awareness campaigns</li>
          </ul>
        </div>
      )}
    </div>
  );
};
