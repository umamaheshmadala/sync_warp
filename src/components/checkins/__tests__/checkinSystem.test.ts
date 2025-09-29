// src/components/checkins/__tests__/checkinSystem.test.ts
// Unit tests for check-in system functionality

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { 
  CheckinTestUtils, 
  testScenarios, 
  CHECKIN_CONSTANTS,
  type MockLocation,
  type MockBusiness 
} from '../../../utils/test/checkinTestUtils';
import { useCheckins } from '../../../hooks/useCheckins';

// Mock Supabase client
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
      single: jest.fn(),
    })),
  },
}));

// Mock toast notifications
jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    loading: jest.fn(),
  },
}));

describe('Check-in System Tests', () => {
  let mockGeolocation: any;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Setup default geolocation mock
    mockGeolocation = CheckinTestUtils.mockGeolocation({
      latitude: 40.7589,
      longitude: -73.9851,
      accuracy: 10,
    });
  });

  afterEach(() => {
    // Clean up geolocation mock
    if ('geolocation' in navigator) {
      delete (navigator as any).geolocation;
    }
  });

  describe('Distance Calculations', () => {
    it('should calculate distance correctly using Haversine formula', () => {
      const testCases = CheckinTestUtils.getProximityTestCases();
      
      testCases.forEach(testCase => {
        const calculatedDistance = CheckinTestUtils.calculateDistance(
          testCase.userLat,
          testCase.userLon,
          testCase.businessLat,
          testCase.businessLon
        );
        
        // Allow for small rounding errors (within 10 meters)
        expect(Math.abs(calculatedDistance - testCase.expectedDistance)).toBeLessThan(10);
      });
    });

    it('should handle edge case of same coordinates', () => {
      const distance = CheckinTestUtils.calculateDistance(
        40.7589, -73.9851,
        40.7589, -73.9851
      );
      
      expect(distance).toBe(0);
    });

    it('should calculate distance between distant points', () => {
      // New York to Los Angeles (approximately 3944 km)
      const distance = CheckinTestUtils.calculateDistance(
        40.7589, -73.9851,  // NYC
        34.0522, -118.2437  // LA
      );
      
      expect(distance).toBeGreaterThan(3900000); // 3900 km
      expect(distance).toBeLessThan(4000000);    // 4000 km
    });
  });

  describe('GPS Location Services', () => {
    it('should request location permission successfully', async () => {
      const { result } = renderHook(() => useCheckins());
      
      await act(async () => {
        await result.current.requestLocation();
      });
      
      expect(mockGeolocation.getCurrentPosition).toHaveBeenCalled();
      expect(result.current.location.hasPermission).toBe(true);
      expect(result.current.location.latitude).toBe(40.7589);
      expect(result.current.location.longitude).toBe(-73.9851);
    });

    it('should handle geolocation errors gracefully', async () => {
      // Mock geolocation error
      const errorMockGeolocation = {
        getCurrentPosition: jest.fn((success: PositionCallback, error?: PositionErrorCallback) => {
          if (error) {
            error({
              code: GeolocationPositionError.PERMISSION_DENIED,
              message: 'Permission denied',
            } as GeolocationPositionError);
          }
        }),
        watchPosition: jest.fn(),
        clearWatch: jest.fn(),
      };

      Object.defineProperty(global.navigator, 'geolocation', {
        value: errorMockGeolocation,
        writable: true,
      });

      const { result } = renderHook(() => useCheckins());
      
      await act(async () => {
        await result.current.requestLocation();
      });
      
      expect(result.current.location.hasPermission).toBe(false);
      expect(result.current.location.error).toBeTruthy();
    });

    it('should evaluate GPS accuracy correctly', () => {
      const accuracyScenarios = CheckinTestUtils.getAccuracyScenarios();
      
      accuracyScenarios.forEach(scenario => {
        // This would be part of your accuracy evaluation logic
        let evaluation: 'excellent' | 'good' | 'poor';
        
        if (scenario.accuracy <= 50) {
          evaluation = 'excellent';
        } else if (scenario.accuracy <= 100) {
          evaluation = 'good';
        } else {
          evaluation = 'poor';
        }
        
        expect(evaluation).toBe(scenario.expected);
      });
    });
  });

  describe('Business Proximity Detection', () => {
    it('should identify nearby businesses correctly', async () => {
      const scenario = testScenarios[0]; // Urban Dense Area
      
      // Mock business data response
      const mockBusinesses = scenario.businesses.map(business => ({
        ...business,
        distance: CheckinTestUtils.calculateDistance(
          scenario.userLocation.latitude,
          scenario.userLocation.longitude,
          business.latitude,
          business.longitude
        ),
      }));

      // Test proximity detection
      const nearbyBusinesses = mockBusinesses.filter(
        business => business.distance <= 2000 // 2km radius
      );
      
      expect(nearbyBusinesses.length).toBe(scenario.expectedResults.nearbyBusinesses);
    });

    it('should validate check-in eligibility based on distance', () => {
      const testCases = CheckinTestUtils.getProximityTestCases();
      
      testCases.forEach(testCase => {
        const mockBusiness: MockBusiness = {
          id: 'test-business',
          business_name: 'Test Business',
          business_type: 'Restaurant',
          address: 'Test Address',
          latitude: testCase.businessLat,
          longitude: testCase.businessLon,
          status: 'active',
        };
        
        const validation = CheckinTestUtils.validateCheckInRequirements(
          testCase.userLat,
          testCase.userLon,
          mockBusiness,
          CHECKIN_CONSTANTS.MAX_CHECKIN_DISTANCE
        );
        
        expect(validation.canCheckIn).toBe(testCase.shouldBeEligible);
        expect(Math.abs(validation.distance - testCase.expectedDistance)).toBeLessThan(10);
      });
    });

    it('should reject check-ins for inactive businesses', () => {
      const inactiveBusiness: MockBusiness = {
        id: 'inactive-business',
        business_name: 'Inactive Business',
        business_type: 'Restaurant',
        address: 'Test Address',
        latitude: 40.7590,
        longitude: -73.9850,
        status: 'inactive',
      };
      
      const validation = CheckinTestUtils.validateCheckInRequirements(
        40.7589,
        -73.9851,
        inactiveBusiness
      );
      
      expect(validation.canCheckIn).toBe(false);
      expect(validation.reason).toContain('not active');
    });
  });

  describe('Test Scenarios', () => {
    testScenarios.forEach((scenario, index) => {
      it(`should handle ${scenario.name} scenario correctly`, () => {
        scenario.businesses.forEach(business => {
          const distance = CheckinTestUtils.calculateDistance(
            scenario.userLocation.latitude,
            scenario.userLocation.longitude,
            business.latitude,
            business.longitude
          );
          
          const expectedDistance = scenario.expectedResults.distances[business.id];
          
          // Allow for small calculation differences
          expect(Math.abs(distance - expectedDistance)).toBeLessThan(50);
          
          const canCheckIn = distance <= CHECKIN_CONSTANTS.MAX_CHECKIN_DISTANCE;
          const shouldBeEligible = scenario.expectedResults.checkInEligible.includes(business.id);
          
          expect(canCheckIn).toBe(shouldBeEligible);
        });
      });
    });
  });

  describe('Rewards System', () => {
    it('should generate mock check-in data correctly', () => {
      const userId = 'test-user';
      const businessIds = ['business-1', 'business-2', 'business-3'];
      const count = 5;
      
      const mockCheckins = CheckinTestUtils.generateMockCheckins(userId, businessIds, count);
      
      expect(mockCheckins).toHaveLength(count);
      
      mockCheckins.forEach(checkin => {
        expect(checkin.user_id).toBe(userId);
        expect(businessIds).toContain(checkin.business_id);
        expect(checkin.distance_from_business).toBeGreaterThan(0);
        expect(checkin.distance_from_business).toBeLessThan(200);
        expect(['gps']).toContain(checkin.verification_method);
        expect(new Date(checkin.checked_in_at)).toBeInstanceOf(Date);
      });
    });

    it('should calculate points correctly', () => {
      const basePoints = CHECKIN_CONSTANTS.POINTS_PER_CHECKIN;
      const bonusPoints = CHECKIN_CONSTANTS.BONUS_POINTS_STREAK;
      
      // Test basic points
      expect(basePoints).toBe(10);
      
      // Test streak bonus
      const totalPointsWithBonus = basePoints + bonusPoints;
      expect(totalPointsWithBonus).toBe(15);
    });
  });

  describe('Performance Tests', () => {
    it('should perform distance calculations efficiently', async () => {
      const testFunction = async () => {
        return CheckinTestUtils.calculateDistance(
          40.7589, -73.9851,
          34.0522, -118.2437
        );
      };
      
      const benchmark = await CheckinTestUtils.benchmarkFunction(
        testFunction,
        'Distance Calculation',
        50
      );
      
      expect(benchmark.averageTime).toBeLessThan(1); // Should be under 1ms
      expect(benchmark.minTime).toBeGreaterThan(0);
      expect(benchmark.maxTime).toBeGreaterThan(benchmark.minTime);
      expect(benchmark.iterations).toBe(50);
    });

    it('should handle multiple proximity checks efficiently', async () => {
      const userLat = 40.7589;
      const userLon = -73.9851;
      const businesses = testScenarios[0].businesses;
      
      const testFunction = async () => {
        return businesses.map(business => 
          CheckinTestUtils.calculateDistance(userLat, userLon, business.latitude, business.longitude)
        );
      };
      
      const benchmark = await CheckinTestUtils.benchmarkFunction(
        testFunction,
        'Multiple Proximity Checks',
        100
      );
      
      expect(benchmark.averageTime).toBeLessThan(5); // Should be under 5ms for 3 businesses
    });
  });

  describe('Error Handling', () => {
    it('should handle missing geolocation API gracefully', async () => {
      // Remove geolocation API
      delete (global.navigator as any).geolocation;
      
      const { result } = renderHook(() => useCheckins());
      
      expect(result.current.location.isSupported).toBe(false);
      
      await act(async () => {
        await result.current.requestLocation();
      });
      
      expect(result.current.location.hasPermission).toBe(false);
      expect(result.current.location.error).toContain('not supported');
    });

    it('should handle invalid coordinates', () => {
      // Test with invalid latitude/longitude
      expect(() => {
        CheckinTestUtils.calculateDistance(NaN, -73.9851, 34.0522, -118.2437);
      }).toThrow();
      
      expect(() => {
        CheckinTestUtils.calculateDistance(40.7589, undefined as any, 34.0522, -118.2437);
      }).toThrow();
    });

    it('should validate business data structure', () => {
      const invalidBusiness = {
        id: 'test',
        business_name: 'Test',
        // Missing required fields
      } as MockBusiness;
      
      expect(() => {
        CheckinTestUtils.validateCheckInRequirements(
          40.7589,
          -73.9851,
          invalidBusiness
        );
      }).toThrow();
    });
  });

  describe('Integration Tests', () => {
    it('should integrate GPS location with business discovery', async () => {
      const { result } = renderHook(() => useCheckins());
      
      // First get location
      await act(async () => {
        await result.current.requestLocation();
      });
      
      expect(result.current.location.hasPermission).toBe(true);
      
      // Then discover nearby businesses (would normally make API call)
      // This would be tested with actual API integration
      expect(result.current.location.latitude).toBeDefined();
      expect(result.current.location.longitude).toBeDefined();
    });

    it('should integrate check-in validation with rewards system', () => {
      const validBusiness: MockBusiness = {
        id: 'reward-test-business',
        business_name: 'Reward Test Business',
        business_type: 'Restaurant',
        address: 'Test Address',
        latitude: 40.7590,
        longitude: -73.9850,
        status: 'active',
      };
      
      const validation = CheckinTestUtils.validateCheckInRequirements(
        40.7589,
        -73.9851,
        validBusiness
      );
      
      expect(validation.canCheckIn).toBe(true);
      
      // If check-in is valid, points should be awarded
      if (validation.canCheckIn) {
        const pointsEarned = CHECKIN_CONSTANTS.POINTS_PER_CHECKIN;
        expect(pointsEarned).toBeGreaterThan(0);
      }
    });
  });

  describe('Test Report Generation', () => {
    it('should generate comprehensive test report', () => {
      const mockResults = [
        {
          name: 'Test Location Permission',
          passed: true,
          duration: 150,
          message: 'Location permission granted successfully',
          details: { latitude: 40.7589, longitude: -73.9851 }
        },
        {
          name: 'Test Distance Calculation',
          passed: false,
          duration: 25,
          message: 'Distance calculation failed',
          details: { expected: 100, actual: 105 }
        }
      ];
      
      const report = CheckinTestUtils.generateTestReport(mockResults);
      
      expect(report).toContain('Check-in System Test Report');
      expect(report).toContain('✅ PASSED');
      expect(report).toContain('❌ FAILED');
      expect(report).toContain('Test Location Permission');
      expect(report).toContain('Test Distance Calculation');
      expect(report).toContain('150ms');
      expect(report).toContain('25ms');
    });
  });
});