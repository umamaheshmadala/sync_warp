import React, { useState, useEffect } from 'react';
import { Check, ChevronRight, ChevronDown, Award } from 'lucide-react';
import { BusinessCategoryService } from '../../../services/businessCategoryService';
import { ProductCategory } from '../../../types/product';

interface BusinessCategorySettings {
  categories: string[];
}

interface ProductCategoryStepProps {
  initialData?: BusinessCategorySettings;
  onUpdate: (data: BusinessCategorySettings) => void;
  isLoading?: boolean;
}

export const ProductCategoryStep: React.FC<ProductCategoryStepProps> = ({
  initialData,
  onUpdate,
  isLoading = false
}) => {
  const [hierarchy, setHierarchy] = useState<(ProductCategory & { subcategories: ProductCategory[] })[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initialData?.categories || []));
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHierarchy();
  }, []);

  const loadHierarchy = async () => {
    try {
      setIsFetching(true);
      const data = await BusinessCategoryService.getSelectableHierarchy();
      setHierarchy(data);
    } catch (err) {
      console.error('Failed to load categories', err);
      setError('Could not load categories. Please try again.');
    } finally {
      setIsFetching(false);
    }
  };

  const toggleParent = (parentId: string) => {
    setExpandedParents(prev => {
      const next = new Set(prev);
      if (next.has(parentId)) {
        next.delete(parentId);
      } else {
        next.add(parentId);
      }
      return next;
    });
  };

  const toggleCategory = (categoryId: string) => {
    const nextIds = new Set(selectedIds);
    if (nextIds.has(categoryId)) {
      nextIds.delete(categoryId);
    } else {
      nextIds.add(categoryId);
    }
    setSelectedIds(nextIds);
    onUpdate({ categories: Array.from(nextIds) });
  };

  // When initial data updates from props (e.g. going back/forward)
  useEffect(() => {
    if (initialData?.categories) {
      setSelectedIds(new Set(initialData.categories));
    }
  }, [initialData?.categories]);

  if (isFetching || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1DB954]"></div>
        <p className="text-gray-400">Loading product categories...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
        <p className="text-red-400">{error}</p>
        <button 
          onClick={loadHierarchy}
          className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-md transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Award className="w-6 h-6 text-[#1DB954]" />
          Product Categories
        </h2>
        <p className="text-gray-400">
          Select the types of products your business offers. This helps us accurately categorize your business and products for users. Select as many as apply to your main operations.
        </p>
      </div>

      <div className="bg-black/20 border border-white/5 rounded-xl overflow-hidden divide-y divide-white/5">
        {hierarchy.map((parent) => {
          const isExpanded = expandedParents.has(parent.id);
          const hasSelectedChildren = parent.subcategories.some(child => selectedIds.has(child.id));
          
          return (
            <div key={parent.id} className="w-full">
              {/* Parent Row */}
              <button
                onClick={() => toggleParent(parent.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`
                    w-10 h-10 rounded-lg flex items-center justify-center
                    ${hasSelectedChildren ? 'bg-[#1DB954]/20 text-[#1DB954]' : 'bg-white/5 text-gray-400'}
                  `}>
                    {/* Placeholder for icon if available, or just first letter */}
                    {parent.name.charAt(0)}
                  </div>
                  <div className="text-left">
                    <h3 className={`font-medium ${hasSelectedChildren ? 'text-white' : 'text-gray-300'}`}>
                      {parent.name}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {parent.subcategories.length} subcategories
                    </p>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                )}
              </button>

              {/* Children Rows */}
              {isExpanded && (
                <div className="bg-black/40 px-4 py-2 space-y-1">
                  {parent.subcategories.map(child => {
                    const isSelected = selectedIds.has(child.id);
                    return (
                      <button
                        key={child.id}
                        onClick={() => toggleCategory(child.id)}
                        className={`
                          w-full flex items-center justify-between p-3 rounded-lg transition-colors
                          ${isSelected 
                            ? 'bg-[#1DB954]/10 border border-[#1DB954]/20 text-white' 
                            : 'hover:bg-white/5 text-gray-400 border border-transparent'}
                        `}
                      >
                        <span>{child.name}</span>
                        <div className={`
                          w-5 h-5 rounded flex items-center justify-center border
                          ${isSelected
                            ? 'bg-[#1DB954] border-[#1DB954]'
                            : 'border-gray-600 bg-transparent'}
                        `}>
                          {isSelected && <Check className="w-3.5 h-3.5 text-black" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
