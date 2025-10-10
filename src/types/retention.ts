// src/types/retention.ts
// TypeScript types for Data Retention System (Story 4B.8)

export type RetentionDataType =
  | 'search_analytics'
  | 'user_activities'
  | 'notifications'
  | 'ad_impressions'
  | 'coupon_analytics'
  | 'session_logs'
  | 'media_processing_logs';

export type RetentionOverrideStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export type RetentionAuditAction =
  | 'archive'
  | 'delete'
  | 'override_approved'
  | 'override_rejected'
  | 'warning_sent';

export type RetentionWarningLevel = 1 | 2 | 3; // 1=7 days, 2=3 days, 3=1 day

export interface DataRetentionPolicy {
  id: string;
  data_type: RetentionDataType;
  retention_days: number;
  description?: string;
  is_active: boolean;
  override_allowed: boolean;
  grace_period_days: number;
  created_at: string;
  updated_at: string;
}

export interface RetentionWarning {
  id: string;
  policy_id: string;
  entity_type: string;
  entity_id: string;
  record_count: number;
  warning_level: RetentionWarningLevel;
  scheduled_deletion_date: string; // ISO date string
  notification_sent: boolean;
  notification_sent_at?: string;
  created_at: string;
}

export interface RetentionOverrideRequest {
  id: string;
  policy_id: string;
  requested_by: string;
  business_id?: string;
  entity_type: string;
  entity_ids: string[];
  reason: string;
  extended_retention_days: number;
  status: RetentionOverrideStatus;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface RetentionArchive {
  id: string;
  policy_id: string;
  entity_type: string;
  original_data: Record<string, any>;
  archived_at: string;
  scheduled_permanent_deletion_at: string;
  permanently_deleted: boolean;
  permanently_deleted_at?: string;
}

export interface RetentionAuditLog {
  id: string;
  policy_id?: string;
  action: RetentionAuditAction;
  entity_type: string;
  affected_count: number;
  details: Record<string, any>;
  performed_by?: string;
  performed_at: string;
}

export interface RetentionEligibilityCheck {
  should_warn: boolean;
  should_archive: boolean;
  should_delete: boolean;
  warning_level: number;
  scheduled_deletion_date?: string;
}

export interface RetentionDashboardStats {
  active_policies: number;
  pending_warnings: number;
  pending_overrides: number;
  archived_records: number;
  policies_by_type: Record<RetentionDataType, DataRetentionPolicy>;
}

export interface RetentionWarningWithPolicy extends RetentionWarning {
  policy: DataRetentionPolicy;
}

export interface RetentionOverrideWithPolicy extends RetentionOverrideRequest {
  policy: DataRetentionPolicy;
}

// Helper to get warning level description
export function getWarningLevelDescription(level: RetentionWarningLevel): string {
  switch (level) {
    case 1:
      return '7 days until deletion';
    case 2:
      return '3 days until deletion';
    case 3:
      return '1 day until deletion - URGENT';
    default:
      return 'Unknown warning level';
  }
}

// Helper to get warning level color
export function getWarningLevelColor(level: RetentionWarningLevel): string {
  switch (level) {
    case 1:
      return 'yellow';
    case 2:
      return 'orange';
    case 3:
      return 'red';
    default:
      return 'gray';
  }
}

// Helper to format days remaining
export function formatDaysRemaining(scheduledDate: string): string {
  const now = new Date();
  const scheduled = new Date(scheduledDate);
  const diffMs = scheduled.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'Overdue';
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  return `${diffDays} days`;
}

// Helper to check if override is still valid
export function isOverrideActive(override: RetentionOverrideRequest): boolean {
  if (override.status !== 'approved') return false;
  if (!override.expires_at) return true;
  return new Date(override.expires_at) > new Date();
}

// Helper to get retention period description
export function getRetentionPeriodDescription(days: number): string {
  if (days < 30) return `${days} days`;
  if (days < 365) return `${Math.floor(days / 30)} months`;
  return `${Math.floor(days / 365)} year${days >= 730 ? 's' : ''}`;
}
