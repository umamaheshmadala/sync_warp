import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import BusinessRegistration from '../BusinessRegistration';
import * as authStore from '../../../store/authStore';
import { supabase } from '../../../lib/supabase';
import { toast } from 'react-hot-toast';

// Mock dependencies
vi.mock('react-hot-toast');
vi.mock('../../../store/authStore');
vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    storage: {
      from: vi.fn()
    }
  }
}));

describe('BusinessRegistration Integration Tests', () => {
  const mockNavigate = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock useNavigate
    vi.mock('react-router-dom', async () => {
      const actual = await vi.importActual('react-router-dom');
      return {
        ...actual,
        useNavigate: () => mockNavigate
      };
    });

    // Mock auth store
    vi.mocked(authStore.useAuthStore).mockReturnValue({
      user: {
        id: 'user-123',
        email: 'test@example.com',
      },
    } as any);

    // Mock Supabase queries
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [
              { id: 'cat-1', name: 'restaurant', display_name: 'Restaurant', is_active: true, sort_order: 1 },
              { id: 'cat-2', name: 'retail', display_name: 'Retail', is_active: true, sort_order: 2 }
            ],
            error: null
          })
        }),
        single: vi.fn().mockResolvedValue({ data: null, error: null })
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'business-123' },
            error: null
          })
        })
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      })
    });

    vi.mocked(supabase.from).mockImplementation(mockFrom as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <BusinessRegistration />
      </BrowserRouter>
    );
  };

  describe('Step 1: Basic Information', () => {
    it('should render step 1 with all required fields', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/business name/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/business type/i) || screen.getByLabelText(/business type/i)).toBeInTheDocument();
      });
    });

    it('should validate business name is required', async () => {
      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/business name/i)).toBeInTheDocument();
      });

      // Try to proceed without filling business name
      const nextButton = screen.getByRole('button', { name: /next|continue/i });
      await user.click(nextButton);

      // Should show error or stay on step 1
      await waitFor(() => {
        expect(screen.getByText(/step 1/i) || screen.getByText(/basic information/i)).toBeInTheDocument();
      });
    });

    it('should fill basic information and proceed to next step', async () => {
      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/business name/i)).toBeInTheDocument();
      });

      // Fill basic information
      const businessNameInput = screen.getByPlaceholderText(/business name/i);
      await user.type(businessNameInput, 'Test Restaurant');

      const categorySelect = screen.getByRole('combobox') || screen.getAllByRole('button')[0];
      await user.click(categorySelect);
      
      // Select restaurant category
      const restaurantOption = await screen.findByText('Restaurant');
      await user.click(restaurantOption);

      // Add description
      const descInput = screen.getByPlaceholderText(/description/i);
      await user.type(descInput, 'A great test restaurant');

      // Proceed to next step
      const nextButton = screen.getByRole('button', { name: /next|continue/i });
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText(/step 2|location/i)).toBeInTheDocument();
      });
    });

    it('should load business categories from database', async () => {
      renderComponent();

      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalledWith('business_categories');
      });

      // Should display loaded categories
      const categorySelect = screen.getByRole('combobox') || screen.getAllByRole('button')[0];
      await userEvent.click(categorySelect);

      await waitFor(() => {
        expect(screen.getByText('Restaurant')).toBeInTheDocument();
        expect(screen.getByText('Retail')).toBeInTheDocument();
      });
    });
  });

  describe('Step 2: Location & Contact', () => {
    it('should validate address fields', async () => {
      const user = userEvent.setup();
      renderComponent();

      // Navigate to step 2
      await waitFor(() => {
        const businessNameInput = screen.getByPlaceholderText(/business name/i);
        user.type(businessNameInput, 'Test Business');
      });

      const nextButton = screen.getByRole('button', { name: /next|continue/i });
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText(/location|address/i)).toBeInTheDocument();
      });

      // Try to proceed without filling address
      const nextBtn = screen.getByRole('button', { name: /next|continue/i });
      await user.click(nextBtn);

      // Should stay on step 2 or show validation error
      expect(screen.getByText(/location|address/i)).toBeInTheDocument();
    });

    it('should fill location details and proceed', async () => {
      const user = userEvent.setup();
      renderComponent();

      // Navigate through step 1
      await waitFor(() => {
        const businessNameInput = screen.getByPlaceholderText(/business name/i);
        user.type(businessNameInput, 'Test');
      });
      const nextButton = screen.getByRole('button', { name: /next|continue/i });
      await user.click(nextButton);

      // Fill location details
      await waitFor(() => {
        const addressInput = screen.getByPlaceholderText(/address|street/i);
        user.type(addressInput, '123 Main Street');
      });

      const cityInput = screen.getByPlaceholderText(/city/i);
      await user.type(cityInput, 'Test City');

      const stateInput = screen.getByPlaceholderText(/state/i);
      await user.type(stateInput, 'Test State');

      const postalInput = screen.getByPlaceholderText(/postal|zip/i);
      await user.type(postalInput, '12345');

      // Proceed to next step
      const nextBtn = screen.getByRole('button', { name: /next|continue/i });
      await user.click(nextBtn);

      await waitFor(() => {
        expect(screen.getByText(/step 3|hours/i)).toBeInTheDocument();
      });
    });

    it('should validate email format', async () => {
      const user = userEvent.setup();
      renderComponent();

      // Navigate to step 2
      await waitFor(() => {
        const businessNameInput = screen.getByPlaceholderText(/business name/i);
        user.type(businessNameInput, 'Test');
      });
      const nextButton = screen.getByRole('button', { name: /next|continue/i });
      await user.click(nextButton);

      // Enter invalid email
      await waitFor(() => {
        const emailInput = screen.getByPlaceholderText(/email/i);
        user.type(emailInput, 'invalid-email');
      });

      const nextBtn = screen.getByRole('button', { name: /next|continue/i });
      await user.click(nextBtn);

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/invalid.*email|valid email/i)).toBeInTheDocument();
      });
    });

    it('should validate phone number format', async () => {
      const user = userEvent.setup();
      renderComponent();

      // Navigate to step 2
      await waitFor(() => {
        const businessNameInput = screen.getByPlaceholderText(/business name/i);
        user.type(businessNameInput, 'Test');
      });
      const nextButton = screen.getByRole('button', { name: /next|continue/i });
      await user.click(nextButton);

      // Enter invalid phone
      await waitFor(() => {
        const phoneInput = screen.getByPlaceholderText(/phone/i);
        user.type(phoneInput, '123');
      });

      const nextBtn = screen.getByRole('button', { name: /next|continue/i });
      await user.click(nextBtn);

      // Should show validation error or prevent proceeding
      expect(screen.getByText(/location|contact/i)).toBeInTheDocument();
    });
  });

  describe('Step 3: Operating Hours', () => {
    it('should display default operating hours', async () => {
      const user = userEvent.setup();
      renderComponent();

      // Navigate to step 3
      await waitFor(() => {
        const businessNameInput = screen.getByPlaceholderText(/business name/i);
        user.type(businessNameInput, 'Test');
      });

      // Skip through steps
      const nextButtons = screen.getAllByRole('button', { name: /next|continue/i });
      for (const btn of nextButtons.slice(0, 2)) {
        await user.click(btn);
        await waitFor(() => {}, { timeout: 100 });
      }

      // Should show operating hours for each day
      await waitFor(() => {
        expect(screen.getByText(/monday/i)).toBeInTheDocument();
        expect(screen.getByText(/tuesday/i)).toBeInTheDocument();
        expect(screen.getByText(/sunday/i)).toBeInTheDocument();
      });
    });

    it('should allow marking days as closed', async () => {
      const user = userEvent.setup();
      renderComponent();

      // Navigate to step 3
      await waitFor(() => {
        const businessNameInput = screen.getByPlaceholderText(/business name/i);
        user.type(businessNameInput, 'Test');
      });

      // Navigate to step 3
      const nextButtons = screen.getAllByRole('button', { name: /next|continue/i });
      for (const btn of nextButtons.slice(0, 2)) {
        await user.click(btn);
      }

      // Mark Sunday as closed
      await waitFor(() => {
        const sundayCheckbox = screen.getByRole('checkbox', { name: /sunday.*closed/i });
        user.click(sundayCheckbox);
      });

      await waitFor(() => {
        const sundayCheckbox = screen.getByRole('checkbox', { name: /sunday.*closed/i });
        expect(sundayCheckbox).toBeChecked();
      });
    });

    it('should allow setting custom hours for each day', async () => {
      const user = userEvent.setup();
      renderComponent();

      // Navigate to step 3
      await waitFor(() => {
        const businessNameInput = screen.getByPlaceholderText(/business name/i);
        user.type(businessNameInput, 'Test');
      });

      const nextButtons = screen.getAllByRole('button', { name: /next|continue/i });
      for (const btn of nextButtons.slice(0, 2)) {
        await user.click(btn);
      }

      // Set custom hours for Monday
      await waitFor(() => {
        const mondayOpenInput = screen.getByLabelText(/monday.*open/i);
        user.clear(mondayOpenInput);
        user.type(mondayOpenInput, '08:00');
      });

      const mondayCloseInput = screen.getByLabelText(/monday.*close/i);
      await user.clear(mondayCloseInput);
      await user.type(mondayCloseInput, '22:00');

      expect(mondayOpenInput).toHaveValue('08:00');
      expect(mondayCloseInput).toHaveValue('22:00');
    });
  });

  describe('Step 4: Media & Final Details', () => {
    it('should allow uploading business logo', async () => {
      const user = userEvent.setup();
      renderComponent();

      // Navigate to final step
      await waitFor(() => {
        const businessNameInput = screen.getByPlaceholderText(/business name/i);
        user.type(businessNameInput, 'Test');
      });

      const nextButtons = screen.getAllByRole('button', { name: /next|continue/i });
      for (const btn of nextButtons.slice(0, 3)) {
        await user.click(btn);
      }

      // Upload logo
      await waitFor(() => {
        const logoInput = screen.getByLabelText(/logo/i);
        expect(logoInput).toBeInTheDocument();
      });
    });

    it('should allow uploading cover photo', async () => {
      const user = userEvent.setup();
      renderComponent();

      // Navigate to final step
      await waitFor(() => {
        const businessNameInput = screen.getByPlaceholderText(/business name/i);
        user.type(businessNameInput, 'Test');
      });

      const nextButtons = screen.getAllByRole('button', { name: /next|continue/i });
      for (const btn of nextButtons.slice(0, 3)) {
        await user.click(btn);
      }

      // Upload cover
      await waitFor(() => {
        const coverInput = screen.getByLabelText(/cover/i);
        expect(coverInput).toBeInTheDocument();
      });
    });

    it('should allow adding tags', async () => {
      const user = userEvent.setup();
      renderComponent();

      // Navigate to final step
      await waitFor(() => {
        const businessNameInput = screen.getByPlaceholderText(/business name/i);
        user.type(businessNameInput, 'Test');
      });

      const nextButtons = screen.getAllByRole('button', { name: /next|continue/i });
      for (const btn of nextButtons.slice(0, 3)) {
        await user.click(btn);
      }

      // Add a tag
      await waitFor(() => {
        const tagInput = screen.getByPlaceholderText(/tag/i);
        user.type(tagInput, 'italian{enter}');
      });

      await waitFor(() => {
        expect(screen.getByText('italian')).toBeInTheDocument();
      });
    });

    it('should allow removing tags', async () => {
      const user = userEvent.setup();
      renderComponent();

      // Navigate to final step and add a tag
      await waitFor(() => {
        const businessNameInput = screen.getByPlaceholderText(/business name/i);
        user.type(businessNameInput, 'Test');
      });

      const nextButtons = screen.getAllByRole('button', { name: /next|continue/i });
      for (const btn of nextButtons.slice(0, 3)) {
        await user.click(btn);
      }

      // Add and remove tag
      await waitFor(() => {
        const tagInput = screen.getByPlaceholderText(/tag/i);
        user.type(tagInput, 'italian{enter}');
      });

      await waitFor(() => {
        const removeButton = screen.getByRole('button', { name: /remove.*italian/i });
        user.click(removeButton);
      });

      await waitFor(() => {
        expect(screen.queryByText('italian')).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should submit complete business registration', async () => {
      const user = userEvent.setup();
      renderComponent();

      // Fill all required fields across all steps
      await waitFor(() => {
        const businessNameInput = screen.getByPlaceholderText(/business name/i);
        user.type(businessNameInput, 'Complete Test Business');
      });

      // Navigate through all steps filling minimal data
      const nextButtons = screen.getAllByRole('button', { name: /next|continue/i });
      for (const btn of nextButtons) {
        await user.click(btn);
        await waitFor(() => {}, { timeout: 100 });
      }

      // Submit form
      const submitButton = screen.getByRole('button', { name: /submit|register|create/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalledWith('businesses');
        expect(vi.mocked(toast.success)).toHaveBeenCalled();
      });
    });

    it('should handle submission errors gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock submission error
      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' }
            })
          })
        })
      });
      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      renderComponent();

      // Fill and submit
      await waitFor(() => {
        const businessNameInput = screen.getByPlaceholderText(/business name/i);
        user.type(businessNameInput, 'Test');
      });

      const submitButton = screen.getByRole('button', { name: /submit|register|create/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(vi.mocked(toast.error)).toHaveBeenCalled();
      });
    });

    it('should show loading state during submission', async () => {
      const user = userEvent.setup();
      renderComponent();

      // Fill form
      await waitFor(() => {
        const businessNameInput = screen.getByPlaceholderText(/business name/i);
        user.type(businessNameInput, 'Test');
      });

      // Mock slow submission
      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 2000)))
          })
        })
      });
      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const submitButton = screen.getByRole('button', { name: /submit|register|create/i });
      await user.click(submitButton);

      // Button should be disabled or show loading
      expect(submitButton).toBeDisabled();
    });

    it('should navigate to dashboard after successful registration', async () => {
      const user = userEvent.setup();
      renderComponent();

      // Fill and submit
      await waitFor(() => {
        const businessNameInput = screen.getByPlaceholderText(/business name/i);
        user.type(businessNameInput, 'Test');
      });

      const submitButton = screen.getByRole('button', { name: /submit|register|create/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('dashboard'));
      });
    });
  });

  describe('Navigation and Back Button', () => {
    it('should allow going back to previous steps', async () => {
      const user = userEvent.setup();
      renderComponent();

      // Navigate forward
      await waitFor(() => {
        const businessNameInput = screen.getByPlaceholderText(/business name/i);
        user.type(businessNameInput, 'Test');
      });

      const nextButton = screen.getByRole('button', { name: /next|continue/i });
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText(/step 2/i)).toBeInTheDocument();
      });

      // Navigate back
      const backButton = screen.getByRole('button', { name: /back|previous/i });
      await user.click(backButton);

      await waitFor(() => {
        expect(screen.getByText(/step 1/i)).toBeInTheDocument();
      });
    });

    it('should preserve form data when navigating back and forth', async () => {
      const user = userEvent.setup();
      renderComponent();

      // Fill step 1
      await waitFor(() => {
        const businessNameInput = screen.getByPlaceholderText(/business name/i);
        user.type(businessNameInput, 'Preserved Name');
      });

      // Go forward and back
      const nextButton = screen.getByRole('button', { name: /next|continue/i });
      await user.click(nextButton);

      const backButton = screen.getByRole('button', { name: /back|previous/i });
      await user.click(backButton);

      // Data should be preserved
      await waitFor(() => {
        const businessNameInput = screen.getByPlaceholderText(/business name/i);
        expect(businessNameInput).toHaveValue('Preserved Name');
      });
    });
  });
});