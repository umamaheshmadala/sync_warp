// src/components/analytics/ShareCount.tsx
// Simple share count badge component
// Story 4.9 - Phase 4: Analytics & Desktop UX

import React, { useState, useEffect } from 'react';
import { Share2 } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { getShareCount } from '../../services/shareTracker';
import { cn } from '../../lib/utils';

export interface ShareCountProps {
  /** Entity ID to count shares for */
  entityId: string;
  /** Entity type */
  entityType: 'storefront' | 'product' | 'offer' | 'coupon';
  /** Show icon */
  showIcon?: boolean;
  /** Badge variant */
  variant?: 'default' | 'secondary' | 'outline' | 'destructive';
  /** Additional CSS classes */
  className?: string;
  /** Callback when clicked */
  onClick?: () => void;
}

/**
 * Display share count as a badge
 * 
 * @example
 * ```tsx
 * <ShareCount
 *   entityId={product.id}
 *   entityType="product"
 *   showIcon
 *   onClick={() => console.log('View shares')}
 * />
 * ```
 */
export function ShareCount({
  entityId,
  entityType,
  showIcon = true,
  variant = 'secondary',
  className,
  onClick
}: ShareCountProps) {
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        setLoading(true);
        const total = await getShareCount(entityId, entityType);
        setCount(total);
      } catch (err) {
        console.error('Failed to fetch share count:', err);
        setCount(0);
      } finally {
        setLoading(false);
      }
    };

    if (entityId) {
      fetchCount();
    }
  }, [entityId, entityType]);

  if (loading) {
    return <Skeleton className="h-5 w-16" />;
  }

  if (count === 0) {
    return null; // Don't show if no shares
  }

  return (
    <Badge
      variant={variant}
      className={cn(
        'flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity',
        className
      )}
      onClick={onClick}
    >
      {showIcon && <Share2 className="h-3 w-3" />}
      <span>{count} {count === 1 ? 'share' : 'shares'}</span>
    </Badge>
  );
}

export default ShareCount;
