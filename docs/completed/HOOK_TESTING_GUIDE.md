# Hook Testing Guide

## Overview

This guide explains how to test custom React hooks in the SynC project, with a focus on testing hooks that interact with Supabase.

## Testing useCampaigns Hook

### Current Status

The `useCampaigns` hook has been created with the following exports:
- `useCampaign` - Fetch and manage a single campaign
- `useCampaignList` - Fetch and manage lists of campaigns with filters
- `useCreateCampaign` - Create new campaigns
- `useUpdateCampaign` - Update existing campaigns
- `useDeleteCampaign` - Delete campaigns
- `useCampaignAnalytics` - Fetch real-time analytics

### Testing Approach

#### Option 1: Integration Tests (Recommended for Now)

Given the complexity of mocking Supabase's query builder API, integration tests with a test database are recommended:

```typescript
describe('useCampaigns - Integration Tests', () => {
  beforeAll(async () => {
    // Setup test database with seed data
    await seedTestData();
  });

  it('fetches campaigns', async () => {
    const { result } = renderHook(() => useCampaignList());
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.campaigns).toHaveLength(3);
  });
});
```

#### Option 2: Unit Tests with Service Layer

A better long-term approach is to extract Supabase logic into service functions:

```typescript
// services/campaignService.ts
export async function fetchCampaign(id: string) {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
}

// hooks/useCampaigns.ts
import { fetchCampaign } from '../services/campaignService';

export function useCampaign(id: string) {
  // Hook logic using fetchCampaign
}
```

Then mock the service:

```typescript
import { vi } from 'vitest';
import { fetchCampaign } from '../services/campaignService';

vi.mock('../services/campaignService');

describe('useCampaign', () => {
  it('fetches campaign', async () => {
    vi.mocked(fetchCampaign).mockResolvedValue(mockCampaign);
    
    const { result } = renderHook(() => useCampaign('test-id'));
    
    await waitFor(() => {
      expect(result.current.campaign).toEqual(mockCampaign);
    });
  });
});
```

### Testing Components

The component tests (`CampaignWizard.test.tsx`, `DriverProfileCard.test.tsx`) demonstrate successful testing patterns:

1. **Mock user interactions** with `@testing-library/user-event`
2. **Check rendering** with `screen` queries  
3. **Verify state changes** after interactions
4. **Test accessibility** with aria labels and roles

### Current Test Coverage

✅ **Completed:**
- CampaignWizard component (multi-step form)
- DriverProfileCard component (data display)
- Test setup with MSW and Vitest
- Mock data generators

⏳ **Pending:**
- useCampaigns hook tests (requires service layer refactor OR integration tests)
- useDrivers hook tests
- useAnalytics hook tests
- Targeting components tests

### Recommendations

1. **Short-term:** Use the component tests as examples for remaining components
2. **Medium-term:** Create integration tests for hooks with test database
3. **Long-term:** Refactor to service layer for easier unit testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- src/components/__tests__/CampaignWizard.test.tsx

# Run tests in watch mode
npm test -- --watch

# Run with coverage
npm test -- --coverage
```

### Test File Structure

```
src/
├── components/
│   └── __tests__/
│       ├── CampaignWizard.test.tsx ✅
│       ├── DriverProfileCard.test.tsx ✅
│       └── TargetingEditor.test.tsx ⏳
├── hooks/
│   └── __tests__/
│       ├── useCampaigns.test.ts ⏳
│       ├── useDrivers.test.ts ⏳
│       └── useAnalytics.test.ts ⏳
└── test/
    ├── setup.ts ✅
    ├── mocks/
    │   ├── data.ts ✅
    │   └── handlers.ts ✅
    └── utils/
        └── test-utils.tsx ✅
```

## Next Steps

1. **Complete Phase 4 components** - Focus on Targeting Configuration UI
2. **Add component tests** for new components as they're created
3. **Document testing patterns** as they emerge
4. **Consider service layer refactor** for easier hook testing

---

*Last updated: 2025-01-10*
