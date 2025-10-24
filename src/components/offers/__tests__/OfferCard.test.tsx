// src/components/offers/__tests__/OfferCard.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { OfferCard } from '../OfferCard';
import type { Offer } from '../../../types/offers';

const mockOffer: Offer = {
  id: '1',
  business_id: 'business-1',
  title: 'Test Offer',
  description: 'Test description',
  terms_conditions: 'Test terms',
  valid_from: '2025-01-01',
  valid_until: '2025-12-31',
  created_at: '2025-01-01T00:00:00Z',
  status: 'active',
  offer_code: 'TEST001',
  icon_image_url: 'https://example.com/icon.png',
  view_count: 100,
  share_count: 50,
  click_count: 25,
  created_by: 'user-1',
  updated_at: null,
  activated_at: '2025-01-01T00:00:00Z',
  expired_at: null,
};

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('OfferCard', () => {
  it('should render offer title and description', () => {
    renderWithRouter(<OfferCard offer={mockOffer} />);
    
    expect(screen.getByText('Test Offer')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('should display offer code', () => {
    renderWithRouter(<OfferCard offer={mockOffer} />);
    
    expect(screen.getByText('TEST001')).toBeInTheDocument();
  });

  it('should show status badge', () => {
    renderWithRouter(<OfferCard offer={mockOffer} />);
    
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('should display stats when showStats is true', () => {
    renderWithRouter(<OfferCard offer={mockOffer} showStats={true} />);
    
    expect(screen.getByText('100')).toBeInTheDocument(); // views
    expect(screen.getByText('50')).toBeInTheDocument(); // shares
    expect(screen.getByText('25')).toBeInTheDocument(); // clicks
  });

  it('should hide stats when showStats is false', () => {
    renderWithRouter(<OfferCard offer={mockOffer} showStats={false} />);
    
    expect(screen.queryByText('Views')).not.toBeInTheDocument();
  });

  it('should display validity dates', () => {
    renderWithRouter(<OfferCard offer={mockOffer} />);
    
    expect(screen.getByText(/Jan 1, 2025/)).toBeInTheDocument();
    expect(screen.getByText(/Dec 31, 2025/)).toBeInTheDocument();
  });

  it('should show icon image when provided', () => {
    renderWithRouter(<OfferCard offer={mockOffer} />);
    
    const img = screen.getByAltText('Test Offer');
    expect(img).toHaveAttribute('src', 'https://example.com/icon.png');
  });

  it('should call onShare when share button is clicked', () => {
    const onShare = vi.fn();
    renderWithRouter(<OfferCard offer={mockOffer} onShare={onShare} />);
    
    const shareButton = screen.getByText('Share');
    fireEvent.click(shareButton);
    
    expect(onShare).toHaveBeenCalledWith(mockOffer);
  });

  it('should show actions menu when showActions is true', () => {
    renderWithRouter(
      <OfferCard 
        offer={mockOffer}
        showActions={true}
        onEdit={vi.fn()}
      />
    );
    
    // Actions menu button should be visible
    const menuButton = screen.getByRole('button', { name: /more/i });
    expect(menuButton).toBeInTheDocument();
  });

  it('should open actions menu on click', () => {
    const onEdit = vi.fn();
    renderWithRouter(
      <OfferCard 
        offer={mockOffer}
        showActions={true}
        onEdit={onEdit}
      />
    );
    
    // Click menu button
    const menuButton = screen.getAllByRole('button')[1]; // Second button is menu
    fireEvent.click(menuButton);
    
    // Menu items should appear
    expect(screen.getByText('Edit')).toBeInTheDocument();
  });

  it('should call onEdit when edit is clicked', () => {
    const onEdit = vi.fn();
    renderWithRouter(
      <OfferCard 
        offer={mockOffer}
        showActions={true}
        onEdit={onEdit}
      />
    );
    
    // Open menu and click edit
    const menuButton = screen.getAllByRole('button')[1];
    fireEvent.click(menuButton);
    
    const editButton = screen.getByText('Edit');
    fireEvent.click(editButton);
    
    expect(onEdit).toHaveBeenCalledWith(mockOffer);
  });

  it('should show activate option for non-active offers', () => {
    const draftOffer = { ...mockOffer, status: 'draft' as const };
    const onActivate = vi.fn();
    
    renderWithRouter(
      <OfferCard 
        offer={draftOffer}
        showActions={true}
        onActivate={onActivate}
      />
    );
    
    // Open menu
    const menuButton = screen.getAllByRole('button')[1];
    fireEvent.click(menuButton);
    
    expect(screen.getByText('Activate')).toBeInTheDocument();
  });

  it('should show pause option for active offers', () => {
    const onPause = vi.fn();
    
    renderWithRouter(
      <OfferCard 
        offer={mockOffer}
        showActions={true}
        onPause={onPause}
      />
    );
    
    // Open menu
    const menuButton = screen.getAllByRole('button')[1];
    fireEvent.click(menuButton);
    
    expect(screen.getByText('Pause')).toBeInTheDocument();
  });

  it('should show expired indicator for past offers', () => {
    const expiredOffer = {
      ...mockOffer,
      valid_until: '2020-01-01',
      status: 'expired' as const,
    };
    
    renderWithRouter(<OfferCard offer={expiredOffer} />);
    
    expect(screen.getByText('Expired')).toBeInTheDocument();
  });

  it('should render different status badges correctly', () => {
    const statuses = ['draft', 'active', 'paused', 'expired', 'archived'] as const;
    
    statuses.forEach((status) => {
      const testOffer = { ...mockOffer, status };
      const { unmount } = renderWithRouter(<OfferCard offer={testOffer} />);
      
      const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
      expect(screen.getByText(statusLabel)).toBeInTheDocument();
      
      unmount();
    });
  });
});
