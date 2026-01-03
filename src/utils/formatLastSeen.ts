/**
 * Format last active timestamp into human-readable text
 * Story 9.3.1: Friends List Component
 */

export function formatLastSeen(lastActive?: string | null): string {
  if (!lastActive) return 'Active a while ago';

  const now = new Date();
  const last = new Date(lastActive);
  const diff = now.getTime() - last.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Active just now';
  if (minutes < 60) return `Active ${minutes}m ago`;
  if (hours < 24) return `Active ${hours}h ago`;
  if (days === 1) return 'Active yesterday';
  if (days < 7) return `Active ${days}d ago`;
  return 'Active a while ago';
}
