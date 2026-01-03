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
 * Format a date for message bubbles following industry standards (WhatsApp/Telegram pattern)
 * - Today: Time only (e.g., "2:30 PM")
 * - Yesterday: "Yesterday"
 * - This week: Day name (e.g., "Monday")
 * - This year: Date without year (e.g., "Nov 28")
 * - Older: Full date with year (e.g., "Dec 15, 2023")
 */
export const formatMessageTime = (dateString: string): string => {
  const date = parseDatabaseDate(dateString)
  if (!date) return ''
  
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  
  const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  
  // Today: Show time only
  if (messageDate.getTime() === today.getTime()) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }
  
  // Yesterday
  if (messageDate.getTime() === yesterday.getTime()) {
    const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    return `Yesterday, ${time}`
  }
  
  // This week (last 7 days): Show day name and time
  const daysDiff = Math.floor((today.getTime() - messageDate.getTime()) / (1000 * 60 * 60 * 24))
  if (daysDiff < 7 && daysDiff > 0) {
    const dayName = date.toLocaleDateString([], { weekday: 'long' })
    const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    return `${dayName}, ${time}`
  }
  
  // This year: Show date without year
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }
  
  // Older: Show full date with year
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
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
