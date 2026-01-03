import React, { useState, useEffect } from 'react';
import { X, CheckCircle, User, FileText, MapPin, Heart } from 'lucide-react';
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
      completed: !!(profile?.bio && profile.bio.length > 0),
    },
    {
      id: 'location',
      title: 'City',
      icon: MapPin,
      completed: !!profile?.location || !!profile?.city,
    },
    {
      id: 'interests',
      title: 'Interests',
      icon: Heart,
      completed: !!(profile?.interests && profile.interests.length > 0),
    }
  ];

  useEffect(() => {
    const completedSteps = steps.filter(step => step.completed).length;
    const percentage = Math.round((completedSteps / steps.length) * 100);
    setCompletionPercentage(percentage);

    // If 100% complete on mount/update, hide immediately unless we want to show a success state transiently
    // For now, adhering to "do not show it anymore"
    if (percentage === 100) {
      // Only show success animation if we just transitioned to 100 (optional, but for now complying strictly to user user request to 'not show')
      // We'll use a timeout only if we were previously visible and incomplete to show the success state? 
      // Simpler: Just hide if 100%.
      // But wait, the user sees it "still too tall" implying they see it. 
      // If I simply setVisible(false) here, it might flash. 
      // Let's rely on the conditional return.
    } else {
      setVisible(true);
    }
  }, [profile]);

  // Derived visibility: If 100% complete, don't render. 
  // We can keep the 'visible' state for manual dismissal.
  // If percentage is 100, we override visible to false? 
  // No, let's just use the percentage directly in the render condition or effect.

  if (!visible && completionPercentage < 100) return null; // Respect manual dismiss if not 100? User said "until info missing".
  // User said: "do not show it anymore until some of the information is found missing again."
  // This implies if < 100, it SHOULD show.

  if (completionPercentage === 100) return null;

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem('wizardDismissed', 'true');
  };

  if (!visible) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-4 py-3 flex items-center justify-between overflow-x-auto scrollbar-hide mb-8">
      <div className="flex flex-nowrap items-center gap-4 md:gap-8 min-w-max">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <div
              key={step.id}
              className="flex items-center gap-2"
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${step.completed
                  ? 'bg-green-100 text-green-600'
                  : 'bg-gray-100 text-gray-400'
                  }`}
              >
                {step.completed ? (
                  <CheckCircle className="w-3.5 h-3.5" />
                ) : (
                  <Icon className="w-3.5 h-3.5" />
                )}
              </div>
              <span
                className={`text-xs font-medium ${step.completed
                  ? 'text-green-600'
                  : 'text-gray-500' // Ensure visible text
                  }`}
              >
                {step.title}
              </span>
            </div>
          );
        })}
      </div>

      <button
        onClick={handleDismiss}
        className="text-gray-400 hover:text-gray-600 transition-colors ml-4"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
