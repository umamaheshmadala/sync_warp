import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from './ui/button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

/**
 * ErrorBoundary Component (Story 8.2.8)
 * 
 * React Error Boundary to catch component errors and display graceful fallback UI.
 * 
 * Features:
 * - Catches errors in child component tree
 * - Logs errors to console for debugging
 * - Displays user-friendly error message
 * - Provides "Try Again" button to reset error state
 * - Supports custom fallback UI
 * 
 * Usage:
 * ```tsx
 * <ErrorBoundary>
 *   <MyComponent />
 * </ErrorBoundary>
 * 
 * // With custom fallback
 * <ErrorBoundary fallback={<CustomFallback />}>
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  }

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console for debugging
    console.error('🚨 Error boundary caught:', error, errorInfo)
    
    // TODO: Send error to monitoring service (e.g., Sentry)
    // sendErrorToMonitoring(error, errorInfo)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined })
  }

  public render() {
    if (this.state.hasError) {
      // Render custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Render default fallback UI
      return (
        <div 
          className="flex flex-col items-center justify-center h-screen p-4"
          role="alert"
          aria-live="assertive"
        >
          <AlertTriangle 
            className="h-12 w-12 text-red-500 mb-4" 
            aria-hidden="true"
          />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Something went wrong
          </h2>
          <p className="text-gray-600 text-center mb-4 max-w-md">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <Button
            onClick={this.handleReset}
            className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="Try again"
          >
            Try Again
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
