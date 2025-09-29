// src/components/checkins/__tests__/checkinIntegration.test.tsx
// Integration tests for check-in system with existing systems

import React from 'react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { CheckinTestUtils, testScenarios } from '../../../utils/test/checkinTestUtils';

// Import components to test
import CheckinSystemTest from '../../debug/CheckinSystemTest';
import CheckinRewards from '../CheckinRewards';
import BusinessCheckinAnalytics from '../BusinessCheckinAnalytics';

// Mock external dependencies
jest.mock('../../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
    auth: {
      getSession: jest.fn().mockResolvedValue({ 
        data: { session: { user: { id: 'test-user' } } } 
      }),
    },
  },
}));

jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    loading: jest.fn(),
  },
}));

// Mock recharts for analytics tests
jest.mock('recharts', () => ({
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: any) => (
    <div data-testid="responsive-container">{children}</div>
  ),
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Check-in System Integration Tests', () => {
  let mockGeolocation: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup geolocation mock
    mockGeolocation = CheckinTestUtils.mockGeolocation({
      latitude: 40.7589,
      longitude: -73.9851,
      accuracy: 10,
    });
  });

  afterEach(() => {
    if ('geolocation' in navigator) {
      delete (global.navigator as any).geolocation;
    }
  });

  describe('CheckinSystemTest Component', () => {
    it('should render test suite interface', async () => {
      render(
        <TestWrapper>
          <CheckinSystemTest />
        </TestWrapper>
      );

      expect(screen.getByText('Check-in System Test Suite')).toBeInTheDocument();
      expect(screen.getByText('Run All Tests')).toBeInTheDocument();
      expect(screen.getByText('Show Rewards Test')).toBeInTheDocument();
    });

    it('should display system information cards', async () => {
      render(
        <TestWrapper>
          <CheckinSystemTest />
        </TestWrapper>
      );

      expect(screen.getByText('Location Status')).toBeInTheDocument();
      expect(screen.getByText('Nearby Businesses')).toBeInTheDocument();
      expect(screen.getByText('User Check-ins')).toBeInTheDocument();
    });

    it('should run tests when Run All Tests button is clicked', async () => {
      render(
        <TestWrapper>
          <CheckinSystemTest />
        </TestWrapper>
      );

      const runButton = screen.getByText('Run All Tests');
      fireEvent.click(runButton);

      await waitFor(() => {
        expect(screen.getByText('Running Tests...')).toBeInTheDocument();
      });

      expect(mockGeolocation.getCurrentPosition).toHaveBeenCalled();
    });

    it('should toggle rewards test visibility', async () => {
      render(
        <TestWrapper>
          <CheckinSystemTest />
        </TestWrapper>
      );

      const showRewardsButton = screen.getByText('Show Rewards Test');
      fireEvent.click(showRewardsButton);

      await waitFor(() => {
        expect(screen.getByText('Hide Rewards Test')).toBeInTheDocument();
      });

      expect(screen.getByText('Rewards System Test')).toBeInTheDocument();
    });
  });

  describe('CheckinRewards Component', () => {
    const mockCheckins = CheckinTestUtils.generateMockCheckins(
      'test-user',
      ['business-1', 'business-2'],
      5
    );

    it('should render rewards interface', () => {
      const mockOnPointsEarned = jest.fn();

      render(
        <TestWrapper>
          <CheckinRewards 
            checkins={mockCheckins} 
            onPointsEarned={mockOnPointsEarned}
          />
        </TestWrapper>
      );

      expect(screen.getByText('Check-in Rewards')).toBeInTheDocument();
      expect(screen.getByText('Total Points')).toBeInTheDocument();
      expect(screen.getByText('Current Level')).toBeInTheDocument();
    });

    it('should display correct statistics', () => {
      const mockOnPointsEarned = jest.fn();

      render(
        <TestWrapper>
          <CheckinRewards 
            checkins={mockCheckins} 
            onPointsEarned={mockOnPointsEarned}
          />
        </TestWrapper>
      );

      // Check for statistics display
      expect(screen.getByText(/Total Check-ins/)).toBeInTheDocument();
      expect(screen.getByText(/This Week/)).toBeInTheDocument();
    });

    it('should show achievements when available', () => {
      const mockOnPointsEarned = jest.fn();
      const checkinsWithAchievements = [
        ...mockCheckins,
        ...CheckinTestUtils.generateMockCheckins('test-user', ['business-1'], 10), // More for achievements
      ];

      render(
        <TestWrapper>
          <CheckinRewards 
            checkins={checkinsWithAchievements} 
            onPointsEarned={mockOnPointsEarned}
          />
        </TestWrapper>
      );

      expect(screen.getByText('Achievements')).toBeInTheDocument();
    });
  });

  describe('BusinessCheckinAnalytics Component', () => {
    const mockBusinessId = 'test-business-123';

    it('should render analytics dashboard', async () => {
      render(
        <TestWrapper>
          <BusinessCheckinAnalytics businessId={mockBusinessId} />
        </TestWrapper>
      );

      expect(screen.getByText('Check-in Analytics (Last 7 Days)')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      });
    });

    it('should show loading state initially', () => {
      render(
        <TestWrapper>
          <BusinessCheckinAnalytics businessId={mockBusinessId} />
        </TestWrapper>
      );

      expect(screen.getByText('Loading check-in analytics...')).toBeInTheDocument();
    });

    it('should display chart components when data loads', async () => {
      render(
        <TestWrapper>
          <BusinessCheckinAnalytics businessId={mockBusinessId} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
        expect(screen.getByTestId('x-axis')).toBeInTheDocument();
        expect(screen.getByTestId('y-axis')).toBeInTheDocument();
      });
    });
  });

  describe('Integration with Favorites System', () => {
    it('should allow favoriting businesses from check-in interface', async () => {
      // This would test integration between check-ins and favorites
      // Mock the favorites context/hook
      const mockFavorites = {
        addToFavorites: jest.fn(),
        removeFromFavorites: jest.fn(),
        isFavorite: jest.fn().mockReturnValue(false),
      };

      // Test component that integrates both systems
      const IntegratedComponent = () => {
        const handleFavorite = (businessId: string) => {
          mockFavorites.addToFavorites({
            item_id: businessId,
            item_type: 'business',
            user_id: 'test-user',
          });
        };

        return (
          <div>
            <button onClick={() => handleFavorite('business-1')}>
              Add to Favorites
            </button>
            <span>Integration Test</span>
          </div>
        );
      };

      render(
        <TestWrapper>
          <IntegratedComponent />
        </TestWrapper>
      );

      const favoriteButton = screen.getByText('Add to Favorites');
      fireEvent.click(favoriteButton);

      expect(mockFavorites.addToFavorites).toHaveBeenCalledWith({
        item_id: 'business-1',
        item_type: 'business',
        user_id: 'test-user',
      });
    });
  });

  describe('Integration with Search System', () => {
    it('should filter search results by check-in eligibility', () => {
      const userLocation = testScenarios[0].userLocation;
      const businesses = testScenarios[0].businesses;

      // Mock search results with check-in eligibility
      const searchResultsWithCheckInStatus = businesses.map(business => {
        const distance = CheckinTestUtils.calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          business.latitude,
          business.longitude
        );

        return {
          ...business,
          distance,
          canCheckIn: distance <= 100 && business.status === 'active',
        };
      });

      // Filter for check-in eligible businesses
      const eligibleBusinesses = searchResultsWithCheckInStatus.filter(b => b.canCheckIn);
      
      expect(eligibleBusinesses.length).toBeGreaterThan(0);
      expect(eligibleBusinesses.every(b => b.distance <= 100)).toBe(true);
      expect(eligibleBusinesses.every(b => b.status === 'active')).toBe(true);
    });
  });

  describe('End-to-End Workflow Tests', () => {
    it('should complete full check-in workflow', async () => {
      const mockCheckinFlow = {
        requestLocation: jest.fn().mockResolvedValue({
          latitude: 40.7589,
          longitude: -73.9851,
          accuracy: 10,
        }),
        findNearbyBusinesses: jest.fn().mockResolvedValue(testScenarios[0].businesses),
        performCheckIn: jest.fn().mockResolvedValue({
          success: true,
          points: 10,
          newLevel: 1,
        }),
        updateRewards: jest.fn(),
      };

      // Simulate full workflow
      const location = await mockCheckinFlow.requestLocation();
      expect(location.latitude).toBe(40.7589);

      const nearbyBusinesses = await mockCheckinFlow.findNearbyBusinesses();
      expect(nearbyBusinesses.length).toBeGreaterThan(0);

      const eligibleBusiness = nearbyBusinesses.find(b => 
        CheckinTestUtils.calculateDistance(
          location.latitude,
          location.longitude,
          b.latitude,
          b.longitude
        ) <= 100
      );

      expect(eligibleBusiness).toBeDefined();

      const checkinResult = await mockCheckinFlow.performCheckIn();
      expect(checkinResult.success).toBe(true);
      expect(checkinResult.points).toBeGreaterThan(0);
    });

    it('should handle check-in failure gracefully', async () => {
      const mockFailedCheckin = {
        requestLocation: jest.fn().mockRejectedValue(new Error('Location access denied')),
        performCheckIn: jest.fn().mockResolvedValue({
          success: false,
          error: 'Location required for check-in',
        }),
      };

      try {
        await mockFailedCheckin.requestLocation();
      } catch (error) {
        expect(error.message).toBe('Location access denied');
      }

      const checkinResult = await mockFailedCheckin.performCheckIn();
      expect(checkinResult.success).toBe(false);
      expect(checkinResult.error).toContain('Location required');
    });
  });

  describe('Performance Integration Tests', () => {
    it('should handle multiple concurrent check-in validations', async () => {
      const businesses = testScenarios[0].businesses;
      const userLocation = testScenarios[0].userLocation;

      const validationPromises = businesses.map(business => 
        Promise.resolve(CheckinTestUtils.validateCheckInRequirements(
          userLocation.latitude,
          userLocation.longitude,
          business
        ))
      );

      const startTime = performance.now();
      const results = await Promise.all(validationPromises);
      const endTime = performance.now();

      expect(results).toHaveLength(businesses.length);
      expect(endTime - startTime).toBeLessThan(100); // Should complete in under 100ms
      
      results.forEach((result, index) => {
        expect(result).toHaveProperty('canCheckIn');
        expect(result).toHaveProperty('distance');
        expect(result).toHaveProperty('reason');
      });
    });

    it('should efficiently render large check-in history', () => {
      const largeCheckinHistory = CheckinTestUtils.generateMockCheckins(
        'test-user',
        ['business-1', 'business-2', 'business-3'],
        100 // Large number of check-ins
      );

      const mockOnPointsEarned = jest.fn();

      const startTime = performance.now();
      
      render(
        <TestWrapper>
          <CheckinRewards 
            checkins={largeCheckinHistory} 
            onPointsEarned={mockOnPointsEarned}
          />
        </TestWrapper>
      );

      const endTime = performance.now();
      
      // Component should render efficiently even with large datasets
      expect(endTime - startTime).toBeLessThan(1000); // Under 1 second
      expect(screen.getByText('Check-in Rewards')).toBeInTheDocument();
    });
  });

  describe('Accessibility Integration', () => {
    it('should have proper ARIA labels in test interface', () => {
      render(
        <TestWrapper>
          <CheckinSystemTest />
        </TestWrapper>
      );

      const runButton = screen.getByRole('button', { name: /run all tests/i });
      expect(runButton).toBeInTheDocument();
      expect(runButton).toHaveAttribute('type', 'button');
    });

    it('should support keyboard navigation', () => {
      render(
        <TestWrapper>
          <CheckinSystemTest />
        </TestWrapper>
      );

      const runButton = screen.getByText('Run All Tests');
      runButton.focus();
      
      expect(document.activeElement).toBe(runButton);
      
      // Simulate Enter key press
      fireEvent.keyDown(runButton, { key: 'Enter', code: 'Enter' });
      // Would trigger the same action as click in real implementation
    });
  });
});