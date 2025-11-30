import { format, formatDistanceToNow, isToday, isYesterday, isSameYear } from 'date-fns'

/**
 * Parse a date string from the database (Supabase)
 * Ensures that strings without timezone information are treated as UTC
 */
export const parseDatabaseDate = (dateString: string | null | undefined): Date | null => {
  if (!dateString) return null
  
  // If string has no timezone indicator (Z or +), assume UTC and append Z
  // This fixes the issue where "YYYY-MM-DD HH:mm:ss" is parsed as local time
  if (!dateString.endsWith('Z') && !dateString.includes('+')) {
    return new Date(dateString + 'Z')
  }
  
  return new Date(dateString)
}

/**
 * Format a date for message bubbles (e.g., "10:30 AM")
 */
export const formatMessageTime = (dateString: string): string => {
  const date = parseDatabaseDate(dateString)
  if (!date) return ''
  
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

/**
 * Format a date for conversation list (e.g., "10:30 AM", "Yesterday", "Nov 24")
 */
export const formatConversationDate = (dateString: string | null | undefined): string => {
  const date = parseDatabaseDate(dateString)
  if (!date) return ''
  
  if (isToday(date)) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }
  
  if (isYesterday(date)) {
    return 'Yesterday'
  }
  
  if (isSameYear(date, new Date())) {
    return format(date, 'MMM d') // "Nov 24"
  }
  
  return format(date, 'MMM d, yyyy') // "Nov 24, 2024"
}

/**
 * Get relative time string (e.g., "5 minutes ago")
 */
export const formatRelativeTime = (dateString: string): string => {
  const date = parseDatabaseDate(dateString)
  if (!date) return ''
  
  return formatDistanceToNow(date, { addSuffix: true })
}
