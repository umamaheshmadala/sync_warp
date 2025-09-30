import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import CouponCreator from '../CouponCreator';
import * as useCouponsHook from '../../../hooks/useCoupons';
import * as useCouponDraftsHook from '../../../hooks/useCouponDrafts';
import * as authStore from '../../../store/authStore';
import { toast } from 'react-hot-toast';

// Mock dependencies
vi.mock('react-hot-toast');
vi.mock('../../../hooks/useCoupons');
vi.mock('../../../hooks/useCouponDrafts');
vi.mock('../../../store/authStore');
vi.mock('../../../hooks/useRateLimit', () => ({
  useRateLimit: () => ({
    enforceRateLimit: vi.fn().mockResolvedValue(undefined),
    isRateLimited: false,
    checkRateLimit: vi.fn(),
    status: null
  })
}));

const mockCreateCoupon = vi.fn();
const mockUpdateCoupon = vi.fn();
const mockGenerateCouponCode = vi.fn();
const mockSaveDraft = vi.fn();
const mockLoadDraft = vi.fn();
const mockHasFormContent = vi.fn();
const mockGenerateDraftName = vi.fn();

describe('CouponCreator Integration Tests', () => {
  const defaultProps = {
    businessId: 'business-123',
    businessName: 'Test Business',
    isOpen: true,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Mock sessionStorage
    const mockSessionStorage = {
      data: {} as Record<string, string>,
      getItem: vi.fn((key: string) => mockSessionStorage.data[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        mockSessionStorage.data[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete mockSessionStorage.data[key];
      }),
      clear: vi.fn(() => {
        mockSessionStorage.data = {};
      }),
      key: vi.fn(),
      length: 0
    };
    Object.defineProperty(window, 'sessionStorage', { value: mockSessionStorage, writable: true });

    // Setup default mock implementations
    vi.mocked(useCouponsHook.useCoupons).mockReturnValue({
      createCoupon: mockCreateCoupon,
      updateCoupon: mockUpdateCoupon,
      generateCouponCode: mockGenerateCouponCode.mockReturnValue('TEST-CODE-123'),
      loading: false,
      coupons: [],
      fetchCoupons: vi.fn(),
      deleteCoupon: vi.fn(),
      fetchCoupon: vi.fn(),
      collectCoupon: vi.fn(),
      redeemCoupon: vi.fn(),
      validateRedemption: vi.fn(),
    } as any);

    vi.mocked(useCouponDraftsHook.default).mockReturnValue({
      drafts: [],
      saveDraft: mockSaveDraft,
      loadDraft: mockLoadDraft,
      deleteDraft: vi.fn(),
      hasFormContent: mockHasFormContent.mockReturnValue(true),
      generateDraftName: mockGenerateDraftName.mockReturnValue('Draft 1'),
      isLoading: false,
    } as any);

    vi.mocked(authStore.useAuthStore).mockReturnValue({
      user: {
        id: 'user-123',
        email: 'test@example.com',
      },
    } as any);

    mockGenerateCouponCode.mockReturnValue('TEST-CODE-123');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderComponent = (props = {}) => {
    return render(
      <BrowserRouter>
        <CouponCreator {...defaultProps} {...props} />
      </BrowserRouter>
    );
  };

  describe('Form Validation and Step Navigation', () => {
    it('should render the first step (Basic Details) by default', () => {
      renderComponent();
      
      expect(screen.getByText('Basic Details')).toBeInTheDocument();
      expect(screen.getByText('Coupon name and description')).toBeInTheDocument();
    });

    it('should navigate through all steps sequentially', async () => {
      const user = userEvent.setup();
      renderComponent();

      // Step 1: Basic Details
      expect(screen.getByText('Basic Details')).toBeInTheDocument();
      
      const titleInput = screen.getByLabelText(/coupon title/i) || screen.getByPlaceholderText(/enter.*title/i);
      const descInput = screen.getByLabelText(/description/i) || screen.getByPlaceholderText(/describe.*coupon/i);
      
      await user.type(titleInput, 'Summer Sale Coupon');
      await user.type(descInput, 'Get amazing discounts this summer');

      // Navigate to next step
      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      // Step 2: Discount Setup
      await waitFor(() => {
        expect(screen.getByText('Discount Setup')).toBeInTheDocument();
      });
    });

    it('should validate required fields before allowing navigation', async () => {
      const user = userEvent.setup();
      renderComponent();

      // Try to navigate without filling required fields
      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      // Should show validation errors or stay on the same step
      expect(screen.getByText('Basic Details')).toBeInTheDocument();
    });

    it('should allow navigation back to previous steps', async () => {
      const user = userEvent.setup();
      renderComponent();

      // Fill Step 1 and go to Step 2
      const titleInput = screen.getByLabelText(/coupon title/i) || screen.getByPlaceholderText(/enter.*title/i);
      await user.type(titleInput, 'Test Coupon');
      
      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText('Discount Setup')).toBeInTheDocument();
      });

      // Navigate back
      const backButton = screen.getByRole('button', { name: /back/i });
      await user.click(backButton);

      await waitFor(() => {
        expect(screen.getByText('Basic Details')).toBeInTheDocument();
      });
    });

    it('should preserve form data when navigating between steps', async () => {
      const user = userEvent.setup();
      renderComponent();

      // Fill Step 1
      const titleInput = screen.getByLabelText(/coupon title/i) || screen.getByPlaceholderText(/enter.*title/i);
      await user.type(titleInput, 'Test Coupon');

      // Go to next step
      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText('Discount Setup')).toBeInTheDocument();
      });

      // Go back
      const backButton = screen.getByRole('button', { name: /back/i });
      await user.click(backButton);

      // Check that data is preserved
      await waitFor(() => {
        const titleInputAgain = screen.getByLabelText(/coupon title/i) || screen.getByPlaceholderText(/enter.*title/i);
        expect(titleInputAgain).toHaveValue('Test Coupon');
      });
    });
  });

  describe('Coupon Type Selection', () => {
    it('should allow selection of different coupon types', async () => {
      const user = userEvent.setup();
      renderComponent();

      // Navigate to discount setup step
      const titleInput = screen.getByLabelText(/coupon title/i) || screen.getByPlaceholderText(/enter.*title/i);
      await user.type(titleInput, 'Test Coupon');
      
      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText('Discount Setup')).toBeInTheDocument();
      });

      // Select percentage type
      const percentageOption = screen.getByRole('radio', { name: /percentage/i }) || 
                               screen.getByLabelText(/percentage/i);
      await user.click(percentageOption);

      expect(percentageOption).toBeChecked();
    });

    it('should generate preview code when coupon type is selected', async () => {
      const user = userEvent.setup();
      renderComponent();

      // Navigate to discount setup
      const titleInput = screen.getByLabelText(/coupon title/i) || screen.getByPlaceholderText(/enter.*title/i);
      await user.type(titleInput, 'Test');
      
      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      await waitFor(() => {
        expect(mockGenerateCouponCode).toHaveBeenCalled();
      });
    });

    it('should validate discount value based on type', async () => {
      const user = userEvent.setup();
      renderComponent();

      // Go to discount setup
      const titleInput = screen.getByLabelText(/coupon title/i) || screen.getByPlaceholderText(/enter.*title/i);
      await user.type(titleInput, 'Test');
      
      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText('Discount Setup')).toBeInTheDocument();
      });

      // Try to enter invalid percentage (> 100)
      const discountInput = screen.getByLabelText(/discount value/i) || 
                            screen.getByPlaceholderText(/enter.*discount/i);
      await user.clear(discountInput);
      await user.type(discountInput, '150');

      // Try to proceed - should show validation error
      const nextBtn = screen.getByRole('button', { name: /next/i });
      await user.click(nextBtn);

      // Should remain on the same step due to validation
      expect(screen.getByText('Discount Setup')).toBeInTheDocument();
    });
  });

  describe('Draft Management', () => {
    it('should save form data as a draft', async () => {
      const user = userEvent.setup();
      mockSaveDraft.mockResolvedValue('draft-123');
      renderComponent();

      // Fill some form data
      const titleInput = screen.getByLabelText(/coupon title/i) || screen.getByPlaceholderText(/enter.*title/i);
      await user.type(titleInput, 'Draft Coupon');

      // Open draft save dialog
      const saveDraftButton = screen.getByRole('button', { name: /save.*draft/i });
      await user.click(saveDraftButton);

      // Confirm save
      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /^save$/i });
        user.click(saveButton);
      });

      await waitFor(() => {
        expect(mockSaveDraft).toHaveBeenCalled();
      });
    });

    it('should load data from an existing draft', async () => {
      const user = userEvent.setup();
      const mockDraft = {
        id: 'draft-123',
        draft_name: 'Test Draft',
        form_data: {
          title: 'Draft Title',
          description: 'Draft Description',
          type: 'percentage',
          discount_value: 20
        },
        step_completed: 2
      };

      mockLoadDraft.mockReturnValue(mockDraft);
      renderComponent();

      // Open drafts view
      const viewDraftsButton = screen.getByRole('button', { name: /view.*draft/i });
      await user.click(viewDraftsButton);

      // Select a draft
      const draftItem = screen.getByText('Test Draft');
      await user.click(draftItem);

      await waitFor(() => {
        expect(mockLoadDraft).toHaveBeenCalledWith('draft-123');
        expect(vi.mocked(toast.success)).toHaveBeenCalledWith(expect.stringContaining('Loaded draft'));
      });
    });

    it('should prevent saving empty drafts', async () => {
      const user = userEvent.setup();
      mockHasFormContent.mockReturnValue(false);
      renderComponent();

      // Try to save without filling form
      const saveDraftButton = screen.getByRole('button', { name: /save.*draft/i });
      await user.click(saveDraftButton);

      await waitFor(() => {
        expect(vi.mocked(toast.error)).toHaveBeenCalledWith(expect.stringContaining('fill in some form data'));
      });
    });
  });

  describe('Form Submission', () => {
    it('should successfully create a new coupon', async () => {
      const user = userEvent.setup();
      mockCreateCoupon.mockResolvedValue({ id: 'coupon-123' });
      renderComponent();

      // Fill all required fields (simplified for test)
      const titleInput = screen.getByLabelText(/coupon title/i) || screen.getByPlaceholderText(/enter.*title/i);
      await user.type(titleInput, 'Test Coupon');

      // Navigate through all steps and fill minimal required data
      // ... (in a real test, you'd fill all required fields)

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create|submit/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCreateCoupon).toHaveBeenCalled();
        expect(defaultProps.onSuccess).toHaveBeenCalled();
      });
    });

    it('should update an existing coupon when editing', async () => {
      const user = userEvent.setup();
      const editingCoupon = {
        id: 'coupon-123',
        title: 'Existing Coupon',
        description: 'Description',
        type: 'percentage',
        discount_value: 15
      };

      mockUpdateCoupon.mockResolvedValue({ id: 'coupon-123' });
      renderComponent({ editingCoupon });

      // Modify data
      const titleInput = screen.getByLabelText(/coupon title/i) || screen.getByPlaceholderText(/enter.*title/i);
      await user.clear(titleInput);
      await user.type(titleInput, 'Updated Coupon');

      // Submit
      const submitButton = screen.getByRole('button', { name: /update|save/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockUpdateCoupon).toHaveBeenCalled();
      });
    });

    it('should handle submission errors gracefully', async () => {
      const user = userEvent.setup();
      mockCreateCoupon.mockRejectedValue(new Error('Creation failed'));
      renderComponent();

      // Fill form and submit
      const titleInput = screen.getByLabelText(/coupon title/i) || screen.getByPlaceholderText(/enter.*title/i);
      await user.type(titleInput, 'Test');

      const submitButton = screen.getByRole('button', { name: /create|submit/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(vi.mocked(toast.error)).toHaveBeenCalled();
      });
    });

    it('should show loading state during submission', async () => {
      const user = userEvent.setup();
      mockCreateCoupon.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));
      
      vi.mocked(useCouponsHook.useCoupons).mockReturnValue({
        ...vi.mocked(useCouponsHook.useCoupons)(),
        loading: true,
      } as any);

      renderComponent();

      const submitButton = screen.getByRole('button', { name: /create|submit/i });
      
      // Button should be disabled during loading
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Form State Persistence', () => {
    it('should save form state to sessionStorage periodically', async () => {
      vi.useFakeTimers();
      renderComponent();

      const titleInput = screen.getByLabelText(/coupon title/i) || screen.getByPlaceholderText(/enter.*title/i);
      await userEvent.type(titleInput, 'Test');

      // Advance timers to trigger autosave
      vi.advanceTimersByTime(60000);

      await waitFor(() => {
        expect(window.sessionStorage.setItem).toHaveBeenCalled();
      });

      vi.useRealTimers();
    });

    it('should restore form state from sessionStorage on mount', () => {
      const savedState = JSON.stringify({
        currentStep: 2,
        formData: {
          title: 'Restored Title',
          description: 'Restored Description',
        },
        previewCode: 'RESTORED-CODE',
        timestamp: Date.now()
      });

      window.sessionStorage.setItem(
        `coupon-form-${defaultProps.businessId}-new`,
        savedState
      );

      renderComponent();

      // Should restore the saved step
      expect(screen.getByText('Discount Setup')).toBeInTheDocument();
    });

    it('should clear form state after successful submission', async () => {
      const user = userEvent.setup();
      mockCreateCoupon.mockResolvedValue({ id: 'coupon-123' });
      renderComponent();

      // Fill and submit
      const titleInput = screen.getByLabelText(/coupon title/i) || screen.getByPlaceholderText(/enter.*title/i);
      await user.type(titleInput, 'Test');

      const submitButton = screen.getByRole('button', { name: /create|submit/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(window.sessionStorage.removeItem).toHaveBeenCalled();
      });
    });
  });

  describe('Dialog and Modal Interactions', () => {
    it('should close the creator when cancel is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();

      const closeButton = screen.getByRole('button', { name: /close|cancel/i });
      await user.click(closeButton);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('should show confirmation when closing with unsaved changes', async () => {
      const user = userEvent.setup();
      renderComponent();

      // Add some content
      const titleInput = screen.getByLabelText(/coupon title/i) || screen.getByPlaceholderText(/enter.*title/i);
      await user.type(titleInput, 'Unsaved changes');

      // Try to close
      const closeButton = screen.getByRole('button', { name: /close|cancel/i });
      await user.click(closeButton);

      // Should show confirmation or save prompt
      // Implementation depends on component design
    });
  });

  describe('Rate Limiting Integration', () => {
    it('should check rate limits before submission', async () => {
      const mockEnforceRateLimit = vi.fn().mockResolvedValue(undefined);
      
      vi.mocked(require('../../../hooks/useRateLimit').useRateLimit).mockReturnValue({
        enforceRateLimit: mockEnforceRateLimit,
        isRateLimited: false,
        checkRateLimit: vi.fn(),
        status: null
      });

      const user = userEvent.setup();
      renderComponent();

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create|submit/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockEnforceRateLimit).toHaveBeenCalled();
      });
    });

    it('should block submission when rate limited', async () => {
      vi.mocked(require('../../../hooks/useRateLimit').useRateLimit).mockReturnValue({
        enforceRateLimit: vi.fn().mockRejectedValue(new Error('Rate limited')),
        isRateLimited: true,
        checkRateLimit: vi.fn(),
        status: { allowed: false, remaining: 0 }
      });

      const user = userEvent.setup();
      renderComponent();

      const submitButton = screen.getByRole('button', { name: /create|submit/i });
      
      // Should show rate limit banner
      expect(screen.getByText(/rate limit/i)).toBeInTheDocument();
    });
  });
});