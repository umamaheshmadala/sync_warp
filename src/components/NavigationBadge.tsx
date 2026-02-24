// src/components/NavigationBadge.tsx
import React from 'react';

interface NavigationBadgeProps {
  count: number;
  show: boolean;
  color?: string;
  textColor?: string;
  size?: 'sm' | 'md' | 'lg';
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  maxCount?: number;
  pulse?: boolean;
}

const NavigationBadge: React.FC<NavigationBadgeProps> = ({
  count,
  show,
  color = 'bg-red-500',
  textColor = 'text-white',
  size = 'sm',
  position = 'top-right',
  maxCount = 99,
  pulse = true
}) => {
  // Size configurations
  const sizeClasses = {
    sm: 'h-5 w-5 text-xs min-w-[20px]',
    md: 'h-6 w-6 text-sm min-w-[24px]',
    lg: 'h-7 w-7 text-base min-w-[28px]'
  };

  // Position configurations
  const positionClasses = {
    'top-right': '-top-1 -right-1',
    'top-left': '-top-1 -left-1',
    'bottom-right': '-bottom-1 -right-1',
    'bottom-left': '-bottom-1 -left-1'
  };

  // Format count display
  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();

  // Badge variants for animations
  const badgeVariants = {
    hidden: {
      scale: 0,
      opacity: 0,
      rotate: -180
    },
    visible: {
      scale: 1,
      opacity: 1,
      rotate: 0,
      transition: {
        type: "spring" as const,
        stiffness: 500,
        damping: 25
      }
    },
    exit: {
      scale: 0,
      opacity: 0,
      rotate: 180,
      transition: {
        duration: 0.2
      }
    },
    pulse: {
      scale: [1, 1.2, 1],
      transition: {
        duration: 1,
        repeat: Infinity,
        repeatType: "loop" as const
      }
    }
  };

  // Count change animation
  const countVariants = {
    hidden: { y: -20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: {
        type: "spring" as const,
        stiffness: 400,
        damping: 25
      }
    },
    exit: { 
      y: 20, 
      opacity: 0,
      transition: { duration: 0.1 }
    }
  };

  return (
    <>
      {show && (
              <div
                className={`
            absolute flex items-center justify-center
            ${positionClasses[position]}
            ${sizeClasses[size]}
            ${color}
            ${textColor}
            font-bold rounded-full
            shadow-lg border-2 border-white
            z-20
          `}
                style={{
                  minWidth: size === 'sm' ? '20px' : size === 'md' ? '24px' : '28px'
                }}
              >
                {/* Background glow effect */}
                <div
                  className={`absolute inset-0 ${color} rounded-full opacity-30 blur-sm`}
                />
                
                {/* Count display with animation */}
                <span
                  key={count} // Key ensures animation on count change
                  className="relative z-10 px-1"
                >
                  {displayCount}
                </span>
              </div>
            )}
      </>
  );
};

export default NavigationBadge;