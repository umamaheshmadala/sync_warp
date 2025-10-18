// =====================================================
// Story 4.10: Storefront Minor Enhancements
// Component: EmptyState - Generic reusable empty state
// =====================================================

import React, { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from './button';

export interface EmptyStateProps {
  /** Icon component to display (Lucide icon) */
  icon?: LucideIcon;
  
  /** Emoji or text icon as alternative to Lucide icon */
  emoji?: string;
  
  /** Title of the empty state */
  title: string;
  
  /** Description/message */
  description?: string;
  
  /** Optional action button */
  action?: {
    label: string;
    onClick: () => void;
  };
  
  /** Custom children to render instead of default layout */
  children?: ReactNode;
  
  /** Icon background gradient colors */
  iconBgClass?: string;
  
  /** Icon color class */
  iconColorClass?: string;
}

/**
 * Generic empty state component
 * 
 * Features:
 * - Flexible icon display (Lucide icon or emoji)
 * - Customizable title and description
 * - Optional action button
 * - Responsive layout
 * - Customizable styling
 * 
 * @example
 * <EmptyState
 *   icon={Package}
 *   title="No Products Yet"
 *   description="This business hasn't added any products."
 * />
 * 
 * @example
 * <EmptyState
 *   emoji="📦"
 *   title="No Products Yet"
 *   description="This business hasn't added any products."
 *   action={{
 *     label: "Browse Other Businesses",
 *     onClick: () => navigate('/businesses')
 *   }}
 * />
 */
export function EmptyState({
  icon: Icon,
  emoji,
  title,
  description,
  action,
  children,
  iconBgClass = 'bg-gradient-to-br from-gray-100 to-gray-200',
  iconColorClass = 'text-gray-600',
}: EmptyStateProps) {
  // If custom children provided, render them
  if (children) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12">
        <div className="text-center max-w-md mx-auto">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-12">
      <div className="text-center max-w-md mx-auto">
        {/* Icon */}
        <div className="mb-6">
          {emoji ? (
            <div className="text-6xl mb-4">
              {emoji}
            </div>
          ) : Icon ? (
            <div className={`mx-auto w-16 h-16 ${iconBgClass} rounded-full flex items-center justify-center`}>
              <Icon className={`w-8 h-8 ${iconColorClass}`} />
            </div>
          ) : null}
        </div>

        {/* Title */}
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {title}
        </h3>

        {/* Description */}
        {description && (
          <p className="text-gray-600 leading-relaxed mb-6">
            {description}
          </p>
        )}

        {/* Action Button */}
        {action && (
          <Button
            onClick={action.onClick}
            variant="outline"
            className="mx-auto"
          >
            {action.label}
          </Button>
        )}
      </div>
    </div>
  );
}

export default EmptyState;
