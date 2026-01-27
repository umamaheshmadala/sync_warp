import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, X, ThumbsUp, ThumbsDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReviewFilters } from '@/types/review';

interface EnhancedReviewFiltersProps {
    filters: ReviewFilters;
    onFilterChange: (filters: ReviewFilters) => void;
    withPhotosOnly: boolean;
    onWithPhotosChange: (value: boolean) => void;
    selectedTags: string[];
    onTagsChange: (tags: string[]) => void;
    popularTags: { tag: string; count: number }[];
    photoCount: number;
    totalCount: number;
}

export function EnhancedReviewFilters({
    filters,
    onFilterChange,
    withPhotosOnly,
    onWithPhotosChange,
    selectedTags,
    onTagsChange,
    popularTags,
    photoCount,
    totalCount
}: EnhancedReviewFiltersProps) {

    const updateFilter = (key: keyof ReviewFilters, value: any) => {
        if (typeof value === 'boolean' && filters[key] === value) {
            // Toggle off if same value clicked (mainly for recommendation)
            const newFilters = { ...filters };
            delete newFilters[key];
            onFilterChange(newFilters);
        } else {
            onFilterChange({ ...filters, [key]: value });
        }
    };

    const currentSort = filters.sort_by || 'newest';

    return (
        <div className="w-full">
            {/* Mobile/Desktop Unified Horizontal Scroll Layout */}
            <div className="flex items-center gap-2 overflow-x-auto pb-4 pt-1 no-scrollbar md:flex-wrap md:overflow-visible md:pb-0 scroll-smooth px-1">

                {/* Sort Dropdown - Primary Action */}
                <Select
                    value={currentSort}
                    onValueChange={(val: any) => updateFilter('sort_by', val)}
                >
                    <SelectTrigger className="w-auto h-9 rounded-full border-gray-200 bg-white px-4 text-xs font-medium md:text-sm shadow-sm hover:bg-gray-50 flex-shrink-0">
                        <span className="text-gray-500 mr-1">Sort:</span>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="newest">Newest First</SelectItem>
                        <SelectItem value="oldest">Oldest First</SelectItem>
                        <SelectItem value="most-helpful">Most Helpful</SelectItem>
                    </SelectContent>
                </Select>

                <div className="h-6 w-px bg-gray-200 mx-1 flex-shrink-0" />

                {/* Filter Pills */}
                <Button
                    variant={filters.recommendation === true ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateFilter('recommendation', filters.recommendation === true ? undefined : true)}
                    className={cn(
                        "rounded-full h-9 px-4 text-xs font-medium md:text-sm border-gray-200 shadow-sm flex-shrink-0 transition-all",
                        filters.recommendation === true
                            ? "bg-green-600 hover:bg-green-700 text-white border-transparent ring-2 ring-green-100"
                            : "bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300"
                    )}
                >
                    <ThumbsUp className={cn("w-3.5 h-3.5 mr-1.5", filters.recommendation === true ? "text-white" : "text-green-600")} />
                    Recommended
                </Button>

                <Button
                    variant={filters.recommendation === false ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateFilter('recommendation', filters.recommendation === false ? undefined : false)}
                    className={cn(
                        "rounded-full h-9 px-4 text-xs font-medium md:text-sm border-gray-200 shadow-sm flex-shrink-0 transition-all",
                        filters.recommendation === false
                            ? "bg-red-600 hover:bg-red-700 text-white border-transparent ring-2 ring-red-100"
                            : "bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300"
                    )}
                >
                    <ThumbsDown className={cn("w-3.5 h-3.5 mr-1.5", filters.recommendation === false ? "text-white" : "text-red-600")} />
                    Don't Recommend
                </Button>

                <Button
                    variant={withPhotosOnly ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onWithPhotosChange(!withPhotosOnly)}
                    className={cn(
                        "rounded-full h-9 px-4 text-xs font-medium md:text-sm border-gray-200 shadow-sm flex-shrink-0 transition-all",
                        withPhotosOnly
                            ? "bg-indigo-600 hover:bg-indigo-700 text-white border-transparent ring-2 ring-indigo-100"
                            : "bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300"
                    )}
                >
                    <Camera className={cn("w-3.5 h-3.5 mr-1.5", withPhotosOnly ? "text-white" : "text-indigo-600")} />
                    With Photos
                </Button>

                {/* Popular Tags */}
                {popularTags.slice(0, 5).map(({ tag, count }) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                        <Button
                            key={tag}
                            variant={isSelected ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => {
                                if (isSelected) {
                                    onTagsChange(selectedTags.filter(t => t !== tag));
                                } else {
                                    onTagsChange([...selectedTags, tag]);
                                }
                            }}
                            className={cn(
                                "rounded-full h-9 px-4 text-xs font-medium md:text-sm border-gray-200 shadow-sm flex-shrink-0 transition-all whitespace-nowrap",
                                isSelected
                                    ? "bg-gray-900 text-white hover:bg-gray-800 ring-2 ring-gray-100"
                                    : "bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                            )}
                        >
                            {tag} <span className={cn("ml-1.5 opacity-60 text-[10px]", isSelected ? "text-white" : "text-gray-400")}>{count}</span>
                        </Button>
                    );
                })}

                {/* Clear Button - Shows only when filters are active */}
                {(withPhotosOnly || selectedTags.length > 0 || filters.recommendation !== undefined) && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            onWithPhotosChange(false);
                            onTagsChange([]);
                            const resetFilters = { sort_by: currentSort };
                            onFilterChange(resetFilters);
                        }}
                        className="h-9 px-3 text-xs text-muted-foreground hover:text-gray-900 flex-shrink-0 ml-auto md:ml-0"
                    >
                        <X className="w-4 h-4 mr-1" />
                        Clear
                    </Button>
                )}
            </div>
        </div>
    );
}
