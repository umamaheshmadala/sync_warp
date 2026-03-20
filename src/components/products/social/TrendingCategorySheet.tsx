import { useQuery } from '@tanstack/react-query';
import { trendingService } from '../../../services/trendingService';
import { Drawer as DrawerPrimitive } from 'vaul';
import { Skeleton } from '../../ui/skeleton';
import { useNavigate } from 'react-router-dom';

interface TrendingCategorySheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  l2CategoryId: string | null;
  l2CategoryName: string | null;
  businessId: string;
}

export function TrendingCategorySheet({
  isOpen,
  onOpenChange,
  l2CategoryId,
  l2CategoryName,
  businessId
}: TrendingCategorySheetProps) {
  const navigate = useNavigate();

  const { data: trendingProducts, isLoading } = useQuery({
    queryKey: ['trending_products', l2CategoryId],
    queryFn: () => l2CategoryId ? trendingService.getTrendingProducts(l2CategoryId, 100) : Promise.resolve([]),
    enabled: isOpen && !!l2CategoryId,
    staleTime: 15 * 60 * 1000,
  });

  const handleProductClick = (productBusinessId: string, productId: string) => {
    onOpenChange(false);
    navigate(`/business/${productBusinessId}/product/${productId}`);
  };

  return (
    <DrawerPrimitive.Root open={isOpen} onOpenChange={onOpenChange} shouldScaleBackground>
      <DrawerPrimitive.Portal>
        <DrawerPrimitive.Overlay className="fixed inset-0 z-[200] bg-black/80" />
        <DrawerPrimitive.Content
          className="fixed inset-x-0 bottom-0 z-[200] mt-24 flex max-h-[85vh] flex-col rounded-t-[10px] border bg-white shadow-2xl"
        >
          <div className="mx-auto mt-4 h-2 w-[100px] rounded-full bg-muted" />

          <div className="border-b bg-white sticky top-0 z-10 grid gap-1.5 p-4 text-center sm:text-left">
            <DrawerPrimitive.Title className="text-xl font-semibold leading-none tracking-tight">
              {l2CategoryName ? `Trending in ${l2CategoryName}` : 'Trending Products'}
            </DrawerPrimitive.Title>
          </div>

          <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50">
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 bg-white p-3 rounded-xl border">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-16 w-16 rounded-md" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : trendingProducts?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No trending products found
              </div>
            ) : (
              <div className="space-y-3 pb-8">
                {trendingProducts?.map((p) => (
                  <div
                    key={p.product_id}
                    onClick={() => handleProductClick(p.business_name, p.product_id)}
                    className="flex items-center gap-4 bg-white p-3 rounded-xl border cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
                  >
                    <div className="w-8 text-center font-bold flex flex-col items-center">
                      {p.rank <= 3 ? (
                        <span className="text-xl">
                          {p.rank === 1 ? '🥇' : p.rank === 2 ? '🥈' : '🥉'}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">#{p.rank}</span>
                      )}
                    </div>
                    
                    <div className="h-16 w-16 bg-gray-100 rounded-md overflow-hidden flex-shrink-0 border">
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt={p.product_name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base truncate">{p.product_name}</h3>
                      <p className="text-sm text-muted-foreground truncate">{p.business_name}</p>
                      <p className="text-xs text-muted-foreground/75 truncate">{p.l3_category}</p>
                    </div>
                    
                    <div className="text-xs font-medium text-orange-500 bg-orange-50 px-2 py-1 rounded-full">
                      {p.trending_score} pts
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DrawerPrimitive.Content>
      </DrawerPrimitive.Portal>
    </DrawerPrimitive.Root>
  );
}
