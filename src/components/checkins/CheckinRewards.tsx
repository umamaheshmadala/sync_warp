// src/components/checkins/CheckinRewards.tsx
// Simple rewards and gamification system for check-ins

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star,
  Award,
  Trophy,
  Target,
  Zap,
  Gift,
  MapPin,
  Calendar,
  TrendingUp,
  Crown,
  Medal,
  Badge,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { CheckinData } from '../../hooks/useCheckins';

interface UserRewards {
  totalPoints: number;
  level: number;
  totalCheckins: number;
  uniqueBusinessesVisited: number;
  streak: number;
  longestStreak: number;
  achievements: Achievement[];
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  points: number;
  unlocked: boolean;
  unlockedAt?: string;
  progress?: number;
  target?: number;
}

interface CheckinRewardsProps {
  checkins: CheckinData[];
  onPointsEarned?: (points: number, reason: string) => void;
}

const CheckinRewards: React.FC<CheckinRewardsProps> = ({ 
  checkins, 
  onPointsEarned 
}) => {
  const { user } = useAuthStore();
  const [rewards, setRewards] = useState<UserRewards>({
    totalPoints: 0,
    level: 1,
    totalCheckins: 0,
    uniqueBusinessesVisited: 0,
    streak: 0,
    longestStreak: 0,
    achievements: [],
  });
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [showNewAchievement, setShowNewAchievement] = useState<Achievement | null>(null);

  // Achievement definitions
  const achievementDefinitions: Omit<Achievement, 'unlocked' | 'unlockedAt' | 'progress'>[] = [
    {
      id: 'first_checkin',
      title: 'First Steps',
      description: 'Complete your first check-in',
      icon: '🎯',
      points: 10,
      target: 1,
    },
    {
      id: 'explorer_5',
      title: 'Explorer',
      description: 'Check in to 5 different businesses',
      icon: '🗺️',
      points: 25,
      target: 5,
    },
    {
      id: 'explorer_15',
      title: 'Adventurer',
      description: 'Check in to 15 different businesses',
      icon: '🧭',
      points: 50,
      target: 15,
    },
    {
      id: 'regular_10',
      title: 'Regular',
      description: 'Complete 10 check-ins',
      icon: '⭐',
      points: 30,
      target: 10,
    },
    {
      id: 'regular_25',
      title: 'Frequent Visitor',
      description: 'Complete 25 check-ins',
      icon: '🌟',
      points: 75,
      target: 25,
    },
    {
      id: 'regular_50',
      title: 'VIP Member',
      description: 'Complete 50 check-ins',
      icon: '👑',
      points: 150,
      target: 50,
    },
    {
      id: 'streak_3',
      title: 'Getting Started',
      description: 'Check in 3 days in a row',
      icon: '🔥',
      points: 20,
      target: 3,
    },
    {
      id: 'streak_7',
      title: 'Week Warrior',
      description: 'Check in 7 days in a row',
      icon: '🏆',
      points: 50,
      target: 7,
    },
    {
      id: 'streak_14',
      title: 'Streak Master',
      description: 'Check in 14 days in a row',
      icon: '💎',
      points: 100,
      target: 14,
    },
    {
      id: 'early_bird',
      title: 'Early Bird',
      description: 'Check in before 9 AM',
      icon: '🌅',
      points: 15,
      target: 1,
    },
    {
      id: 'night_owl',
      title: 'Night Owl',
      description: 'Check in after 9 PM',
      icon: '🌙',
      points: 15,
      target: 1,
    },
  ];

  // Calculate current streak
  const calculateStreak = (checkins: CheckinData[]): { current: number; longest: number } => {
    if (checkins.length === 0) return { current: 0, longest: 0 };

    const sortedCheckins = [...checkins]
      .sort((a, b) => new Date(b.checked_in_at).getTime() - new Date(a.checked_in_at).getTime());

    // Get unique check-in dates
    const uniqueDates = [...new Set(
      sortedCheckins.map(c => new Date(c.checked_in_at).toDateString())
    )];

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();

    // Calculate current streak
    for (let i = 0; i < uniqueDates.length; i++) {
      const date = new Date(uniqueDates[i]);
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - i);

      if (date.toDateString() === expectedDate.toDateString()) {
        currentStreak++;
      } else {
        break;
      }
    }

    // If today is not included but yesterday is, still count the streak
    if (currentStreak === 0 && uniqueDates.includes(yesterday)) {
      currentStreak = 1;
    }

    // Calculate longest streak
    for (let i = 0; i < uniqueDates.length; i++) {
      const currentDate = new Date(uniqueDates[i]);
      const nextDate = i < uniqueDates.length - 1 ? new Date(uniqueDates[i + 1]) : null;

      if (nextDate && Math.abs(currentDate.getTime() - nextDate.getTime()) <= 24 * 60 * 60 * 1000) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }

      longestStreak = Math.max(longestStreak, tempStreak);
    }

    return { current: currentStreak, longest: longestStreak };
  };

  // Calculate level from points
  const calculateLevel = (points: number): number => {
    return Math.floor(points / 100) + 1;
  };

  // Calculate rewards based on check-ins
  useEffect(() => {
    if (!checkins.length) return;

    const totalCheckins = checkins.length;
    const uniqueBusinesses = new Set(checkins.map(c => c.business_id)).size;
    const { current: streak, longest: longestStreak } = calculateStreak(checkins);

    // Calculate achievements
    const achievements: Achievement[] = achievementDefinitions.map(def => {
      let progress = 0;
      let unlocked = false;

      switch (def.id) {
        case 'first_checkin':
          progress = Math.min(totalCheckins, def.target!);
          unlocked = totalCheckins >= def.target!;
          break;
        case 'explorer_5':
        case 'explorer_15':
          progress = Math.min(uniqueBusinesses, def.target!);
          unlocked = uniqueBusinesses >= def.target!;
          break;
        case 'regular_10':
        case 'regular_25':
        case 'regular_50':
          progress = Math.min(totalCheckins, def.target!);
          unlocked = totalCheckins >= def.target!;
          break;
        case 'streak_3':
        case 'streak_7':
        case 'streak_14':
          progress = Math.min(longestStreak, def.target!);
          unlocked = longestStreak >= def.target!;
          break;
        case 'early_bird':
          progress = checkins.filter(c => 
            new Date(c.checked_in_at).getHours() < 9
          ).length > 0 ? 1 : 0;
          unlocked = progress >= def.target!;
          break;
        case 'night_owl':
          progress = checkins.filter(c => 
            new Date(c.checked_in_at).getHours() >= 21
          ).length > 0 ? 1 : 0;
          unlocked = progress >= def.target!;
          break;
      }

      return {
        ...def,
        progress,
        unlocked,
        unlockedAt: unlocked ? checkins[0]?.checked_in_at : undefined,
      };
    });

    const totalPoints = achievements
      .filter(a => a.unlocked)
      .reduce((sum, a) => sum + a.points, 0) + (totalCheckins * 5); // 5 points per check-in

    const level = calculateLevel(totalPoints);
    
    // Check for level up
    const previousLevel = calculateLevel(rewards.totalPoints);
    if (level > previousLevel && rewards.totalPoints > 0) {
      setShowLevelUp(true);
      setTimeout(() => setShowLevelUp(false), 3000);
    }

    // Check for new achievements
    const newAchievements = achievements.filter(a => 
      a.unlocked && !rewards.achievements.find(r => r.id === a.id && r.unlocked)
    );
    
    if (newAchievements.length > 0 && rewards.achievements.length > 0) {
      setShowNewAchievement(newAchievements[0]);
      setTimeout(() => setShowNewAchievement(null), 4000);
      
      // Trigger points earned callback
      newAchievements.forEach(achievement => {
        onPointsEarned?.(achievement.points, `Achievement unlocked: ${achievement.title}`);
      });
    }

    setRewards({
      totalPoints,
      level,
      totalCheckins,
      uniqueBusinessesVisited: uniqueBusinesses,
      streak,
      longestStreak,
      achievements,
    });
  }, [checkins, rewards.totalPoints, rewards.achievements.length, onPointsEarned]);

  const getLevelProgress = (): { current: number; max: number; percentage: number } => {
    const pointsInCurrentLevel = rewards.totalPoints % 100;
    return {
      current: pointsInCurrentLevel,
      max: 100,
      percentage: pointsInCurrentLevel,
    };
  };

  const getNextLevelPoints = (): number => {
    return 100 - (rewards.totalPoints % 100);
  };

  return (
    <div className="space-y-6">
      {/* Level Up Animation */}
      <AnimatePresence>
        {showLevelUp && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -50 }}
            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
          >
            <div className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white rounded-2xl p-8 text-center shadow-2xl">
              <Crown className="w-16 h-16 mx-auto mb-4" />
              <h2 className="text-3xl font-bold mb-2">Level Up!</h2>
              <p className="text-xl">You're now Level {rewards.level}!</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Achievement Animation */}
      <AnimatePresence>
        {showNewAchievement && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="fixed top-4 right-4 bg-white border border-green-200 rounded-lg p-4 shadow-lg z-50 max-w-sm"
          >
            <div className="flex items-center space-x-3">
              <div className="text-2xl">{showNewAchievement.icon}</div>
              <div>
                <h4 className="font-semibold text-green-900">Achievement Unlocked!</h4>
                <p className="text-sm text-green-700">{showNewAchievement.title}</p>
                <p className="text-xs text-green-600">+{showNewAchievement.points} points</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* User Level & Points */}
      <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <Crown className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-2xl font-bold">Level {rewards.level}</h3>
              <p className="text-blue-100">{rewards.totalPoints} points</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-blue-100">Next level in</p>
            <p className="text-xl font-semibold">{getNextLevelPoints()} points</p>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-white bg-opacity-20 rounded-full h-3">
          <div
            className="bg-white h-3 rounded-full transition-all duration-300"
            style={{ width: `${getLevelProgress().percentage}%` }}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4 text-center">
          <CheckinIcon className="w-8 h-8 text-blue-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-900">{rewards.totalCheckins}</p>
          <p className="text-sm text-gray-600">Check-ins</p>
        </div>
        
        <div className="bg-white rounded-lg border p-4 text-center">
          <MapPin className="w-8 h-8 text-green-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-900">{rewards.uniqueBusinessesVisited}</p>
          <p className="text-sm text-gray-600">Businesses</p>
        </div>
        
        <div className="bg-white rounded-lg border p-4 text-center">
          <Zap className="w-8 h-8 text-orange-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-900">{rewards.streak}</p>
          <p className="text-sm text-gray-600">Current Streak</p>
        </div>
        
        <div className="bg-white rounded-lg border p-4 text-center">
          <Trophy className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-900">{rewards.longestStreak}</p>
          <p className="text-sm text-gray-600">Best Streak</p>
        </div>
      </div>

      {/* Achievements */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <Award className="w-6 h-6 text-yellow-500 mr-2" />
          Achievements
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rewards.achievements.map((achievement) => (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0.6 }}
              animate={{ opacity: achievement.unlocked ? 1 : 0.6 }}
              className={`p-4 rounded-lg border-2 transition-colors ${
                achievement.unlocked
                  ? 'border-green-200 bg-green-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{achievement.icon}</span>
                  <div>
                    <h4 className={`font-semibold ${
                      achievement.unlocked ? 'text-green-900' : 'text-gray-600'
                    }`}>
                      {achievement.title}
                    </h4>
                    <p className={`text-sm ${
                      achievement.unlocked ? 'text-green-700' : 'text-gray-500'
                    }`}>
                      {achievement.description}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {achievement.unlocked ? (
                    <Badge className="w-6 h-6 text-green-600" />
                  ) : (
                    <span className="text-xs text-gray-500">+{achievement.points}pts</span>
                  )}
                </div>
              </div>
              
              {/* Progress Bar for Locked Achievements */}
              {!achievement.unlocked && achievement.target && achievement.progress !== undefined && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Progress</span>
                    <span>{achievement.progress}/{achievement.target}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${Math.min((achievement.progress / achievement.target) * 100, 100)}%` 
                      }}
                    />
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Helper component for check-in icon
const CheckinIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
  </svg>
);

export default CheckinRewards;