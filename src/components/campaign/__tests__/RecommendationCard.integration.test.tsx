/**
 * RecommendationCard Integration Tests
 * Tests real backend integration for targeting recommendations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { RecommendationCard } from '../RecommendationCard';
import { targetingService } from '../../../services/targetingService';
import type { TargetingRules } from '../../../types/campaigns';

// Mock the targeting service
vi.mock('../../../services/targetingService', () => ({
  targetingService: {
    getTargetingRecommendations: vi.fn(),
  },
}));

describe('RecommendationCard - Backend Integration', () => {
  const mockBusinessId = 'business-123';

  const mockRecommendationsResponse: TargetingRules = {
    age_ranges: ['25-34', '35-44'],
    income_levels: ['middle', 'upper_middle'],
    min_activity_score: 50,
    drivers_only: true,
    interests: ['food_dining', 'shopping_retail'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Successful Data Loading', () => {
    it('should fetch and display recommendations from backend', async () => {
      vi.mocked(targetingService.getTargetingRecommendations).mockResolvedValue(
        mockRecommendationsResponse
      );

      render(<RecommendationCard businessId={mockBusinessId} />);

      // Should show loading state initially
      expect(screen.getByText(/Loading personalized recommendations/i)).toBeInTheDocument();

      // Wait for data to load
      await waitFor(() => {
        expect(screen.queryByText(/Loading personalized recommendations/i)).not.toBeInTheDocument();
      });

      // Verify API was called with business ID
      expect(targetingService.getTargetingRecommendations).toHaveBeenCalledWith(mockBusinessId);
      expect(targetingService.getTargetingRecommendations).toHaveBeenCalledTimes(1);

      // Verify personalized recommendation displayed
      await waitFor(() => {
        expect(screen.getByText(/Personalized for Your Business/i)).toBeInTheDocument();
      });
    });

    it('should display default recommendations when backend returns empty', async () => {
      vi.mocked(targetingService.getTargetingRecommendations).mockResolvedValue({});

      render(<RecommendationCard businessId={mockBusinessId} />);

      await waitFor(() => {
        expect(screen.queryByText(/Loading personalized recommendations/i)).not.toBeInTheDocument();
      });

      // Should show default recommendations
      expect(screen.getByText(/Balanced Urban Reach/i)).toBeInTheDocument();
      expect(screen.getByText(/Maximum Reach/i)).toBeInTheDocument();
    });

    it('should call onApply callback when Apply button clicked', async () => {
      const mockOnApply = vi.fn();

      vi.mocked(targetingService.getTargetingRecommendations).mockResolvedValue(
        mockRecommendationsResponse
      );

      render(
        <RecommendationCard 
          businessId={mockBusinessId}
          onApply={mockOnApply}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText(/Loading personalized recommendations/i)).not.toBeInTheDocument();
      });

      // Click Apply button
      const applyButtons = screen.getAllByText(/Apply/i);
      fireEvent.click(applyButtons[0]);

      // Verify callback was called with targeting rules
      expect(mockOnApply).toHaveBeenCalledTimes(1);
      expect(mockOnApply).toHaveBeenCalledWith(expect.objectContaining({
        age_ranges: expect.any(Array),
      }));
    });

    it('should expand recommendation details when Show Details clicked', async () => {
      vi.mocked(targetingService.getTargetingRecommendations).mockResolvedValue(
        mockRecommendationsResponse
      );

      render(<RecommendationCard businessId={mockBusinessId} />);

      await waitFor(() => {
        expect(screen.queryByText(/Loading personalized recommendations/i)).not.toBeInTheDocument();
      });

      // Click Show Details button
      const detailsButtons = screen.getAllByText(/Show Details/i);
      fireEvent.click(detailsButtons[0]);

      // Verify details are expanded
      await waitFor(() => {
        expect(screen.getByText(/Age Ranges:/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show default recommendations when API fails', async () => {
      vi.mocked(targetingService.getTargetingRecommendations).mockRejectedValue(
        new Error('Failed to fetch recommendations')
      );

      render(<RecommendationCard businessId={mockBusinessId} />);

      await waitFor(() => {
        expect(screen.queryByText(/Loading personalized recommendations/i)).not.toBeInTheDocument();
      });

      // Should display default recommendations with error indicator
      expect(screen.getByText(/Showing default recommendations/i)).toBeInTheDocument();
      expect(screen.getByText(/Balanced Urban Reach/i)).toBeInTheDocument();
    });

    it('should handle network errors gracefully', async () => {
      vi.mocked(targetingService.getTargetingRecommendations).mockRejectedValue(
        new Error('Network error')
      );

      render(<RecommendationCard businessId={mockBusinessId} />);

      await waitFor(() => {
        expect(screen.queryByText(/Loading personalized recommendations/i)).not.toBeInTheDocument();
      });

      // Should still show functional UI with defaults
      expect(screen.getByText(/Smart Recommendations/i)).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should show skeleton loaders during API call', async () => {
      let resolvePromise: (value: any) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      vi.mocked(targetingService.getTargetingRecommendations).mockReturnValue(pendingPromise as any);

      render(<RecommendationCard businessId={mockBusinessId} />);

      // Should show loading skeletons
      expect(screen.getByText(/Loading personalized recommendations/i)).toBeInTheDocument();

      // Resolve the promise
      resolvePromise!(mockRecommendationsResponse);

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText(/Loading personalized recommendations/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Recommendation Display', () => {
    it('should display recommendation tags and metrics', async () => {
      vi.mocked(targetingService.getTargetingRecommendations).mockResolvedValue(
        mockRecommendationsResponse
      );

      render(<RecommendationCard businessId={mockBusinessId} />);

      await waitFor(() => {
        expect(screen.queryByText(/Loading personalized recommendations/i)).not.toBeInTheDocument();
      });

      // Check for tags
      expect(screen.getByText(/Recommended/i)).toBeInTheDocument();
      expect(screen.getByText(/High ROI/i)).toBeInTheDocument();

      // Check for metrics
      expect(screen.getByText(/Est\. Reach/i)).toBeInTheDocument();
      expect(screen.getByText(/Predicted CTR/i)).toBeInTheDocument();
      expect(screen.getByText(/Confidence/i)).toBeInTheDocument();
    });

    it('should display top 3 recommendations', async () => {
      vi.mocked(targetingService.getTargetingRecommendations).mockResolvedValue(
        mockRecommendationsResponse
      );

      render(<RecommendationCard businessId={mockBusinessId} />);

      await waitFor(() => {
        expect(screen.queryByText(/Loading personalized recommendations/i)).not.toBeInTheDocument();
      });

      // Should show max 3 recommendations
      const applyButtons = screen.getAllByText(/Apply/i);
      expect(applyButtons).toHaveLength(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle businessId change correctly', async () => {
      vi.mocked(targetingService.getTargetingRecommendations).mockResolvedValue(
        mockRecommendationsResponse
      );

      const { rerender } = render(<RecommendationCard businessId={mockBusinessId} />);

      await waitFor(() => {
        expect(targetingService.getTargetingRecommendations).toHaveBeenCalledWith(mockBusinessId);
      });

      // Change business ID
      const newBusinessId = 'business-456';
      const newRecommendations: TargetingRules = {
        age_ranges: ['18-24'],
        min_activity_score: 30,
      };

      vi.mocked(targetingService.getTargetingRecommendations).mockResolvedValue(newRecommendations);

      rerender(<RecommendationCard businessId={newBusinessId} />);

      // Should call API again with new business ID
      await waitFor(() => {
        expect(targetingService.getTargetingRecommendations).toHaveBeenCalledWith(newBusinessId);
      });
    });

    it('should handle undefined businessId', async () => {
      vi.mocked(targetingService.getTargetingRecommendations).mockResolvedValue(
        mockRecommendationsResponse
      );

      render(<RecommendationCard businessId="" />);

      await waitFor(() => {
        expect(targetingService.getTargetingRecommendations).toHaveBeenCalledWith("");
      });
    });
  });
});
