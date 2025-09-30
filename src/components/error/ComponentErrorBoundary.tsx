/**
 * ComponentErrorBoundary Component
 * 
 * Specialized error boundary for individual components.
 * Provides minimal fallback UI and detailed logging.
 * 
 * @module ComponentErrorBoundary
 */

import React, { ReactNode } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { AlertCircle } from 'lucide-react';

interface ComponentErrorBoundaryProps {
  children: ReactNode;
  componentName?: string;
  fallback?: ReactNode;
  minimal?: boolean; // Use minimal error display
}

/**
 * Minimal error fallback for component-level errors
 */
function MinimalErrorFallback({ componentName }: { componentName?: string }) {
  return (
    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      <span>
        {componentName 
          ? `Error loading ${componentName}` 
          : 'Error loading component'}
      </span>
    </div>
  );
}

/**
 * Component-level error boundary
 * Wraps individual components for fine-grained error isolation
 */
export function ComponentErrorBoundary({ 
  children, 
  componentName,
  fallback,
  minimal = false
}: ComponentErrorBoundaryProps) {
  const defaultFallback = minimal ? (
    <MinimalErrorFallback componentName={componentName} />
  ) : undefined;

  return (
    <ErrorBoundary
      level="component"
      isolate={true}
      fallback={fallback || defaultFallback}
      onError={(error, errorInfo) => {
        // Log component-specific error
        console.warn(`Component Error [${componentName || 'Unknown'}]:`, {
          error: error.message,
          component: componentName,
          timestamp: new Date().toISOString()
        });
      }}
    >
      {children}
    </ErrorBoundary>
  );
}