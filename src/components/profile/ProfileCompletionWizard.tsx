import React, { useState, useEffect } from 'react';
import { X, CheckCircle, User, FileText, MapPin, Share2, Globe } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface ProfileCompletionWizardProps {
  onStepClick?: () => void;
}

export const ProfileCompletionWizard: React.FC<ProfileCompletionWizardProps> = ({ onStepClick }) => {
  const { profile } = useAuthStore();
  const [visible, setVisible] = useState(true);
  const [completionPercentage, setCompletionPercentage] = useState(0);

  const steps = [
    {
      id: 'avatar',
      title: 'Avatar',
      icon: User,
      completed: !!profile?.avatar_url,
    },
    {
      id: 'bio',
      title: 'Bio',
      icon: FileText,
      completed: !!(profile?.bio && profile.bio.length > 20),
    },
    {
      id: 'location',
      title: 'Location',
      icon: MapPin,
      completed: !!profile?.location,
    },
    {
      id: 'social',
      title: 'Social',
      icon: Share2,
      completed: !!(
        profile?.social_links &&
        typeof profile.social_links === 'object' &&
        Object.values(profile.social_links).some(link => link)
      ),
    },
    {
      id: 'website',
      title: 'Website',
      icon: Globe,
      completed: !!profile?.website,
    }
  ];

  useEffect(() => {
    const completedSteps = steps.filter(step => step.completed).length;
    const percentage = Math.round((completedSteps / steps.length) * 100);
    setCompletionPercentage(percentage);

    // Auto-hide wizard when 100% complete
    if (percentage === 100) {
      setTimeout(() => setVisible(false), 3000);
    }
  }, [profile]);

  // Don't show wizard if manually dismissed or 100% complete
  useEffect(() => {
    const dismissed = localStorage.getItem('wizardDismissed');
    if (dismissed === 'true' && completionPercentage < 100) {
      setVisible(false);
    }
  }, [completionPercentage]);

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem('wizardDismissed', 'true');
  };

  if (!visible) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 px-4 py-3">
      {/* Compact Header with Progress */}
      <div className="flex items-center gap-4 mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">
          {completionPercentage === 100 ? '✨ Completed!' : 'Complete Profile'}
        </h3>

        {/* Progress Bar */}
        <div className="flex-1 flex items-center gap-3">
          <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-full transition-all duration-500 ease-out"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-8 text-right">
            {completionPercentage}%
          </span>
        </div>

        <button
          onClick={handleDismiss}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors -mr-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Compact Steps Row */}
      <div className="flex items-center justify-between">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <div
              key={step.id}
              className="flex items-center gap-2"
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${step.completed
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                  }`}
              >
                {step.completed ? (
                  <CheckCircle className="w-3.5 h-3.5" />
                ) : (
                  <Icon className="w-3.5 h-3.5" />
                )}
              </div>
              <span
                className={`text-xs font-medium hidden sm:inline-block ${step.completed
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-gray-500 dark:text-gray-400'
                  }`}
              >
                {step.title}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
