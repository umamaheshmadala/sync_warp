/**
 * TargetingValidator Integration Tests
 * Tests real backend integration for targeting rule validation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { TargetingValidator } from '../TargetingValidator';
import { targetingService } from '../../../services/targetingService';
import type { TargetingRules } from '../../../types/campaigns';

// Mock the targeting service
vi.mock('../../../services/targetingService', () => ({
  targetingService: {
    validateTargeting: vi.fn(),
  },
}));

describe('TargetingValidator - Backend Integration', () => {
  const mockTargetingRules: TargetingRules = {
    age_ranges: ['25-34', '35-44'],
    income_levels: ['middle', 'upper_middle'],
    cities: ['New York'],
    min_activity_score: 50,
    drivers_only: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Successful Validation', () => {
    it('should fetch and display validation results from backend', async () => {
      const mockValidResponse = {
        valid: true,
        errors: [],
        warnings: [],
        suggestions: [
          'Consider broadening age ranges for better reach',
          'Adding more cities could increase campaign visibility',
        ],
      };

      vi.mocked(targetingService.validateTargeting).mockResolvedValue(mockValidResponse);

      render(<TargetingValidator targetingRules={mockTargetingRules} />);

      // Wait for validation to complete
      await waitFor(() => {
        expect(screen.queryByText(/Validating.../i)).not.toBeInTheDocument();
      });

      // Verify API was called
      expect(targetingService.validateTargeting).toHaveBeenCalledWith(mockTargetingRules);
      expect(targetingService.validateTargeting).toHaveBeenCalledTimes(1);

      // Verify success message displayed
      expect(screen.getByText(/valid/i)).toBeInTheDocument();

      // Verify suggestions displayed
      expect(screen.getByText(/Consider broadening age ranges/i)).toBeInTheDocument();
      expect(screen.getByText(/Adding more cities/i)).toBeInTheDocument();
    });

    it('should display validation errors from backend', async () => {
      const mockErrorResponse = {
        valid: false,
        errors: [
          'Age ranges cannot be empty',
          'At least one targeting criterion is required',
        ],
        warnings: [],
        suggestions: [],
      };

      vi.mocked(targetingService.validateTargeting).mockResolvedValue(mockErrorResponse);

      render(<TargetingValidator targetingRules={{}} />);

      await waitFor(() => {
        expect(screen.queryByText(/Validating.../i)).not.toBeInTheDocument();
      });

      // Verify errors displayed
      expect(screen.getByText(/Age ranges cannot be empty/i)).toBeInTheDocument();
      expect(screen.getByText(/At least one targeting criterion is required/i)).toBeInTheDocument();
    });

    it('should display validation warnings from backend', async () => {
      const mockWarningResponse = {
        valid: true,
        errors: [],
        warnings: [
          'Very narrow targeting may limit reach',
          'High activity score threshold reduces audience size',
        ],
        suggestions: ['Consider lowering minimum activity score'],
      };

      vi.mocked(targetingService.validateTargeting).mockResolvedValue(mockWarningResponse);

      const narrowRules: TargetingRules = {
        age_ranges: ['25-34'],
        min_activity_score: 90,
        drivers_only: true,
      };

      render(<TargetingValidator targetingRules={narrowRules} />);

      await waitFor(() => {
        expect(screen.queryByText(/Validating.../i)).not.toBeInTheDocument();
      });

      // Verify warnings displayed
      expect(screen.getByText(/Very narrow targeting/i)).toBeInTheDocument();
      expect(screen.getByText(/High activity score threshold/i)).toBeInTheDocument();

      // Verify suggestions displayed
      expect(screen.getByText(/Consider lowering minimum activity score/i)).toBeInTheDocument();
    });

    it('should update validation when rules change', async () => {
      const initialResponse = {
        valid: true,
        errors: [],
        warnings: [],
        suggestions: [],
      };

      vi.mocked(targetingService.validateTargeting).mockResolvedValue(initialResponse);

      const { rerender } = render(<TargetingValidator targetingRules={mockTargetingRules} />);

      await waitFor(() => {
        expect(screen.queryByText(/Validating.../i)).not.toBeInTheDocument();
      });

      // Change rules to invalid
      const invalidRules: TargetingRules = {};
      const errorResponse = {
        valid: false,
        errors: ['At least one targeting criterion is required'],
        warnings: [],
        suggestions: [],
      };

      vi.mocked(targetingService.validateTargeting).mockResolvedValue(errorResponse);

      rerender(<TargetingValidator targetingRules={invalidRules} />);

      // Should call API again
      await waitFor(() => {
        expect(targetingService.validateTargeting).toHaveBeenCalledWith(invalidRules);
      });

      // Should display new validation errors
      await waitFor(() => {
        expect(screen.getByText(/At least one targeting criterion is required/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when API fails', async () => {
      vi.mocked(targetingService.validateTargeting).mockRejectedValue(
        new Error('Validation service unavailable')
      );

      render(<TargetingValidator targetingRules={mockTargetingRules} />);

      await waitFor(() => {
        expect(screen.getByText(/Unable to validate/i)).toBeInTheDocument();
      });
    });

    it('should handle network errors gracefully', async () => {
      vi.mocked(targetingService.validateTargeting).mockRejectedValue(
        new Error('Network error')
      );

      render(<TargetingValidator targetingRules={mockTargetingRules} />);

      await waitFor(() => {
        expect(screen.getByText(/Unable to validate/i)).toBeInTheDocument();
      });
    });

    it('should handle malformed response gracefully', async () => {
      vi.mocked(targetingService.validateTargeting).mockResolvedValue({
        valid: true,
        errors: [],
        warnings: [],
        suggestions: [],
      } as any);

      render(<TargetingValidator targetingRules={mockTargetingRules} />);

      await waitFor(() => {
        expect(screen.queryByText(/Validating.../i)).not.toBeInTheDocument();
      });

      // Should not crash
      expect(screen.getByText(/valid/i)).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should show loading state during validation', async () => {
      let resolvePromise: (value: any) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      vi.mocked(targetingService.validateTargeting).mockReturnValue(pendingPromise as any);

      render(<TargetingValidator targetingRules={mockTargetingRules} />);

      // Should show loading state
      expect(screen.getByText(/Validating.../i)).toBeInTheDocument();

      // Resolve the promise
      resolvePromise!({
        valid: true,
        errors: [],
        warnings: [],
        suggestions: [],
      });

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText(/Validating.../i)).not.toBeInTheDocument();
      });
    });

    it('should show loading indicator during API call', async () => {
      vi.mocked(targetingService.validateTargeting).mockImplementation(
        () => new Promise((resolve) => 
          setTimeout(() => resolve({
            valid: true,
            errors: [],
            warnings: [],
            suggestions: [],
          }), 100)
        )
      );

      render(<TargetingValidator targetingRules={mockTargetingRules} />);

      expect(screen.getByText(/Validating.../i)).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByText(/Validating.../i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Validation Messages', () => {
    it('should display multiple errors correctly', async () => {
      const multipleErrorsResponse = {
        valid: false,
        errors: [
          'Age ranges are required',
          'Minimum activity score must be between 0-100',
          'Invalid income level specified',
        ],
        warnings: [],
        suggestions: [],
      };

      vi.mocked(targetingService.validateTargeting).mockResolvedValue(multipleErrorsResponse);

      render(<TargetingValidator targetingRules={mockTargetingRules} />);

      await waitFor(() => {
        expect(screen.queryByText(/Validating.../i)).not.toBeInTheDocument();
      });

      // All errors should be displayed
      expect(screen.getByText(/Age ranges are required/i)).toBeInTheDocument();
      expect(screen.getByText(/Minimum activity score must be between 0-100/i)).toBeInTheDocument();
      expect(screen.getByText(/Invalid income level specified/i)).toBeInTheDocument();
    });

    it('should display mixed errors, warnings, and suggestions', async () => {
      const mixedResponse = {
        valid: false,
        errors: ['Critical validation error'],
        warnings: ['Potential issue detected'],
        suggestions: ['Optimization tip available'],
      };

      vi.mocked(targetingService.validateTargeting).mockResolvedValue(mixedResponse);

      render(<TargetingValidator targetingRules={mockTargetingRules} />);

      await waitFor(() => {
        expect(screen.queryByText(/Validating.../i)).not.toBeInTheDocument();
      });

      // All message types should be displayed
      expect(screen.getByText(/Critical validation error/i)).toBeInTheDocument();
      expect(screen.getByText(/Potential issue detected/i)).toBeInTheDocument();
      expect(screen.getByText(/Optimization tip available/i)).toBeInTheDocument();
    });

    it('should handle empty messages arrays', async () => {
      const emptyResponse = {
        valid: true,
        errors: [],
        warnings: [],
        suggestions: [],
      };

      vi.mocked(targetingService.validateTargeting).mockResolvedValue(emptyResponse);

      render(<TargetingValidator targetingRules={mockTargetingRules} />);

      await waitFor(() => {
        expect(screen.queryByText(/Validating.../i)).not.toBeInTheDocument();
      });

      // Should show valid state
      expect(screen.getByText(/valid/i)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should validate empty targeting rules', async () => {
      const emptyResponse = {
        valid: false,
        errors: ['At least one targeting criterion is required'],
        warnings: [],
        suggestions: ['Add age ranges, income levels, or location filters'],
      };

      vi.mocked(targetingService.validateTargeting).mockResolvedValue(emptyResponse);

      render(<TargetingValidator targetingRules={{}} />);

      await waitFor(() => {
        expect(targetingService.validateTargeting).toHaveBeenCalledWith({});
      });

      await waitFor(() => {
        expect(screen.getByText(/At least one targeting criterion is required/i)).toBeInTheDocument();
      });
    });

    it('should handle very complex targeting rules', async () => {
      const complexRules: TargetingRules = {
        age_ranges: ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'],
        income_levels: ['low', 'middle', 'upper_middle', 'high'],
        cities: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'],
        interests: ['food_dining', 'shopping_retail', 'entertainment', 'health_wellness'],
        min_activity_score: 75,
        drivers_only: true,
        exclude_existing_customers: true,
        exclude_recent_visitors: true,
      };

      const complexResponse = {
        valid: true,
        errors: [],
        warnings: ['Very complex targeting may reduce performance'],
        suggestions: ['Consider simplifying targeting criteria'],
      };

      vi.mocked(targetingService.validateTargeting).mockResolvedValue(complexResponse);

      render(<TargetingValidator targetingRules={complexRules} />);

      await waitFor(() => {
        expect(targetingService.validateTargeting).toHaveBeenCalledWith(complexRules);
      });

      await waitFor(() => {
        expect(screen.getByText(/Very complex targeting/i)).toBeInTheDocument();
      });
    });
  });
});
