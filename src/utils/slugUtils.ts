// src/utils/slugUtils.ts
// Utility functions for creating URL-friendly slugs for businesses
// Following LinkedIn/Facebook pattern: business-name-shortid

/**
 * Convert text to URL-friendly slug
 * Example: "Urban Coffee Roasters" -> "urban-coffee-roasters"
 */
export function createSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Create business slug with short ID for uniqueness
 * Example: "Urban Coffee" + "ac269130-cfb0..." -> "urban-coffee-ac269130"
 */
export function createBusinessSlug(businessName: string, businessId: string): string {
  const slug = createSlug(businessName);
  const shortId = businessId.slice(0, 8); // First 8 chars of UUID
  return `${slug}-${shortId}`;
}

/**
 * Extract business ID from slug
 * Example: "urban-coffee-ac269130" -> "ac269130"
 */
export function extractIdFromSlug(slug: string): string | null {
  // Slug format: "business-name-shortid"
  const parts = slug.split('-');
  if (parts.length === 0) return null;
  
  // Last part should be the 8-char ID
  const lastPart = parts[parts.length - 1];
  if (lastPart.length === 8 && /^[a-f0-9]{8}$/i.test(lastPart)) {
    return lastPart;
  }
  
  // Fallback: treat entire slug as potential UUID
  if (/^[a-f0-9-]{36}$/i.test(slug)) {
    return slug; // Full UUID
  }
  
  return null;
}

/**
 * Find full business ID from short ID (requires database lookup)
 */
export async function findBusinessByShortId(shortId: string): Promise<string | null> {
  // This would typically query the database
  // For now, return null - implement in service layer
  return null;
}

/**
 * Parse business slug or UUID
 * Returns the ID that can be used for database queries
 */
export function parseBusinessIdentifier(identifier: string): string {
  // If it's a full UUID, return as-is
  if (/^[a-f0-9-]{36}$/i.test(identifier)) {
    return identifier;
  }
  
  // If it's a slug, extract the short ID
  const shortId = extractIdFromSlug(identifier);
  return shortId || identifier;
}

/**
 * Get full business URL
 * Example: "Urban Coffee", "ac269130..." -> "/business/urban-coffee-ac269130"
 */
export function getBusinessUrl(businessId: string, businessName: string): string {
  const slug = createBusinessSlug(businessName, businessId);
  return `/business/${slug}`;
}
