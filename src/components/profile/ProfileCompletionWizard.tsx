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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-4">
      {/* Header with Progress */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {completionPercentage === 100 ? '✨ Profile Complete!' : 'Complete Your Profile'}
            </h3>
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          {/* Progress Bar */}
          <div className="flex items-center space-x-3">
            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-full transition-all duration-500 ease-out"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">
              {completionPercentage}%
            </span>
          </div>
        </div>
      </div>

      {/* Compact Steps Icons */}
      <div className="flex items-center justify-between gap-2">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <div
              key={step.id}
              className="flex flex-col items-center flex-1 group cursor-pointer"
              onClick={() => !step.completed && onStepClick?.()}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  step.completed
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                }`}
              >
                {step.completed ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
              </div>
              <span
                className={`text-xs mt-1.5 text-center font-medium ${
                  step.completed
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400'
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
