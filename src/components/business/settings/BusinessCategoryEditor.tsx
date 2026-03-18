import React, { useState, useEffect } from 'react';
import { Tag, Loader, AlertCircle, Check, ChevronRight, ChevronDown } from 'lucide-react';
import { BusinessCategoryService } from '../../../services/businessCategoryService';
import { ProductCategory } from '../../../types/product';

interface BusinessCategoryEditorProps {
  selectedCategoryIds: string[];
  onChange: (categoryIds: string[]) => void;
}

export const BusinessCategoryEditor: React.FC<BusinessCategoryEditorProps> = ({
  selectedCategoryIds,
  onChange
}) => {
  const [loading, setLoading] = useState(true);
  const [hierarchy, setHierarchy] = useState<(ProductCategory & { subcategories: ProductCategory[] })[]>([]);
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHierarchy();
  }, []);

  const loadHierarchy = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await BusinessCategoryService.getSelectableHierarchy();
      setHierarchy(data);
    } catch (err: any) {
      console.error('Error loading taxonomy hierarchy:', err);
      setError(err.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const toggleParent = (parentId: string) => {
    setExpandedParents(prev => {
      const next = new Set(prev);
      if (next.has(parentId)) next.delete(parentId);
      else next.add(parentId);
      return next;
    });
  };

  const toggleCategory = (categoryId: string) => {
    const nextIds = new Set(selectedCategoryIds);
    if (nextIds.has(categoryId)) {
      nextIds.delete(categoryId);
    } else {
      nextIds.add(categoryId);
    }
    onChange(Array.from(nextIds));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-red-600">{error}</p>
        <button 
          onClick={loadHierarchy}
          className="ml-auto text-sm text-red-700 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Tag className="w-5 h-5 text-indigo-600" />
          <h3 className="text-md font-semibold text-gray-900">Select Product Categories</h3>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Expand groups below to pick categories that fit your business. Selecting accurate categories boosts your visibility in trending feeds.
        </p>
      </div>
      
      <div className="divide-y divide-gray-100">
        {hierarchy.map((parent) => {
          const isExpanded = expandedParents.has(parent.id);
          const hasSelectedChildren = parent.subcategories.some(child => selectedCategoryIds.includes(child.id));
          
          return (
            <div key={parent.id} className="w-full">
              {/* Parent Row */}
              <button
                type="button"
                onClick={() => toggleParent(parent.id)}
                className={`w-full flex items-center justify-between p-4 transition-colors hover:bg-gray-50
                  ${hasSelectedChildren ? 'bg-indigo-50/30' : ''}
                `}
              >
                <div className="flex items-center gap-3">
                  <div className={`
                    w-10 h-10 rounded-lg flex items-center justify-center font-medium
                    ${hasSelectedChildren ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'}
                  `}>
                    {parent.name.charAt(0)}
                  </div>
                  <div className="text-left">
                    <h3 className={`font-medium ${hasSelectedChildren ? 'text-indigo-900' : 'text-gray-900'}`}>
                      {parent.name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {parent.subcategories.length} subcategories
                    </p>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {/* Children Rows */}
              {isExpanded && (
                <div className="bg-gray-50 px-4 py-3 space-y-2 border-t border-gray-100 shadow-inner">
                  {parent.subcategories.map(child => {
                    const isSelected = selectedCategoryIds.includes(child.id);
                    return (
                      <button
                        type="button"
                        key={child.id}
                        onClick={() => toggleCategory(child.id)}
                        className={`
                          w-full flex items-center justify-between p-3 rounded-lg transition-all
                          ${isSelected 
                            ? 'bg-white border-2 border-indigo-500 shadow-sm' 
                            : 'bg-white border-2 border-transparent shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:border-gray-300'}
                        `}
                      >
                        <span className={`text-sm ${isSelected ? 'text-indigo-900 font-medium' : 'text-gray-700'}`}>
                          {child.name}
                        </span>
                        <div className={`
                          w-5 h-5 rounded flex items-center justify-center border transition-colors
                          ${isSelected
                            ? 'bg-indigo-600 border-indigo-600'
                            : 'border-gray-300 bg-white'}
                        `}>
                          {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
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

