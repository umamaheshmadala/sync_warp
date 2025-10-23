# Testing Guide: Follower Targeting System

## Overview

This guide provides comprehensive testing procedures for the follower targeting and analytics system.

---

## Table of Contents

1. [Unit Testing](#unit-testing)
2. [Integration Testing](#integration-testing)
3. [End-to-End Testing](#end-to-end-testing)
4. [Manual Testing Checklist](#manual-testing-checklist)
5. [Performance Testing](#performance-testing)
6. [Security Testing](#security-testing)
7. [Test Data Setup](#test-data-setup)

---

## Unit Testing

### Testing Utility Functions

```typescript
// followerUtils.test.ts
import { 
  calculateCTR, 
  calculateEngagementRate, 
  getAgeGroup,
  formatNumber,
  validateTargetingFilters 
} from '../lib/followerUtils';

describe('Follower Utilities', () => {
  describe('calculateCTR', () => {
    it('should calculate CTR correctly', () => {
      expect(calculateCTR(1000, 50)).toBe(5);
      expect(calculateCTR(0, 0)).toBe(0);
    });
  });

  describe('calculateEngagementRate', () => {
    it('should calculate engagement rate correctly', () => {
      expect(calculateEngagementRate(1000, 50, 20, 10)).toBe(8);
    });
  });

  describe('getAgeGroup', () => {
    it('should return correct age groups', () => {
      expect(getAgeGroup(15)).toBe('13-17');
      expect(getAgeGroup(22)).toBe('18-24');
      expect(getAgeGroup(30)).toBe('25-34');
      expect(getAgeGroup(70)).toBe('65+');
    });
  });

  describe('formatNumber', () => {
    it('should format numbers with abbreviations', () => {
      expect(formatNumber(500)).toBe('500');
      expect(formatNumber(1500)).toBe('1.5K');
      expect(formatNumber(1500000)).toBe('1.5M');
      expect(formatNumber(1500000000)).toBe('1.5B');
    });
  });

  describe('validateTargetingFilters', () => {
    it('should validate age range correctly', () => {
      const result = validateTargetingFilters({
        ageRange: { min: 10, max: 30 }
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Minimum age must be at least 13');
    });

    it('should pass valid filters', () => {
      const result = validateTargetingFilters({
        targetFollowers: true,
        ageRange: { min: 18, max: 35 },
        gender: 'all'
      });
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });
  });
});
```

### Testing Custom Hooks

```typescript
// useCampaignTargeting.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCampaignTargeting } from '../hooks/useCampaignTargeting';

describe('useCampaignTargeting', () => {
  it('should initialize with default filters', () => {
    const { result } = renderHook(() => useCampaignTargeting('business-id'));
    
    expect(result.current.filters.targetFollowers).toBe(false);
    expect(result.current.reach).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('should update filters', () => {
    const { result } = renderHook(() => useCampaignTargeting('business-id'));
    
    act(() => {
      result.current.updateFilters({ targetFollowers: true });
    });
    
    expect(result.current.filters.targetFollowers).toBe(true);
  });

  it('should calculate reach when filters change', async () => {
    const { result } = renderHook(() => useCampaignTargeting('business-id'));
    
    act(() => {
      result.current.updateFilters({ 
        targetFollowers: true,
        ageRange: { min: 18, max: 35 }
      });
    });
    
    await waitFor(() => {
      expect(result.current.reach).not.toBeNull();
    }, { timeout: 1000 });
  });

  it('should reset filters', () => {
    const { result } = renderHook(() => useCampaignTargeting('business-id'));
    
    act(() => {
      result.current.updateFilters({ targetFollowers: true });
      result.current.resetFilters();
    });
    
    expect(result.current.filters.targetFollowers).toBe(false);
    expect(result.current.reach).toBeNull();
  });
});
```

---

## Integration Testing

### Testing Component Integration

```typescript
// CampaignTargetingForm.integration.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CampaignTargetingForm } from '../components/campaign/CampaignTargetingForm';

describe('CampaignTargetingForm Integration', () => {
  it('should render targeting options', () => {
    render(<CampaignTargetingForm businessId="test-id" />);
    
    expect(screen.getByText(/Campaign Targeting/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Target My Followers Only/i)).toBeInTheDocument();
  });

  it('should show FollowerSegmentSelector when targeting followers', async () => {
    render(<CampaignTargetingForm businessId="test-id" />);
    
    const checkbox = screen.getByLabelText(/Target My Followers Only/i);
    fireEvent.click(checkbox);
    
    await waitFor(() => {
      expect(screen.getByText(/Follower Demographics/i)).toBeInTheDocument();
    });
  });

  it('should call onTargetingChange when filters update', async () => {
    const onTargetingChange = jest.fn();
    render(
      <CampaignTargetingForm 
        businessId="test-id" 
        onTargetingChange={onTargetingChange}
      />
    );
    
    const checkbox = screen.getByLabelText(/Target My Followers Only/i);
    fireEvent.click(checkbox);
    
    await waitFor(() => {
      expect(onTargetingChange).toHaveBeenCalled();
    });
  });
});
```

### Testing Database Operations

```typescript
// followerOperations.integration.test.ts
import { 
  followBusiness, 
  unfollowBusiness, 
  isFollowing, 
  getFollowerCount 
} from '../lib/followerUtils';
import { supabase } from '../lib/supabase';

describe('Follower Operations Integration', () => {
  const testBusinessId = 'test-business-id';
  const testUserId = 'test-user-id';

  beforeAll(async () => {
    // Setup test data
  });

  afterAll(async () => {
    // Cleanup test data
  });

  it('should follow a business', async () => {
    const result = await followBusiness(testBusinessId, testUserId);
    expect(result).toBe(true);
    
    const following = await isFollowing(testBusinessId, testUserId);
    expect(following).toBe(true);
  });

  it('should unfollow a business', async () => {
    await followBusiness(testBusinessId, testUserId);
    const result = await unfollowBusiness(testBusinessId, testUserId);
    
    expect(result).toBe(true);
    
    const following = await isFollowing(testBusinessId, testUserId);
    expect(following).toBe(false);
  });

  it('should get accurate follower count', async () => {
    await followBusiness(testBusinessId, testUserId);
    const count = await getFollowerCount(testBusinessId);
    
    expect(count).toBeGreaterThan(0);
  });
});
```

---

## End-to-End Testing

### Campaign Creation Flow

```typescript
// campaignCreation.e2e.test.ts
describe('Campaign Creation E2E', () => {
  beforeEach(() => {
    cy.login('business-owner@example.com', 'password');
    cy.visit('/campaigns/new');
  });

  it('should create a campaign with follower targeting', () => {
    // Fill campaign details
    cy.get('[data-testid="campaign-title"]').type('Summer Sale 2025');
    cy.get('[data-testid="campaign-description"]').type('Big summer sale');
    
    // Enable follower targeting
    cy.get('[data-testid="target-followers-checkbox"]').check();
    
    // Set demographic filters
    cy.get('[data-testid="age-min"]').type('18');
    cy.get('[data-testid="age-max"]').type('45');
    cy.get('[data-testid="gender-select"]').select('all');
    
    // Verify reach estimate appears
    cy.get('[data-testid="reach-estimate"]').should('be.visible');
    cy.get('[data-testid="estimated-reach-number"]').should('not.be.empty');
    
    // Publish campaign
    cy.get('[data-testid="publish-button"]').click();
    
    // Verify success
    cy.get('[data-testid="success-toast"]').should('contain', 'Campaign published');
    cy.url().should('include', '/campaigns/');
  });

  it('should display campaign analytics', () => {
    cy.visit('/campaigns/test-campaign-id/analytics');
    
    // Verify metrics are displayed
    cy.get('[data-testid="impressions-metric"]').should('be.visible');
    cy.get('[data-testid="clicks-metric"]').should('be.visible');
    cy.get('[data-testid="ctr-metric"]').should('be.visible');
    
    // Verify chart is rendered
    cy.get('[data-testid="daily-performance-chart"]').should('be.visible');
    
    // Test export functionality
    cy.get('[data-testid="export-button"]').click();
    cy.readFile('cypress/downloads/campaign-*.csv').should('exist');
  });
});
```

---

## Manual Testing Checklist

### Campaign Targeting

- [ ] **Basic Campaign Creation**
  - [ ] Create campaign with title and description
  - [ ] Set start and end dates
  - [ ] Set budget (optional)
  - [ ] Save as draft
  - [ ] Publish campaign

- [ ] **Follower Targeting**
  - [ ] Enable "Target My Followers Only"
  - [ ] FollowerSegmentSelector appears
  - [ ] Demographics are displayed correctly
  - [ ] Apply age filter
  - [ ] Apply gender filter
  - [ ] Apply city filter
  - [ ] Reach estimate updates in real-time
  - [ ] Demographic breakdown is accurate

- [ ] **Public Targeting**
  - [ ] Disable follower targeting
  - [ ] Advanced filters appear
  - [ ] Apply demographic filters
  - [ ] Reach estimate calculates correctly

### Analytics Dashboard

- [ ] **Metrics Display**
  - [ ] Impressions count accurate
  - [ ] Clicks tracked correctly
  - [ ] CTR calculated properly
  - [ ] Engagement metrics accurate
  - [ ] Follower vs. public reach breakdown

- [ ] **Time Range Filtering**
  - [ ] Switch between 7d, 30d, all time
  - [ ] Metrics update correctly
  - [ ] Charts redraw properly

- [ ] **Export Functionality**
  - [ ] CSV export button works
  - [ ] File downloads successfully
  - [ ] Data is accurate and complete

### Follower Insights

- [ ] **Statistics Display**
  - [ ] Total followers count correct
  - [ ] New followers this week
  - [ ] Unfollowers tracked
  - [ ] Growth rate calculated

- [ ] **Demographics**
  - [ ] Age distribution shows correctly
  - [ ] Gender breakdown accurate
  - [ ] Top cities displayed
  - [ ] Progress bars render properly

- [ ] **Retention Metrics**
  - [ ] 30-day retention rate calculated
  - [ ] Benchmark visualization works

### Admin Tools

- [ ] **Activity Monitor**
  - [ ] Platform-wide stats display
  - [ ] Suspicious patterns detected
  - [ ] Most followed businesses shown
  - [ ] Time range filters work

- [ ] **Report Reviewer**
  - [ ] Reports list loads
  - [ ] Filter by status works
  - [ ] Search functionality
  - [ ] Report details display
  - [ ] Action modal opens
  - [ ] Actions process correctly

### Follow Button

- [ ] **Functionality**
  - [ ] Follow a business
  - [ ] Unfollow a business
  - [ ] State persists across page reloads
  - [ ] Loading states show properly
  - [ ] Toast notifications appear

- [ ] **Variants**
  - [ ] Default variant renders correctly
  - [ ] Outline variant renders correctly
  - [ ] Text variant renders correctly
  - [ ] All sizes (sm, md, lg) work

---

## Performance Testing

### Load Testing Scenarios

```bash
# Test campaign creation with k6
k6 run --vus 50 --duration 30s tests/load/campaign-creation.js

# Test analytics dashboard loading
k6 run --vus 100 --duration 60s tests/load/analytics-dashboard.js

# Test reach calculation
k6 run --vus 20 --duration 30s tests/load/reach-calculation.js
```

### Performance Benchmarks

| Operation | Target | Acceptable | Critical |
|-----------|--------|------------|----------|
| Campaign creation | < 500ms | < 1s | > 2s |
| Reach calculation | < 300ms | < 500ms | > 1s |
| Analytics load | < 800ms | < 1.5s | > 3s |
| Follower insights | < 600ms | < 1s | > 2s |
| Dashboard render | < 200ms | < 400ms | > 800ms |

### Monitoring Queries

```sql
-- Check slow queries
SELECT 
  query,
  mean_exec_time,
  calls
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Monitor table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## Security Testing

### RLS Policy Testing

```sql
-- Test as business owner
SET role authenticated;
SET request.jwt.claims TO '{"sub": "business-owner-id"}';

-- Should succeed
SELECT * FROM campaigns WHERE business_id = 'owned-business-id';

-- Should fail
SELECT * FROM campaigns WHERE business_id = 'other-business-id';

-- Test as regular user
SET request.jwt.claims TO '{"sub": "regular-user-id"}';

-- Should only see own follows
SELECT * FROM business_followers WHERE user_id = 'regular-user-id';

-- Should fail
INSERT INTO campaigns (business_id, title) VALUES ('random-id', 'Test');
```

### Security Checklist

- [ ] **Authentication**
  - [ ] Unauthenticated users cannot access data
  - [ ] Session tokens expire correctly
  - [ ] Password reset works securely

- [ ] **Authorization**
  - [ ] RLS policies enforced on all tables
  - [ ] Users can only access their own data
  - [ ] Admin actions require admin role
  - [ ] Cross-business data access prevented

- [ ] **Input Validation**
  - [ ] SQL injection prevented
  - [ ] XSS attacks blocked
  - [ ] CSRF tokens validated
  - [ ] File uploads sanitized

- [ ] **Data Protection**
  - [ ] Sensitive data encrypted
  - [ ] API keys not exposed
  - [ ] User data anonymized in logs

---

## Test Data Setup

### SQL Scripts for Test Data

```sql
-- Create test users
INSERT INTO users (id, email, age, gender, city) VALUES
  ('user-1', 'user1@test.com', 25, 'male', 'New York'),
  ('user-2', 'user2@test.com', 30, 'female', 'Los Angeles'),
  ('user-3', 'user3@test.com', 35, 'other', 'Chicago');

-- Create test business
INSERT INTO businesses (id, business_name, owner_id) VALUES
  ('business-1', 'Test Business', 'owner-1');

-- Create test followers
INSERT INTO business_followers (business_id, user_id, followed_at, is_active) VALUES
  ('business-1', 'user-1', NOW() - INTERVAL '10 days', true),
  ('business-1', 'user-2', NOW() - INTERVAL '5 days', true),
  ('business-1', 'user-3', NOW() - INTERVAL '2 days', false);

-- Create test campaign
INSERT INTO campaigns (id, business_id, title, status, targeting_filters) VALUES
  ('campaign-1', 'business-1', 'Test Campaign', 'active', 
   '{"targetFollowers": true, "ageRange": {"min": 18, "max": 45}}'::jsonb);

-- Create test metrics
INSERT INTO campaign_metrics (campaign_id, user_id, impressions, clicks, likes, shares, is_follower) VALUES
  ('campaign-1', 'user-1', 10, 2, 1, 0, true),
  ('campaign-1', 'user-2', 5, 1, 0, 1, true),
  ('campaign-1', 'user-3', 15, 3, 2, 1, false);
```

### Cleanup Script

```sql
-- Clean up test data
DELETE FROM campaign_metrics WHERE campaign_id = 'campaign-1';
DELETE FROM campaigns WHERE id = 'campaign-1';
DELETE FROM business_followers WHERE business_id = 'business-1';
DELETE FROM businesses WHERE id = 'business-1';
DELETE FROM users WHERE id IN ('user-1', 'user-2', 'user-3');
```

---

## Continuous Integration

### GitHub Actions Workflow

```yaml
name: Test Follower System

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:integration
      - run: npm run test:e2e
      
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
```

---

**Last Updated:** January 23, 2025  
**Version:** 1.0.0
