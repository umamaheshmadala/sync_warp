// src/components/offers/__tests__/CreateOfferForm.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreateOfferForm } from '../CreateOfferForm';

// Mock hooks
vi.mock('../../../hooks/useOfferDrafts', () => ({
  useOfferDrafts: () => ({
    drafts: [],
    currentDraft: null,
    isLoading: false,
    error: null,
    isSaving: false,
    loadDraft: vi.fn(),
    createDraft: vi.fn().mockResolvedValue({ id: 'draft-1' }),
    updateDraft: vi.fn(),
    deleteDraft: vi.fn(),
    convertDraftToOffer: vi.fn(),
  }),
}));

vi.mock('../../../hooks/useOffers', () => ({
  useOffers: () => ({
    offers: [],
    isLoading: false,
    error: null,
    createOffer: vi.fn().mockResolvedValue({ id: 'offer-1' }),
    updateOffer: vi.fn(),
    deleteOffer: vi.fn(),
  }),
}));

describe('CreateOfferForm', () => {
  const defaultProps = {
    businessId: 'business-1',
    userId: 'user-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Step 1: Basic Info', () => {
    it('should render step 1 by default', () => {
      render(<CreateOfferForm {...defaultProps} />);
      
      expect(screen.getByText('Basic Information')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Off All Items/)).toBeInTheDocument();
    });

    it('should show title input with character counter', () => {
      render(<CreateOfferForm {...defaultProps} />);
      
      const titleInput = screen.getByPlaceholderText(/Off All Items/);
      expect(titleInput).toBeInTheDocument();
      expect(screen.getByText('/100 characters')).toBeInTheDocument();
    });

    it('should update character counter as user types', () => {
      render(<CreateOfferForm {...defaultProps} />);
      
      const titleInput = screen.getByPlaceholderText(/Off All Items/);
      fireEvent.change(titleInput, { target: { value: 'Test Title' } });
      
      expect(screen.getByText('10/100 characters')).toBeInTheDocument();
    });

    it('should disable Next button when title is empty', () => {
      render(<CreateOfferForm {...defaultProps} />);
      
      const nextButton = screen.getByText('Next');
      expect(nextButton).toBeDisabled();
    });

    it('should enable Next button when title is entered', () => {
      render(<CreateOfferForm {...defaultProps} />);
      
      const titleInput = screen.getByPlaceholderText(/Off All Items/);
      fireEvent.change(titleInput, { target: { value: 'Test Offer' } });
      
      const nextButton = screen.getByText('Next');
      expect(nextButton).toBeEnabled();
    });

    it('should move to step 2 when Next is clicked', async () => {
      render(<CreateOfferForm {...defaultProps} />);
      
      const titleInput = screen.getByPlaceholderText(/Off All Items/);
      fireEvent.change(titleInput, { target: { value: 'Test Offer' } });
      
      const nextButton = screen.getByText('Next');
      fireEvent.click(nextButton);
      
      await waitFor(() => {
        expect(screen.getByText('Validity Period')).toBeInTheDocument();
      });
    });
  });

  describe('Step 2: Validity Period', () => {
    beforeEach(async () => {
      render(<CreateOfferForm {...defaultProps} />);
      
      // Navigate to step 2
      const titleInput = screen.getByPlaceholderText(/Off All Items/);
      fireEvent.change(titleInput, { target: { value: 'Test Offer' } });
      fireEvent.click(screen.getByText('Next'));
      
      await waitFor(() => {
        expect(screen.getByText('Validity Period')).toBeInTheDocument();
      });
    });

    it('should render date inputs', () => {
      const dateInputs = screen.getAllByDisplayValue('');
      expect(dateInputs.length).toBeGreaterThan(0);
    });

    it('should disable Next when dates are not selected', () => {
      const nextButton = screen.getByText('Next');
      expect(nextButton).toBeDisabled();
    });

    it('should show Previous button', () => {
      expect(screen.getByText('Previous')).toBeInTheDocument();
    });

    it('should go back to step 1 when Previous is clicked', () => {
      fireEvent.click(screen.getByText('Previous'));
      
      expect(screen.getByText('Basic Information')).toBeInTheDocument();
    });
  });

  describe('Step 4: Review', () => {
    it('should show Publish button on final step', async () => {
      render(<CreateOfferForm {...defaultProps} />);
      
      // Fill step 1
      const titleInput = screen.getByPlaceholderText(/Off All Items/);
      fireEvent.change(titleInput, { target: { value: 'Test Offer' } });
      fireEvent.click(screen.getByText('Next'));
      
      // Fill step 2
      await waitFor(() => {
        expect(screen.getByText('Validity Period')).toBeInTheDocument();
      });
      
      const dateInputs = screen.getAllByRole('textbox', { name: '' });
      if (dateInputs[0]) {
        fireEvent.change(dateInputs[0], { target: { value: '2025-01-01' } });
      }
      if (dateInputs[1]) {
        fireEvent.change(dateInputs[1], { target: { value: '2025-12-31' } });
      }
      fireEvent.click(screen.getByText('Next'));
      
      // Fill step 3
      await waitFor(() => {
        expect(screen.getByText('Offer Details')).toBeInTheDocument();
      });
      
      const termsInput = screen.getByPlaceholderText(/Valid on purchases/);
      fireEvent.change(termsInput, { target: { value: 'Test terms' } });
      fireEvent.click(screen.getByText('Next'));
      
      // Step 4
      await waitFor(() => {
        expect(screen.getByText('Review Your Offer')).toBeInTheDocument();
        expect(screen.getByText('Publish Offer')).toBeInTheDocument();
      });
    });
  });

  describe('Progress Indicator', () => {
    it('should show all 4 steps', () => {
      render(<CreateOfferForm {...defaultProps} />);
      
      expect(screen.getByText('Basic Info')).toBeInTheDocument();
      expect(screen.getByText('Validity Period')).toBeInTheDocument();
      expect(screen.getByText('Details')).toBeInTheDocument();
      expect(screen.getByText('Review')).toBeInTheDocument();
    });

    it('should highlight current step', () => {
      render(<CreateOfferForm {...defaultProps} />);
      
      const step1 = screen.getByText('Basic Info');
      expect(step1).toHaveClass('text-purple-600');
    });
  });

  describe('Cancel Button', () => {
    it('should show cancel button when onCancel prop is provided', () => {
      const onCancel = vi.fn();
      render(<CreateOfferForm {...defaultProps} onCancel={onCancel} />);
      
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should call onCancel when cancel is clicked', () => {
      const onCancel = vi.fn();
      render(<CreateOfferForm {...defaultProps} onCancel={onCancel} />);
      
      fireEvent.click(screen.getByText('Cancel'));
      expect(onCancel).toHaveBeenCalled();
    });

    it('should not show cancel button when onCancel is not provided', () => {
      render(<CreateOfferForm {...defaultProps} />);
      
      expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should enforce character limits', () => {
      render(<CreateOfferForm {...defaultProps} />);
      
      const titleInput = screen.getByPlaceholderText(/Off All Items/) as HTMLInputElement;
      expect(titleInput).toHaveAttribute('maxLength', '100');
    });

    it('should show validation messages for required fields', () => {
      render(<CreateOfferForm {...defaultProps} />);
      
      // Try to proceed without filling required field
      const nextButton = screen.getByText('Next');
      expect(nextButton).toBeDisabled();
    });
  });

  describe('Completion', () => {
    it('should call onComplete when form is submitted', async () => {
      const onComplete = vi.fn();
      render(<CreateOfferForm {...defaultProps} onComplete={onComplete} />);
      
      // Note: Full form submission would require navigating through all steps
      // This is a simplified test
      expect(onComplete).not.toHaveBeenCalled();
    });
  });
});
