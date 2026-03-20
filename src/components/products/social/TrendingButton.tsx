import { useState } from 'react';
import { useProductTrending } from '../../../hooks/useProductTrending';
import { Button } from '../../ui/button';
import { TrendingCategorySheet } from './TrendingCategorySheet';

interface TrendingButtonProps {
  productId: string;
  businessId: string;
}

export function TrendingButton({ productId, businessId }: TrendingButtonProps) {
  const { data: trendingData, isLoading } = useProductTrending(productId);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  if (isLoading) {
    return (
      <Button variant="outline" size="sm" disabled className="h-8 shadow-sm">
        <span className="animate-pulse">🔥 Loading...</span>
      </Button>
    );
  }

  // If no category is found or rank is null, display fallback neutral state but disabled
  if (!trendingData?.rank) {
    return (
      <Button variant="outline" size="sm" disabled className="h-8 shadow-sm text-muted-foreground">
        🔥 —
      </Button>
    );
  }

  return (
    <>
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => setIsSheetOpen(true)}
        className="h-8 shadow-sm hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-colors"
      >
        <span className="mr-1 text-orange-500">🔥</span>
        <span className="font-medium">#{trendingData.rank}</span>
      </Button>
      
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
