import { useState } from 'react';
import { useProductTrending } from '../../../hooks/useProductTrending';
import { Flame } from 'lucide-react';
import { Button } from '../../ui/button';
import { TrendingCategorySheet } from './TrendingCategorySheet';

interface TrendingButtonProps {
  productId: string;
  businessId: string;
  variant?: 'default' | 'action-bar' | 'web-action-bar';
}

export function TrendingButton({ productId, businessId, variant = 'default' }: TrendingButtonProps) {
  const { data: trendingData, isLoading } = useProductTrending(productId);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  if (isLoading) {
    if (variant === 'action-bar' || variant === 'web-action-bar') {
      const size = variant === 'action-bar' ? 28 : 24;
      return (
        <button disabled className={`flex ${variant === 'action-bar' ? 'flex-col items-center gap-1 p-1' : 'items-center gap-1.5 min-w-[40px]'} opacity-50`}>
          <Flame size={size} className="text-gray-900" strokeWidth={1.5} />
          <span className={`${variant === 'action-bar' ? 'text-xs' : 'text-sm'} font-medium text-gray-900`}>...</span>
        </button>
      );
    }
    return (
      <Button variant="outline" size="sm" disabled className="h-8 shadow-sm">
        <span className="animate-pulse">🔥 Loading...</span>
      </Button>
    );
  }

  // If no category is found or rank is null, display fallback neutral state but disabled
  if (!trendingData?.rank) {
    if (variant === 'action-bar' || variant === 'web-action-bar') {
      const size = variant === 'action-bar' ? 28 : 24;
      return (
        <button disabled className={`flex ${variant === 'action-bar' ? 'flex-col items-center gap-1 p-1' : 'items-center gap-1.5 min-w-[40px]'} opacity-50`}>
          <Flame size={size} className="text-gray-900" strokeWidth={1.5} />
          <span className={`${variant === 'action-bar' ? 'text-xs' : 'text-sm'} font-medium text-gray-900`}>Trending</span>
        </button>
      );
    }
    return (
      <Button variant="outline" size="sm" disabled className="h-8 shadow-sm text-muted-foreground">
        🔥 —
      </Button>
    );
  }

  return (
    <>
      {variant === 'action-bar' || variant === 'web-action-bar' ? (
        <button 
          onClick={() => setIsSheetOpen(true)}
          className={`group flex ${variant === 'action-bar' ? 'flex-col items-center gap-1 p-1' : 'items-center gap-1.5 min-w-[40px]'}`}
        >
          <Flame size={variant === 'action-bar' ? 28 : 24} className="text-orange-500 group-hover:text-orange-600 transition-colors" strokeWidth={1.5} />
          <span className={`${variant === 'action-bar' ? 'text-xs' : 'text-sm'} font-medium text-gray-900`}>#{trendingData.rank}</span>
        </button>
      ) : (
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setIsSheetOpen(true)}
          className="h-8 shadow-sm hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-colors"
        >
          <span className="mr-1 text-orange-500">🔥</span>
          <span className="font-medium">#{trendingData.rank}</span>
        </Button>
      )}
      
      <TrendingCategorySheet
        isOpen={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        l2CategoryId={trendingData.l2_category_id}
        l2CategoryName={trendingData.l2_category_name}
        businessId={businessId}
      />
    </>
  );
}
