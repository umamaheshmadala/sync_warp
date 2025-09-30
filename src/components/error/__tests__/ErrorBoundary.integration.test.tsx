import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary, withErrorBoundary } from '../ErrorBoundary';
import { ComponentErrorBoundary } from '../ComponentErrorBoundary';
import React, { ReactNode } from 'react';

// Mock console methods to avoid noise in tests
const originalError = console.error;
const originalWarn = console.warn;
const originalGroup = console.group;
const originalGroupEnd = console.groupEnd;

beforeEach(() => {
  // Suppress console output during tests
  console.error = vi.fn();
  console.warn = vi.fn();
  console.group = vi.fn();
  console.groupEnd = vi.fn();
});

afterEach(() => {
  // Restore console methods
  console.error = originalError;
  console.warn = originalWarn;
  console.group = originalGroup;
  console.groupEnd = originalGroupEnd;
});

// Component that throws an error
function ThrowError({ shouldThrow = true, message = 'Test error' }: { shouldThrow?: boolean; message?: string }) {
  if (shouldThrow) {
    throw new Error(message);
  }
  return <div>No error</div>;
}

// Component that conditionally throws based on prop
function ConditionalError({ throwError }: { throwError: boolean }) {
  if (throwError) {
    throw new Error('Conditional error thrown');
  }
  return <div>Conditional component working</div>;
}

// Nested component structure
function ParentComponent({ childError }: { childError: boolean }) {
  return (
    <div>
      <h1>Parent Component</h1>
      <ComponentErrorBoundary componentName="ChildComponent">
        <ThrowError shouldThrow={childError} message="Child component error" />
      </ComponentErrorBoundary>
    </div>
  );
}

