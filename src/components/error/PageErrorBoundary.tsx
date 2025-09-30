/**
 * PageErrorBoundary Component
 * 
 * Specialized error boundary for page-level components.
 * Provides full-page error fallback with navigation options.
 * 
 * @module PageErrorBoundary
 */

import React, { ReactNode } from 'react';
import { ErrorBoundary } from './ErrorBoundary';

interface PageErrorBoundaryProps {
  children: ReactNode;
  pageName?: string;
}

/**
 * Page-level error boundary
 * Wraps entire page components to prevent full app crashes
 */
export function PageErrorBoundary({ children, pageName }: PageErrorBoundaryProps) {
  return (
    <ErrorBoundary
      level="page"
      onError={(error, errorInfo) => {
        // Log page-specific error
        console.error(`Page Error [${pageName || 'Unknown'}]:`, {
          error,
          errorInfo,
          page: pageName,
          timestamp: new Date().toISOString()
        });
      }}
    >
      {children}
    </ErrorBoundary>
  );
}