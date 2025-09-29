// src/utils/test/checkinTestUtils.ts
// Test utilities for GPS check-in functionality testing

export interface MockLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
}

export interface MockBusiness {
  id: string;
  business_name: string;
  business_type: string;
  address: string;
  latitude: number;
  longitude: number;
  distance?: number;
  total_checkins?: number;
  status: 'active' | 'inactive';
}

export interface TestScenario {
  name: string;
  description: string;
  userLocation: MockLocation;
  businesses: MockBusiness[];
  expectedResults: {
    nearbyBusinesses: number;
    checkInEligible: string[];
    distances: { [businessId: string]: number };
  };
}

// Pre-defined test scenarios for various GPS check-in situations
export const testScenarios: TestScenario[] = [
  {
    name: 'Urban Dense Area',
    description: 'Multiple businesses within check-in range in a busy city area',
    userLocation: {
      latitude: 40.7589,
      longitude: -73.9851,
      accuracy: 10
    },
    businesses: [
      {
        id: 'business-1',
        business_name: 'Central Park Cafe',
        business_type: 'Restaurant',
        address: '123 Park Ave, New York, NY',
        latitude: 40.7590,
        longitude: -73.9850,
        status: 'active'
      },
      {
        id: 'business-2',
        business_name: 'Corner Bookstore',
        business_type: 'Retail',
        address: '456 Broadway, New York, NY',
        latitude: 40.7585,
        longitude: -73.9855,
        status: 'active'
      },
      {
        id: 'business-3',
        business_name: 'Fitness Center',
        business_type: 'Health & Fitness',
        address: '789 5th Ave, New York, NY',
        latitude: 40.7600,
        longitude: -73.9840,
        status: 'active'
      }
    ],
    expectedResults: {
      nearbyBusinesses: 3,
      checkInEligible: ['business-1', 'business-2'],
      distances: {
        'business-1': 15,
        'business-2': 60,
        'business-3': 180
      }
    }
  },
  {
    name: 'Suburban Area',
    description: 'Scattered businesses with some outside check-in range',
    userLocation: {
      latitude: 34.0522,
      longitude: -118.2437,
      accuracy: 25
    },
    businesses: [
      {
        id: 'business-4',
        business_name: 'Neighborhood Market',
        business_type: 'Grocery',
        address: '321 Main St, Los Angeles, CA',
        latitude: 34.0525,
        longitude: -118.2440,
        status: 'active'
      },
      {
        id: 'business-5',
        business_name: 'Gas Station',
        business_type: 'Automotive',
        address: '654 Highway 1, Los Angeles, CA',
        latitude: 34.0530,
        longitude: -118.2460,
        status: 'active'
      }
    ],
    expectedResults: {
      nearbyBusinesses: 2,
      checkInEligible: ['business-4'],
      distances: {
        'business-4': 40,
        'business-5': 280
      }
    }
  },
  {
    name: 'Remote Area',
    description: 'Few businesses, all outside typical check-in range',
    userLocation: {
      latitude: 39.7392,
      longitude: -104.9903,
      accuracy: 50
    },
    businesses: [
      {
        id: 'business-6',
        business_name: 'Mountain Lodge',
        business_type: 'Hospitality',
        address: '999 Mountain View Rd, Denver, CO',
        latitude: 39.7500,
        longitude: -104.9800,
        status: 'active'
      }
    ],
    expectedResults: {
      nearbyBusinesses: 1,
      checkInEligible: [],
      distances: {
        'business-6': 1400
      }
    }
  },
  {
    name: 'Edge Case - Same Location',
    description: 'User is exactly at business location (GPS perfect accuracy)',
    userLocation: {
      latitude: 37.7749,
      longitude: -122.4194,
      accuracy: 5
    },
    businesses: [
      {
        id: 'business-7',
        business_name: 'Tech Startup Office',
        business_type: 'Technology',
        address: '101 Mission St, San Francisco, CA',
        latitude: 37.7749,
        longitude: -122.4194,
        status: 'active'
      }
    ],
    expectedResults: {
      nearbyBusinesses: 1,
      checkInEligible: ['business-7'],
      distances: {
        'business-7': 0
      }
    }
  }
];

// Utility functions for testing
export class CheckinTestUtils {
  /**
   * Calculate distance between two points using Haversine formula
   */
  static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Mock geolocation API for testing (browser compatible)
   */
  static mockGeolocation(location: MockLocation) {
    const mockGeolocation = {
      getCurrentPosition: (success: PositionCallback) => {
        const position: GeolocationPosition = {
          coords: {
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy || 10,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: location.timestamp || Date.now(),
        };
        success(position);
      },
      watchPosition: () => {},
      clearWatch: () => {},
    };

    if (typeof window !== 'undefined') {
      Object.defineProperty(window.navigator, 'geolocation', {
        value: mockGeolocation,
        writable: true,
      });
    }

    return mockGeolocation;
  }

  /**
   * Generate mock check-in data for testing rewards system
   */
  static generateMockCheckins(
    userId: string,
    businessIds: string[],
    count: number = 10
  ) {
    const checkins = [];
    const now = new Date();

    for (let i = 0; i < count; i++) {
      const businessId = businessIds[Math.floor(Math.random() * businessIds.length)];
      const checkinDate = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000)); // Each day back

      checkins.push({
        id: `mock-checkin-${i + 1}`,
        business_id: businessId,
        user_id: userId,
        user_latitude: 40.7589 + (Math.random() - 0.5) * 0.01,
        user_longitude: -73.9851 + (Math.random() - 0.5) * 0.01,
        distance_from_business: Math.floor(Math.random() * 100) + 10,
        verified: Math.random() > 0.1, // 90% verification rate
        verification_method: 'gps' as const,
        checked_in_at: checkinDate.toISOString(),
      });
    }