describe('ErrorBoundary Integration Tests', () => {
  // ==================== BASIC ERROR CATCHING ====================

  describe('Basic Error Catching', () => {
    it('should catch errors from child components', () => {
      render(
        <ErrorBoundary>
          <ThrowError message="Basic error test" />
        </ErrorBoundary>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/this section encountered an error/i)).toBeInTheDocument();
    });

    it('should render children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('should catch errors from deeply nested components', () => {
      function DeepNested() {
        return (
          <div>
            <div>
              <div>
                <ThrowError message="Deep nested error" />
              </div>
            </div>
          </div>
        );
      }

      render(
        <ErrorBoundary>
          <DeepNested />
        </ErrorBoundary>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  // ==================== CUSTOM FALLBACK UI ====================

  describe('Custom Fallback UI', () => {
    it('should render custom fallback when provided', () => {
      const customFallback = <div data-testid="custom-fallback">Custom error message</div>;

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      expect(screen.getByText('Custom error message')).toBeInTheDocument();
    });

    it('should render default fallback when no custom fallback provided', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/this section encountered an error/i)).toBeInTheDocument();
    });
  });

  // ==================== ERROR HANDLER CALLBACK ====================

  describe('Error Handler Callback', () => {
    it('should call onError callback when error occurs', async () => {
      const onError = vi.fn();

      render(
        <ErrorBoundary onError={onError}>
          <ThrowError message="Callback test error" />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(onError).toHaveBeenCalledTimes(1);
      });

      const [error, errorInfo] = onError.mock.calls[0];
      expect(error.message).toBe('Callback test error');
      expect(errorInfo).toHaveProperty('componentStack');
    });

    it('should not call onError when no error occurs', () => {
      const onError = vi.fn();

      render(
        <ErrorBoundary onError={onError}>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(onError).not.toHaveBeenCalled();
    });
  });

  // ==================== ERROR RECOVERY ====================

  describe('Error Recovery', () => {
    it('should allow recovery via Try Again button', async () => {
      const user = userEvent.setup();

      const TestComponent = ({ shouldError }: { shouldError: boolean }) => (
        <ErrorBoundary resetKeys={[shouldError]}>
          <ThrowError shouldThrow={shouldError} />
        </ErrorBoundary>
      );

      const { rerender } = render(<TestComponent shouldError={true} />);

      // Error should be displayed
      expect(screen.getByRole('alert')).toBeInTheDocument();

      // Click Try Again and fix error
      const tryAgainButton = screen.getByRole('button', { name: /try again/i });
      await user.click(tryAgainButton);

      // Re-render with fixed condition - reset key change will reset boundary
      rerender(<TestComponent shouldError={false} />);

      // Component should render successfully
      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        expect(screen.getByText('No error')).toBeInTheDocument();
      });
    });

    it('should reset error count on successful recovery', async () => {
      const user = userEvent.setup();
      const onError = vi.fn();

      const TestComponent = ({ hasError }: { hasError: boolean }) => (
        <ErrorBoundary onError={onError} resetKeys={[hasError]}>
          <ConditionalError throwError={hasError} />
        </ErrorBoundary>
      );

      const { rerender } = render(<TestComponent hasError={true} />);

      // First error
      expect(onError).toHaveBeenCalledTimes(1);

      // Click Try Again and fix
      const tryAgainButton = screen.getByRole('button', { name: /try again/i });
      await user.click(tryAgainButton);

      // Re-render with fixed error - reset key change triggers reset
      rerender(<TestComponent hasError={false} />);

      // Should render successfully
      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        expect(screen.getByText('Conditional component working')).toBeInTheDocument();
      });
    });
  });

  // ==================== RESET KEYS ====================

  describe('Reset Keys', () => {
    it('should reset error when reset key changes', () => {
      const { rerender } = render(
        <ErrorBoundary resetKeys={['key1']}>
          <ThrowError />
        </ErrorBoundary>
      );

      // Error should be displayed
      expect(screen.getByRole('alert')).toBeInTheDocument();

      // Change reset key
      rerender(
        <ErrorBoundary resetKeys={['key2']}>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      // Error should be cleared
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.getByText('No error')).toBeInTheDocument();
    });

    it('should not reset when reset key stays the same', () => {
      const { rerender } = render(
        <ErrorBoundary resetKeys={['key1']}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();

      // Keep same key
      rerender(
        <ErrorBoundary resetKeys={['key1']}>
          <ThrowError />
        </ErrorBoundary>
      );

      // Error should still be displayed
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  // ==================== LEVEL-SPECIFIC BEHAVIOR ====================

  describe('Level-Specific Behavior', () => {
    it('should render page-level error with home button', () => {
      render(
        <ErrorBoundary level="page">
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /go home/i })).toBeInTheDocument();
    });

    it('should render section-level error without home button', () => {
      render(
        <ErrorBoundary level="section">
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.queryByRole('button', { name: /go home/i })).not.toBeInTheDocument();
    });

    it('should render component-level error appropriately', () => {
      render(
        <ErrorBoundary level="component">
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText(/this section encountered an error/i)).toBeInTheDocument();
    });
  });

  // ==================== ERROR DETAILS (DEVELOPMENT) ====================

  describe('Error Details (Development Mode)', () => {
    const originalEnv = process.env.NODE_ENV;

    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should show error details toggle in development', () => {
      render(
        <ErrorBoundary>
          <ThrowError message="Detailed error" />
        </ErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /show error details/i })).toBeInTheDocument();
    });

    it('should toggle error details visibility', async () => {
      const user = userEvent.setup();

      render(
        <ErrorBoundary>
          <ThrowError message="Toggle test error" />
        </ErrorBoundary>
      );

      const toggleButton = screen.getByRole('button', { name: /show error details/i });
      
      // Initially hidden
      expect(screen.queryByText('Error Message')).not.toBeInTheDocument();

      // Click to show
      await user.click(toggleButton);

      expect(screen.getByText('Error Message')).toBeInTheDocument();
      expect(screen.getByText('Toggle test error')).toBeInTheDocument();

      // Click to hide
      await user.click(screen.getByRole('button', { name: /hide error details/i }));

      expect(screen.queryByText('Error Message')).not.toBeInTheDocument();
    });

    it('should display stack trace in error details', async () => {
      const user = userEvent.setup();

      render(
        <ErrorBoundary>
          <ThrowError message="Stack trace test" />
        </ErrorBoundary>
      );

      await user.click(screen.getByRole('button', { name: /show error details/i }));

      expect(screen.getByText('Stack Trace')).toBeInTheDocument();
    });
  });

  // ==================== COMPONENT ERROR BOUNDARY ====================

  describe('ComponentErrorBoundary', () => {
    it('should isolate errors to component level', () => {
      render(
        <div>
          <h1 data-testid="parent-heading">Parent Still Works</h1>
          <ComponentErrorBoundary componentName="BrokenComponent">
            <ThrowError message="Component error" />
          </ComponentErrorBoundary>
        </div>
      );

      // Parent should still render
      expect(screen.getByTestId('parent-heading')).toBeInTheDocument();
      expect(screen.getByText('Parent Still Works')).toBeInTheDocument();

      // Error should be displayed for component
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should render minimal error fallback when specified', () => {
      render(
        <ComponentErrorBoundary componentName="TestComponent" minimal={true}>
          <ThrowError />
        </ComponentErrorBoundary>
      );

      expect(screen.getByText('Error loading TestComponent')).toBeInTheDocument();
    });

    it('should log component name in error handler', async () => {
      const consoleWarn = vi.spyOn(console, 'warn');

      render(
        <ComponentErrorBoundary componentName="LogTestComponent">
          <ThrowError message="Log test error" />
        </ComponentErrorBoundary>
      );

      await waitFor(() => {
        expect(consoleWarn).toHaveBeenCalledWith(
          expect.stringContaining('Component Error [LogTestComponent]'),
          expect.any(Object)
        );
      });
    });
  });

  // ==================== NESTED ERROR BOUNDARIES ====================

  describe('Nested Error Boundaries', () => {
    it('should catch child errors without affecting parent', () => {
      render(
        <ParentComponent childError={true} />
      );

      // Parent should still render
      expect(screen.getByText('Parent Component')).toBeInTheDocument();

      // Child error should be caught
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should allow parent to work when child recovers', async () => {
      const user = userEvent.setup();

      function ParentWithKey({ childError }: { childError: boolean }) {
        return (
          <div>
            <h1>Parent Component</h1>
            <ComponentErrorBoundary componentName="ChildComponent" key={String(childError)}>
              <ThrowError shouldThrow={childError} message="Child component error" />
            </ComponentErrorBoundary>
          </div>
        );
      }

      const { rerender } = render(<ParentWithKey childError={true} />);

      expect(screen.getByRole('alert')).toBeInTheDocument();

      // Click Try Again
      await user.click(screen.getByRole('button', { name: /try again/i }));

      // Re-render with fixed child - key change will remount the boundary
      rerender(<ParentWithKey childError={false} />);

      // Both parent and child should work
      await waitFor(() => {
        expect(screen.getByText('Parent Component')).toBeInTheDocument();
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });
    });

    it('should handle multiple child errors independently', () => {
      function MultiChildComponent() {
        return (
          <div>
            <ComponentErrorBoundary componentName="Child1">
              <ThrowError message="Child 1 error" />
            </ComponentErrorBoundary>
            <ComponentErrorBoundary componentName="Child2">
              <div>Child 2 works</div>
            </ComponentErrorBoundary>
            <ComponentErrorBoundary componentName="Child3">
              <ThrowError message="Child 3 error" />
            </ComponentErrorBoundary>
          </div>
        );
      }

      render(<MultiChildComponent />);

      // Working child should render
      expect(screen.getByText('Child 2 works')).toBeInTheDocument();

      // Both errored children should show errors
      const alerts = screen.getAllByRole('alert');
      expect(alerts).toHaveLength(2);
    });
  });

  // ==================== WITH ERROR BOUNDARY HOC ====================

  describe('withErrorBoundary HOC', () => {
    it('should wrap component with error boundary', () => {
      const TestComponent = () => <ThrowError />;
      const WrappedComponent = withErrorBoundary(TestComponent);

      render(<WrappedComponent />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should pass props to wrapped component', () => {
      interface TestProps {
        message: string;
      }

      const TestComponent = ({ message }: TestProps) => <div>{message}</div>;
      const WrappedComponent = withErrorBoundary(TestComponent);

      render(<WrappedComponent message="Test message" />);

      expect(screen.getByText('Test message')).toBeInTheDocument();
    });

    it('should apply error boundary props', () => {
      const onError = vi.fn();
      const TestComponent = () => <ThrowError />;
      const WrappedComponent = withErrorBoundary(TestComponent, {
        level: 'page',
        onError
      });

      render(<WrappedComponent />);

      expect(screen.getByRole('button', { name: /go home/i })).toBeInTheDocument();
      expect(onError).toHaveBeenCalled();
    });
  });

  // ==================== MULTIPLE ERRORS ====================

  describe('Multiple Errors (Error Count)', () => {
    it('should track error count', async () => {
      const user = userEvent.setup();

      const { rerender } = render(
        <ErrorBoundary>
          <ConditionalError throwError={true} />
        </ErrorBoundary>
      );

      // First error
      expect(screen.getByRole('alert')).toBeInTheDocument();

      // Try to recover but fail
      await user.click(screen.getByRole('button', { name: /try again/i }));
      
      rerender(
        <ErrorBoundary>
          <ConditionalError throwError={true} />
        </ErrorBoundary>
      );

      // Second error should still show
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should show critical error UI after multiple errors', async () => {
      const user = userEvent.setup();
      const onError = vi.fn();

      const { rerender } = render(
        <ErrorBoundary onError={onError}>
          <ConditionalError throwError={true} />
        </ErrorBoundary>
      );

      // Generate multiple errors
      for (let i = 0; i < 3; i++) {
        await user.click(screen.getByRole('button', { name: /try again/i }));
        rerender(
          <ErrorBoundary onError={onError}>
            <ConditionalError throwError={true} />
          </ErrorBoundary>
        );
      }

      // Should show reload page button for critical errors
      expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument();
    });
  });

  // ==================== ERROR BOUNDARY ISOLATION ====================

  describe('Error Boundary Isolation', () => {
    it('should prevent errors from propagating with isolate prop', () => {
      const ParentWithIsolation = () => (
        <ErrorBoundary level="page">
          <div>
            <h1>Parent Container</h1>
            <ErrorBoundary level="component" isolate={true}>
              <ThrowError message="Isolated error" />
            </ErrorBoundary>
            <p>Sibling content still visible</p>
          </div>
        </ErrorBoundary>
      );

      render(<ParentWithIsolation />);

      expect(screen.getByText('Parent Container')).toBeInTheDocument();
      expect(screen.getByText('Sibling content still visible')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});