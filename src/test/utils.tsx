/**
 * Test Utilities
 * 
 * Common testing utilities and helpers
 */

import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';

/**
 * Create a test query client with default config
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  });
}

/**
 * Wrapper component with common providers
 */
interface AllTheProvidersProps {
  children: React.ReactNode;
}

export function AllTheProviders({ children }: AllTheProvidersProps) {
  const testQueryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={testQueryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
}

/**
 * Custom render function with providers
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllTheProviders, ...options });
}

/**
 * Create mock Supabase client
 */
export function createMockSupabaseClient() {
  return {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      like: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      contains: vi.fn().mockReturnThis(),
      containedBy: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      }),
      signUp: vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: null, error: null }),
        download: vi.fn().mockResolvedValue({ data: null, error: null }),
        list: vi.fn().mockResolvedValue({ data: [], error: null }),
        remove: vi.fn().mockResolvedValue({ data: null, error: null }),
        getPublicUrl: vi.fn(() => ({
          data: { publicUrl: 'https://example.com/image.jpg' },
        })),
      })),
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
}

/**
 * Create mock user object
 */
export function createMockUser(overrides = {}) {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    user_metadata: {},
    app_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create mock business object
 */
export function createMockBusiness(overrides = {}) {
  return {
    id: 'test-business-id',
    user_id: 'test-user-id',
    business_name: 'Test Business',
    business_type: 'Restaurant',
    description: 'A test business',
    address: '123 Test St',
    city: 'Test City',
    state: 'Test State',
    country: 'Test Country',
    status: 'active',
    verified: true,
    average_rating: 4.5,
    total_reviews: 10,
    total_checkins: 50,
    categories: ['food'],
    tags: ['restaurant'],
    operating_hours: {},
    social_media: {},
    gallery_images: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create mock coupon object
 */
export function createMockCoupon(overrides = {}) {
  return {
    id: 'test-coupon-id',
    business_id: 'test-business-id',
    title: 'Test Coupon',
    description: 'A test coupon',
    type: 'percentage',
    discount_type: 'percentage',
    discount_value: 20,
    code: 'TEST20',
    valid_from: new Date().toISOString(),
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'active',
    usage_limit: 100,
    used_count: 10,
    per_user_limit: 1,
    target_audience: 'all_users',
    is_public: true,
    terms_conditions: 'Test terms',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Wait for async operations
 */
export const waitFor = (callback: () => void, timeout = 1000) => {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Timeout waiting for condition'));
    }, timeout);

    const check = () => {
      try {
        callback();
        clearTimeout(timer);
        resolve();
      } catch (error) {
        setTimeout(check, 50);
      }
    };

    check();
  });
};

/**
 * Simulate async delay
 */
export const delay = (ms: number) => 
  new Promise(resolve => setTimeout(resolve, ms));

// Re-export common testing library utilities
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';