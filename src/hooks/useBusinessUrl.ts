// src/hooks/useBusinessUrl.ts
// Hook for generating and navigating to business URLs with human-readable slugs
import { useNavigate } from 'react-router-dom'
import { createBusinessSlug } from '../utils/slugUtils'

export function useBusinessUrl() {
  const navigate = useNavigate()

  /**
   * Generate business URL with slug
   * @param businessId - UUID of the business
   * @param businessName - Name of the business (optional)
   * @returns URL path like /business/coffee-shop-ac269130 or /business/ac269130
   */
  const getBusinessUrl = (businessId: string, businessName?: string): string => {
    if (!businessId) {
      console.warn('getBusinessUrl called with empty businessId');
      return '/business';
    }
    
    if (!businessName) {
      // Fallback to short ID only
      const shortId = businessId.slice(0, 8);
      return `/business/${shortId}`;
    }
    
    const slug = createBusinessSlug(businessName, businessId);
    return `/business/${slug}`;
  }

  /**
   * Navigate to business page with slug
   */
  const navigateToBusiness = (businessId: string, businessName: string) => {
    const url = getBusinessUrl(businessId, businessName)
    navigate(url)
  }

  return {
    getBusinessUrl,
    navigateToBusiness
  }
}
