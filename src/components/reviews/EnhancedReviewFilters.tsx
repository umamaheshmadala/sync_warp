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
        <div className="space-y-4 bg-white p-4 rounded-xl border border-gray-200">
            {/* Top row: Filters and Sort */}
            <div className="flex flex-wrap gap-3 items-center justify-between">
                <div className="flex gap-2">
                    <Button
                        variant={filters.recommendation === undefined ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                            const newFilters = { ...filters };
                            delete newFilters.recommendation;
                            onFilterChange(newFilters);
                        }}
                        className="rounded-full"
                    >
                        All ({totalCount})
                    </Button>
                    <Button
                        variant={filters.recommendation === true ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => updateFilter('recommendation', true)}
                        className={cn(
                            "rounded-full gap-1.5",
                            filters.recommendation === true ? "bg-green-600 hover:bg-green-700" : "text-green-700 border-green-200 hover:bg-green-50"
                        )}
                    >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        Recommend
                    </Button>
                    <Button
                        variant={filters.recommendation === false ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => updateFilter('recommendation', false)}
                        className={cn(
                            "rounded-full gap-1.5",
                            filters.recommendation === false ? "bg-red-600 hover:bg-red-700" : "text-red-700 border-red-200 hover:bg-red-50"
                        )}
                    >
                        <ThumbsDown className="w-3.5 h-3.5" />
                        Don't Recommend
                    </Button>
                </div>

                <Select
                    value={currentSort}
                    onValueChange={(val: any) => updateFilter('sort_by', val)}
                >
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="newest">Newest First</SelectItem>
                        <SelectItem value="oldest">Oldest First</SelectItem>
                        <SelectItem value="most-helpful">Most Helpful</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Second row: Photo filter and tags */}
            <div className="flex flex-wrap gap-2 items-center pt-2 border-t border-gray-100">
                {/* With Photos toggle */}
                <Button
                    variant={withPhotosOnly ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => onWithPhotosChange(!withPhotosOnly)}
                    className={cn(
                        "gap-1.5 rounded-full border-dashed",
                        withPhotosOnly && "bg-indigo-100 text-indigo-700 border-indigo-200"
                    )}
                >
                    <Camera className="w-3.5 h-3.5" />
                    With Photos <span className="ml-1 text-xs opacity-70">({photoCount})</span>
                </Button>

                <div className="h-4 w-px bg-gray-200 mx-1" />

                {/* Popular tags */}
                <div className="flex flex-wrap gap-2">
                    {popularTags.slice(0, 5).map(({ tag, count }) => {
                        const isSelected = selectedTags.includes(tag);
                        return (
                            <Button
                                key={tag}
                                variant={isSelected ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => {
                                    if (isSelected) {
                                        onTagsChange(selectedTags.filter(t => t !== tag));
                                    } else {
                                        onTagsChange([...selectedTags, tag]);
                                    }
                                }}
                                className={cn(
                                    "text-xs h-7 rounded-full",
                                    isSelected
                                        ? "bg-gray-900 text-white hover:bg-gray-800"
                                        : "text-gray-600 bg-gray-50 hover:bg-gray-100"
                                )}
                            >
                                {tag} <span className="ml-1 opacity-60">({count})</span>
                                {isSelected && <X className="ml-1 w-3 h-3" />}
                            </Button>
                        );
                    })}
                </div>

                {/* Clear filters */}
                {(withPhotosOnly || selectedTags.length > 0 || filters.recommendation !== undefined) && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            onWithPhotosChange(false);
                            onTagsChange([]);
                            const resetFilters = { sort_by: currentSort }; // Keep sort
                            onFilterChange(resetFilters);
                        }}
                        className="text-muted-foreground ml-auto text-xs h-7"
                    >
                        <X className="w-3.5 h-3.5 mr-1" />
                        Clear
                    </Button>
                )}
            </div>
        </div>
    );
}
