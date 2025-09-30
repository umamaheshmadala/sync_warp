/**
 * SectionErrorBoundary Component
 * 
 * Specialized error boundary for major sections of pages.
 * Isolates errors to prevent full page crashes while maintaining app stability.
 * 
 * @module SectionErrorBoundary
 */

import React, { ReactNode } from 'react';
import { ErrorBoundary } from './ErrorBoundary';

interface SectionErrorBoundaryProps {
  children: ReactNode;
  sectionName?: string;
  fallback?: ReactNode;
}

/**
 * Section-level error boundary
 * Wraps major sections (dashboard, forms, lists, etc.)
 */
export function SectionErrorBoundary({ 
  children, 
  sectionName,
  fallback 
}: SectionErrorBoundaryProps) {
  return (
    <ErrorBoundary
      level="section"
      isolate={true}
      fallback={fallback}
      onError={(error, errorInfo) => {
        // Log section-specific error
        console.error(`Section Error [${sectionName || 'Unknown'}]:`, {
          error,
          errorInfo,
          section: sectionName,
          timestamp: new Date().toISOString()
        });
      }}
    >
      {children}
    </ErrorBoundary>
  );
}