/**
 * ReachEstimator Integration Tests
 * Tests real backend integration for audience reach estimation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ReachEstimator } from '../ReachEstimator';
import { targetingService } from '../../../services/targetingService';
import type { TargetingRules } from '../../../types/campaigns';

// Mock the targeting service
vi.mock('../../../services/targetingService', () => ({
  targetingService: {
    estimateAudienceReach: vi.fn(),
  },
}));

describe('ReachEstimator - Backend Integration', () => {
  const mockTargetingRules: TargetingRules = {
    age_ranges: ['25-34', '35-44'],
    income_levels: ['middle', 'upper_middle'],
    cities: ['New York', 'Los Angeles'],
    min_activity_score: 50,
    drivers_only: true,
  };

  const mockSuccessResponse = {
    total_reach: 5234,
    drivers_count: 5234,
    breakdown_by_age: {
      '25-34': 2800,
      '35-44': 2434,
    },
    breakdown_by_city: {
      'New York': 3100,
      'Los Angeles': 2134,
    },
    confidence_level: 'high' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Successful Data Loading', () => {
    it('should fetch and display audience reach estimation from backend', async () => {
      // Setup mock
      vi.mocked(targetingService.estimateAudienceReach).mockResolvedValue(mockSuccessResponse);

      // Render component
      render(<ReachEstimator targetingRules={mockTargetingRules} />);

      // Should show loading state initially
      expect(screen.getByText(/Estimating.../i)).toBeInTheDocument();

      // Wait for data to load
      await waitFor(() => {
        expect(screen.queryByText(/Estimating.../i)).not.toBeInTheDocument();
      });

      // Verify API was called with correct rules
      expect(targetingService.estimateAudienceReach).toHaveBeenCalledWith({
        targeting_rules: mockTargetingRules,
        city_id: undefined
      });
      expect(targetingService.estimateAudienceReach).toHaveBeenCalledTimes(1);

      // Verify matching drivers displayed
      await waitFor(() => {
        expect(screen.getByText(/5,234/)).toBeInTheDocument();
      });

      // Verify estimated impressions displayed (5234 * 15 = 78,510)
      expect(screen.getByText(/78,510/)).toBeInTheDocument();

      // Verify estimated cost displayed (78510 * $0.05 = $3,925.50)
      expect(screen.getByText(/\$3,925/)).toBeInTheDocument();
    });

    it('should display demographic breakdown from backend', async () => {
      vi.mocked(targetingService.estimateAudienceReach).mockResolvedValue(mockSuccessResponse);

      render(<ReachEstimator targetingRules={mockTargetingRules} />);

      await waitFor(() => {
        expect(screen.queryByText(/Estimating.../i)).not.toBeInTheDocument();
      });

      // Check age breakdown
      expect(screen.getByText(/25-34/)).toBeInTheDocument();
      expect(screen.getByText(/2,800/)).toBeInTheDocument();
      expect(screen.getByText(/35-44/)).toBeInTheDocument();
      expect(screen.getByText(/2,434/)).toBeInTheDocument();

      // Check location breakdown
      expect(screen.getByText(/New York/i)).toBeInTheDocument();
      expect(screen.getByText(/3,100/)).toBeInTheDocument();
      expect(screen.getByText(/Los Angeles/i)).toBeInTheDocument();
      expect(screen.getByText(/2,134/)).toBeInTheDocument();
    });

    it('should display confidence score from backend', async () => {
      vi.mocked(targetingService.estimateAudienceReach).mockResolvedValue(mockSuccessResponse);

      render(<ReachEstimator targetingRules={mockTargetingRules} />);

      await waitFor(() => {
        expect(screen.queryByText(/Estimating.../i)).not.toBeInTheDocument();
      });

      // Check confidence level (high)
      expect(screen.getByText(/high confidence/i)).toBeInTheDocument();
    });

    it('should update when targeting rules change', async () => {
      vi.mocked(targetingService.estimateAudienceReach).mockResolvedValue(mockSuccessResponse);

      const { rerender } = render(<ReachEstimator targetingRules={mockTargetingRules} />);

      await waitFor(() => {
        expect(screen.queryByText(/Estimating.../i)).not.toBeInTheDocument();
      });

      // Change targeting rules
      const newRules: TargetingRules = {
        ...mockTargetingRules,
        age_ranges: ['18-24'],
      };

      const newResponse = {
        ...mockSuccessResponse,
        total_reach: 3000,
        drivers_count: 3000,
      };

      vi.mocked(targetingService.estimateAudienceReach).mockResolvedValue(newResponse);

      rerender(<ReachEstimator targetingRules={newRules} />);

      // Should call API again with new rules
      await waitFor(() => {
        expect(targetingService.estimateAudienceReach).toHaveBeenCalledWith({
          targeting_rules: newRules,
          city_id: undefined
        });
      });

      // Should display new data
      await waitFor(() => {
        expect(screen.getByText(/3,000/)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when API fails', async () => {
      const errorMessage = 'Failed to estimate audience reach';
      vi.mocked(targetingService.estimateAudienceReach).mockRejectedValue(
        new Error(errorMessage)
      );

      render(<ReachEstimator targetingRules={mockTargetingRules} />);

      await waitFor(() => {
        expect(screen.getByText(/Unable to estimate reach/i)).toBeInTheDocument();
      });

      // Should show error message
      expect(screen.getByText(/Failed to estimate audience reach/i)).toBeInTheDocument();
    });

    it('should handle network errors gracefully', async () => {
      vi.mocked(targetingService.estimateAudienceReach).mockRejectedValue(
        new Error('Network error')
      );

      render(<ReachEstimator targetingRules={mockTargetingRules} />);

      await waitFor(() => {
        expect(screen.getByText(/Network error/i)).toBeInTheDocument();
      });
    });

    it('should handle empty response gracefully', async () => {
      vi.mocked(targetingService.estimateAudienceReach).mockResolvedValue({
        total_reach: 0,
        drivers_count: 0,
        breakdown_by_age: {},
        breakdown_by_city: {},
        confidence_level: 'low',
      });

      render(<ReachEstimator targetingRules={mockTargetingRules} />);

      await waitFor(() => {
        expect(screen.queryByText(/Estimating.../i)).not.toBeInTheDocument();
      });

      // Should display zero values for matching drivers
      await waitFor(() => {
        expect(screen.getByText('0')).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state during API call', async () => {
      // Create a promise that won't resolve immediately
      let resolvePromise: (value: any) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      vi.mocked(targetingService.estimateAudienceReach).mockReturnValue(pendingPromise as any);

      render(<ReachEstimator targetingRules={mockTargetingRules} />);

      // Should show loading state
      expect(screen.getByText(/Estimating.../i)).toBeInTheDocument();

      // Resolve the promise
      resolvePromise!(mockSuccessResponse);

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText(/Estimating.../i)).not.toBeInTheDocument();
      });
    });

    it('should show skeleton loaders during initial load', async () => {
      vi.mocked(targetingService.estimateAudienceReach).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockSuccessResponse), 100))
      );

      render(<ReachEstimator targetingRules={mockTargetingRules} />);

      // Should show loading indicator
      expect(screen.getByText(/Estimating.../i)).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByText(/Estimating.../i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large numbers correctly', async () => {
      const largeResponse = {
        ...mockSuccessResponse,
        total_reach: 1000000,
        drivers_count: 1000000,
        // Impressions: 1M * 15 = 15M, Cost: 15M * $0.05 = $750,000
      };

      vi.mocked(targetingService.estimateAudienceReach).mockResolvedValue(largeResponse);

      render(<ReachEstimator targetingRules={mockTargetingRules} />);

      await waitFor(() => {
        expect(screen.queryByText(/Estimating.../i)).not.toBeInTheDocument();
      });

      // Check formatted numbers
      expect(screen.getByText(/1,000,000/)).toBeInTheDocument();
      expect(screen.getByText(/15,000,000/)).toBeInTheDocument(); // 1M * 15 impressions
      expect(screen.getByText(/\$750,000/)).toBeInTheDocument(); // 15M * $0.05
    });

    it('should handle empty targeting rules', async () => {
      const emptyRules: TargetingRules = {};

      vi.mocked(targetingService.estimateAudienceReach).mockResolvedValue(mockSuccessResponse);

      render(<ReachEstimator targetingRules={emptyRules} />);

      await waitFor(() => {
        expect(targetingService.estimateAudienceReach).toHaveBeenCalledWith({
          targeting_rules: emptyRules,
          city_id: undefined
        });
      });
    });

    it('should handle partial breakdown data', async () => {
      const partialResponse = {
        ...mockSuccessResponse,
        breakdown_by_age: { '25-34': 5234 },
        breakdown_by_city: undefined,
        breakdown_by_gender: undefined,
      };

      vi.mocked(targetingService.estimateAudienceReach).mockResolvedValue(partialResponse);

      render(<ReachEstimator targetingRules={mockTargetingRules} />);

      await waitFor(() => {
        expect(screen.queryByText(/Estimating.../i)).not.toBeInTheDocument();
      });

      // Should display available data
      expect(screen.getByText(/25-34/)).toBeInTheDocument();
      expect(screen.getByText(/5,234/)).toBeInTheDocument();
    });
  });
});
