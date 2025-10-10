/**
 * CampaignCard Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../../test/utils';
import { CampaignCard } from '../CampaignCard';
import { mockCampaign, createMockCampaign } from '../../../test/mocks/data';

describe('CampaignCard', () => {
  it('renders campaign information correctly', () => {
    render(<CampaignCard campaign={mockCampaign} />);
    
    expect(screen.getByText('Test Campaign')).toBeInTheDocument();
    expect(screen.getByText(mockCampaign.status)).toBeInTheDocument();
    expect(screen.getByText(mockCampaign.ad_format)).toBeInTheDocument();
  });

  it('displays budget and target impressions', () => {
    render(<CampaignCard campaign={mockCampaign} />);
    
    expect(screen.getByText('$10,000')).toBeInTheDocument();
    expect(screen.getByText('50.0K')).toBeInTheDocument();
  });

  it('shows status badge with correct color', () => {
    const { rerender } = render(<CampaignCard campaign={mockCampaign} />);
    
    // Active campaign - green badge
    expect(screen.getByText('active')).toHaveClass('bg-green-100');
    
    // Paused campaign - yellow badge
    const pausedCampaign = createMockCampaign({ status: 'paused' });
    rerender(<CampaignCard campaign={pausedCampaign} />);
    expect(screen.getByText('paused')).toHaveClass('bg-yellow-100');
  });

  it('calls onView when View Details is clicked', () => {
    const handleView = vi.fn();
    render(<CampaignCard campaign={mockCampaign} onView={handleView} />);
    
    const viewButton = screen.getByText('View Details');
    fireEvent.click(viewButton);
    
    expect(handleView).toHaveBeenCalledWith(mockCampaign);
    expect(handleView).toHaveBeenCalledTimes(1);
  });

  it('calls onEdit when Edit button is clicked', () => {
    const handleEdit = vi.fn();
    render(<CampaignCard campaign={mockCampaign} onEdit={handleEdit} />);
    
    const editButton = screen.getByTitle('Edit');
    fireEvent.click(editButton);
    
    expect(handleEdit).toHaveBeenCalledWith(mockCampaign);
  });

  it('shows pause button for active campaigns', () => {
    const handlePause = vi.fn();
    render(<CampaignCard campaign={mockCampaign} onPause={handlePause} />);
    
    const pauseButton = screen.getByTitle('Pause');
    expect(pauseButton).toBeInTheDocument();
    
    fireEvent.click(pauseButton);
    expect(handlePause).toHaveBeenCalledWith(mockCampaign);
  });

  it('shows resume button for paused campaigns', () => {
    const pausedCampaign = createMockCampaign({ status: 'paused' });
    const handleResume = vi.fn();
    
    render(<CampaignCard campaign={pausedCampaign} onResume={handleResume} />);
    
    const resumeButton = screen.getByTitle('Resume');
    expect(resumeButton).toBeInTheDocument();
    
    fireEvent.click(resumeButton);
    expect(handleResume).toHaveBeenCalledWith(pausedCampaign);
  });

  it('shows delete button when onDelete is provided', () => {
    const handleDelete = vi.fn();
    render(<CampaignCard campaign={mockCampaign} onDelete={handleDelete} />);
    
    const deleteButton = screen.getByTitle('Delete');
    expect(deleteButton).toBeInTheDocument();
    
    fireEvent.click(deleteButton);
    expect(handleDelete).toHaveBeenCalledWith(mockCampaign);
  });

  it('displays loading overlay when isLoading is true', () => {
    const { container } = render(<CampaignCard campaign={mockCampaign} isLoading={true} />);
    
    const loadingOverlay = container.querySelector('.animate-spin');
    expect(loadingOverlay).toBeInTheDocument();
  });

  it('shows progress bar for active campaigns', () => {
    render(<CampaignCard campaign={mockCampaign} />);
    
    expect(screen.getByText('Campaign Progress')).toBeInTheDocument();
  });

  it('does not show progress bar for draft campaigns', () => {
    const draftCampaign = createMockCampaign({ status: 'draft' });
    render(<CampaignCard campaign={draftCampaign} />);
    
    expect(screen.queryByText('Campaign Progress')).not.toBeInTheDocument();
  });

  it('formats dates correctly', () => {
    render(<CampaignCard campaign={mockCampaign} />);
    
    // Check that dates are displayed (text is split across elements)
    expect(screen.getByText('Jan 1, 2024')).toBeInTheDocument();
  });

  it('shows description when provided', () => {
    render(<CampaignCard campaign={mockCampaign} />);
    
    expect(screen.getByText('This is a test campaign')).toBeInTheDocument();
  });

  it('handles campaigns without description', () => {
    const campaignWithoutDesc = createMockCampaign({ description: '' });
    render(<CampaignCard campaign={campaignWithoutDesc} />);
    
    expect(screen.queryByText('This is a test campaign')).not.toBeInTheDocument();
  });

  it('disables buttons when isLoading is true', () => {
    const handleView = vi.fn();
    render(<CampaignCard campaign={mockCampaign} onView={handleView} isLoading={true} />);
    
    const viewButton = screen.getByText('View Details');
    expect(viewButton).toBeDisabled();
  });
});
