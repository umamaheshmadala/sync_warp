/**
 * Format last active timestamp into human-readable text
 * Story 9.3.1: Friends List Component
 */

export function formatLastSeen(lastActive?: string | null): string {
  if (!lastActive) return 'Last seen a while ago';
  
  const now = new Date();
  const last = new Date(lastActive);
  const diff = now.getTime() - last.getTime();
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `Active ${minutes}m ago`;
  if (hours < 24) return `Last seen ${hours}h ago`;
  if (days === 1) return 'Last seen yesterday';
  if (days < 7) return `Last seen ${days}d ago`;
  return 'Last seen a while ago';
}