    return checkins;
  }

  /**
   * Test GPS accuracy scenarios
   */
  static getAccuracyScenarios(): Array<{ accuracy: number; description: string; expected: 'excellent' | 'good' | 'poor' }> {
    return [
      { accuracy: 5, description: 'Excellent GPS (indoor/urban)', expected: 'excellent' },
      { accuracy: 25, description: 'Good GPS (typical outdoor)', expected: 'excellent' },
      { accuracy: 50, description: 'Acceptable GPS', expected: 'excellent' },
      { accuracy: 75, description: 'Fair GPS', expected: 'good' },
      { accuracy: 100, description: 'Poor GPS (edge case)', expected: 'good' },
      { accuracy: 150, description: 'Very poor GPS', expected: 'poor' },
      { accuracy: 500, description: 'Unusable GPS', expected: 'poor' },
    ];
  }

  /**
   * Validate check-in business requirements
   */
  static validateCheckInRequirements(
    userLat: number,
    userLon: number,
    business: MockBusiness,
    maxDistance: number = 100
  ): {
    canCheckIn: boolean;
    reason: string;
    distance: number;
  } {
    const distance = this.calculateDistance(
      userLat,
      userLon,
      business.latitude,
      business.longitude
    );

    if (business.status !== 'active') {
      return {
        canCheckIn: false,
        reason: 'Business is not active',
        distance
      };
    }

    if (distance > maxDistance) {
      return {
        canCheckIn: false,
        reason: `Too far away (${Math.round(distance)}m > ${maxDistance}m)`,
        distance
      };
    }

    return {
      canCheckIn: true,
      reason: 'All requirements met',
      distance
    };
  }

  /**
   * Test proximity detection with various edge cases
   */
  static getProximityTestCases() {
    return [
      {
        name: 'Direct vicinity',
        userLat: 40.7589,
        userLon: -73.9851,
        businessLat: 40.7590,
        businessLon: -73.9850,
        expectedDistance: 15,
        shouldBeEligible: true
      },
      {
        name: 'Just within range',
        userLat: 40.7589,
        userLon: -73.9851,
        businessLat: 40.7598,
        businessLon: -73.9851,
        expectedDistance: 100,
        shouldBeEligible: true
      },
      {
        name: 'Just outside range',
        userLat: 40.7589,
        userLon: -73.9851,
        businessLat: 40.7600,
        businessLon: -73.9851,
        expectedDistance: 122,
        shouldBeEligible: false
      },
      {
        name: 'Far away',
        userLat: 40.7589,
        userLon: -73.9851,
        businessLat: 40.7689,
        businessLon: -73.9751,
        expectedDistance: 1400,
        shouldBeEligible: false
      }
    ];
  }

  /**
   * Performance benchmark utilities
   */
  static async benchmarkFunction<T>(
    fn: () => Promise<T>,
    name: string,
    iterations: number = 100
  ): Promise<{
    name: string;
    averageTime: number;
    minTime: number;
    maxTime: number;
    totalTime: number;
    iterations: number;
  }> {
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await fn();
      const end = performance.now();
      times.push(end - start);
    }

    const totalTime = times.reduce((sum, time) => sum + time, 0);
    const averageTime = totalTime / iterations;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    return {
      name,
      averageTime,
      minTime,
      maxTime,
      totalTime,
      iterations
    };
  }

  /**
   * Generate test report
   */
  static generateTestReport(results: any[]): string {
    let report = '# Check-in System Test Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;
    
    results.forEach((result, index) => {
      report += `## Test ${index + 1}: ${result.name}\n`;
      report += `**Status**: ${result.passed ? '✅ PASSED' : '❌ FAILED'}\n`;
      report += `**Duration**: ${result.duration}ms\n`;
      if (result.message) {
        report += `**Message**: ${result.message}\n`;
      }
      if (result.details) {
        report += `**Details**:\n\`\`\`json\n${JSON.stringify(result.details, null, 2)}\n\`\`\`\n`;
      }
      report += '\n';
    });

    return report;
  }
}

// Export types and constants for testing
export const CHECKIN_CONSTANTS = {
  MAX_CHECKIN_DISTANCE: 100, // meters
  MIN_GPS_ACCURACY: 200, // meters
  CHECKIN_COOLDOWN: 60, // minutes
  POINTS_PER_CHECKIN: 10,
  BONUS_POINTS_STREAK: 5,
} as const;

export type CheckinTestResult = {
  name: string;
  passed: boolean;
  duration: number;
  message?: string;
  details?: any;
};