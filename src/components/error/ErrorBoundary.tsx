/**
 * ErrorBoundary Component
 * 
 * React Error Boundary that catches JavaScript errors anywhere in the child
 * component tree, logs those errors, and displays a fallback UI.
 * 
 * Features:
 * - Catches and logs React errors
 * - Displays user-friendly error messages
 * - Provides error recovery options
 * - Integrates with error logging service
 * - Prevents full app crashes
 * 
 * @module ErrorBoundary
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * Props for ErrorBoundary component
 */
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
  isolate?: boolean; // If true, error only affects this boundary, not parent
  level?: 'page' | 'section' | 'component'; // Error boundary level for context
}

/**
 * State for ErrorBoundary component
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  errorCount: number;
}

/**
 * ErrorBoundary component class
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      errorCount: 0
    };
  }

  /**
   * Static method called when an error is thrown
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  /**
   * Lifecycle method called after an error is caught
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    this.logError(error, errorInfo);

    // Update state with error details
    this.setState(prevState => ({
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  /**
   * Reset error boundary when props change (if enabled)
   */
  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    if (!hasError) return;

    // Reset on specific key changes
    if (resetKeys) {
      const hasKeyChanged = resetKeys.some(
        (key, index) => prevProps.resetKeys?.[index] !== key
      );
      if (hasKeyChanged) {
        this.resetError();
      }
    }

    // Reset when any prop changes
    if (resetOnPropsChange && prevProps !== this.props) {
      this.resetError();
    }
  }

  /**
   * Log error to console and external service
   */
  private logError(error: Error, errorInfo: ErrorInfo) {
    const { level = 'component' } = this.props;

    // Console logging with context
    console.group(`🚨 React Error Boundary (${level})`);
    console.error('Error:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Component stack:', errorInfo.componentStack);
    console.groupEnd();

    // TODO: Send to external error logging service (e.g., Sentry)
    // This can be implemented later with environment-specific configuration
    /*
    if (typeof window !== 'undefined' && window.errorLogger) {
      window.errorLogger.logError({
        error,
        errorInfo,
        level,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      });
    }
    */
  }

  /**
   * Reset error boundary state
   */
  private resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false
    });
  };

  /**
   * Toggle error details visibility
   */
  private toggleDetails = () => {
    this.setState(prevState => ({
      showDetails: !prevState.showDetails
    }));
  };

  /**
   * Reload the current page
   */
  private reloadPage = () => {
    window.location.reload();
  };

  /**
   * Navigate to home page
   */
  private goHome = () => {
    window.location.href = '/';
  };

  /**
   * Render fallback UI
   */
  private renderFallback() {
    const { fallback, level = 'component' } = this.props;
    const { error, errorInfo, showDetails, errorCount } = this.state;

    // Use custom fallback if provided
    if (fallback) {
      return fallback;
    }

    // Determine severity based on error count
    const severity = errorCount > 2 ? 'critical' : 'error';

    // Default fallback UI
    return (
      <div
        className={`
          flex flex-col items-center justify-center p-6 rounded-lg
          ${level === 'page' ? 'min-h-screen' : 'min-h-[300px]'}
          ${severity === 'critical' ? 'bg-red-50 border-2 border-red-200' : 'bg-yellow-50 border-2 border-yellow-200'}
        `}
        role="alert"
      >
        <div className="max-w-md w-full text-center">
          {/* Error Icon */}
          <div className={`
            inline-flex items-center justify-center w-16 h-16 rounded-full mb-4
            ${severity === 'critical' ? 'bg-red-100' : 'bg-yellow-100'}
          `}>
            <AlertTriangle 
              className={`
                w-8 h-8
                ${severity === 'critical' ? 'text-red-600' : 'text-yellow-600'}
              `}
            />
          </div>

          {/* Error Title */}
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {level === 'page' 
              ? 'Oops! Something went wrong'
              : 'This section encountered an error'}
          </h2>

          {/* Error Message */}
          <p className="text-gray-600 mb-6">
            {severity === 'critical' ? (
              <>We're having trouble loading this content. Please try refreshing the page.</>
            ) : (
              <>Don't worry, the rest of the app is still working. Try refreshing to resolve this issue.</>
            )}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <button
              onClick={this.resetError}
              className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </button>
            
            {level === 'page' && (
              <button
                onClick={this.goHome}
                className="inline-flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </button>
            )}
            
            {severity === 'critical' && (
              <button
                onClick={this.reloadPage}
                className="inline-flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reload Page
              </button>
            )}
          </div>

          {/* Show Details Toggle (Development only) */}
          {process.env.NODE_ENV === 'development' && error && (
            <div className="mt-6">
              <button
                onClick={this.toggleDetails}
                className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                {showDetails ? (
                  <>
                    <ChevronUp className="w-4 h-4 mr-1" />
                    Hide Error Details
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 mr-1" />
                    Show Error Details
                  </>
                )}
              </button>

              {showDetails && (
                <div className="mt-4 p-4 bg-white rounded-md border border-gray-200 text-left">
                  <div className="mb-3">
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">
                      Error Message
                    </h3>
                    <p className="text-xs text-red-600 font-mono">
                      {error.message}
                    </p>
                  </div>

                  {error.stack && (
                    <div className="mb-3">
                      <h3 className="text-sm font-semibold text-gray-900 mb-1">
                        Stack Trace
                      </h3>
                      <pre className="text-xs text-gray-600 font-mono overflow-x-auto whitespace-pre-wrap break-words">
                        {error.stack}
                      </pre>
                    </div>
                  )}

                  {errorInfo && errorInfo.componentStack && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-1">
                        Component Stack
                      </h3>
                      <pre className="text-xs text-gray-600 font-mono overflow-x-auto whitespace-pre-wrap break-words">
                        {errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Error ID for support (Production) */}
          {process.env.NODE_ENV === 'production' && (
            <p className="mt-6 text-xs text-gray-500">
              Error ID: {Date.now().toString(36).toUpperCase()}
            </p>
          )}
        </div>
      </div>
    );
  }

  render() {
    const { hasError } = this.state;
    const { children } = this.props;

    if (hasError) {
      return this.renderFallback();
    }

    return children;
  }
}

/**
 * Hook-based error boundary wrapper (functional component compatibility)
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  return function WithErrorBoundaryWrapper(props: P) {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}