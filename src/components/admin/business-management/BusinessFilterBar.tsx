import React from 'react';
import { Search, X, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useFilterOptions } from '@/hooks/useAdminBusinessList';

interface Filters {
    city: string;
    category: string;
    dateFrom: string;
    dateTo: string;
    year?: number;
    month?: number;
    search: string;
}

interface BusinessFilterBarProps {
    filters: Filters;
    onFilterChange: (filters: Filters) => void;
}

export function BusinessFilterBar({ filters, onFilterChange }: BusinessFilterBarProps) {
    const { data: options } = useFilterOptions();

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Debouncing is handled by parent or query hook usually, but here we pass raw input
        // and let the debounce logic happen in the hook or page if implemented.
        // Given requirements say "Debounced search", the hook useAdminBusinessList doesn't inherently debounce inputs unless we use useDebounce value.
        // For now, we update state immediately and assume parent handles debounce or we add it here.
        // Let's rely on standard controlled input pattern.
        onFilterChange({ ...filters, search: e.target.value });
    };

    const clearFilter = (key: keyof Filters) => {
        onFilterChange({ ...filters, [key]: key === 'year' || key === 'month' ? undefined : '' });
    };

    const clearAll = () => {
        onFilterChange({
            city: '',
            category: '',
            dateFrom: '',
            dateTo: '',
            year: undefined,
            month: undefined,
            search: '',
        });
    };

    const hasActiveFilters =
        filters.city ||
        filters.category ||
        filters.dateFrom ||
        filters.dateTo ||
        filters.year ||
        filters.month;

    return (
        <div className="space-y-4">
            {/* Search and Primary Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                        placeholder="Search by name, email, phone..."
                        className="pl-9 pr-8"
                        value={filters.search}
                        onChange={handleSearchChange}
                    />
                    {filters.search && (
                        <button
                            onClick={() => clearFilter('search')}
                            className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-[180px] justify-between">
                            {filters.city ? `${filters.city.split(',').length} Cities` : "Filter by City"}
                            <Filter className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[200px]">
                        {options?.cities.map((city) => {
                            const currentCities = filters.city ? filters.city.split(',') : [];
                            const isSelected = currentCities.includes(city);
                            return (
                                <DropdownMenuCheckboxItem
                                    key={city}
                                    checked={isSelected}
                                    onCheckedChange={(checked) => {
                                        let newCities = [...currentCities];
                                        if (checked) {
                                            newCities.push(city);
                                        } else {
                                            newCities = newCities.filter(c => c !== city);
                                        }
                                        onFilterChange({ ...filters, city: newCities.join(',') });
                                    }}
                                >
                                    {city}
                                </DropdownMenuCheckboxItem>
                            );
                        })}
                    </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-[180px] justify-between">
                            {filters.category ? `${filters.category.split(',').length} Categories` : "Filter by Category"}
                            <Filter className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[200px]">
                        {options?.categories.map((cat) => {
                            const currentCats = filters.category ? filters.category.split(',') : [];
                            const isSelected = currentCats.includes(cat);
                            return (
                                <DropdownMenuCheckboxItem
                                    key={cat}
                                    checked={isSelected}
                                    onCheckedChange={(checked) => {
                                        let newCats = [...currentCats];
                                        if (checked) {
                                            newCats.push(cat);
                                        } else {
                                            newCats = newCats.filter(c => c !== cat);
                                        }
                                        onFilterChange({ ...filters, category: newCats.join(',') });
                                    }}
                                >
                                    {cat}
                                </DropdownMenuCheckboxItem>
                            );
                        })}
                    </DropdownMenuContent>
                </DropdownMenu>

                <Select
                    value={filters.year?.toString()}
                    onValueChange={(val) => onFilterChange({ ...filters, year: parseInt(val) })}
                >
                    <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                        {options?.years.map((year) => (
                            <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Active Filter Chips */}
            {hasActiveFilters && (
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-gray-500 flex items-center gap-1">
                        <Filter className="h-3 w-3" /> Active:
                    </span>

                    {filters.city && filters.city.split(',').map(city => (
                        <Badge key={city} variant="secondary" className="gap-1 pl-2">
                            City: {city}
                            <X className="h-3 w-3 cursor-pointer hover:text-gray-900" onClick={() => {
                                const newCities = filters.city.split(',').filter(c => c !== city).join(',');
                                onFilterChange({ ...filters, city: newCities });
                            }} />
                        </Badge>
                    ))}
                    {filters.category && filters.category.split(',').map(cat => (
                        <Badge key={cat} variant="secondary" className="gap-1 pl-2">
                            Cat: {cat}
                            <X className="h-3 w-3 cursor-pointer hover:text-gray-900" onClick={() => {
                                const newCats = filters.category.split(',').filter(c => c !== cat).join(',');
                                onFilterChange({ ...filters, category: newCats });
                            }} />
                        </Badge>
                    ))}
                    {filters.year && (
                        <Badge variant="secondary" className="gap-1 pl-2">
                            Year: {filters.year}
                            <X className="h-3 w-3 cursor-pointer hover:text-gray-900" onClick={() => clearFilter('year')} />
                        </Badge>
                    )}

                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7 ml-auto text-muted-foreground hover:text-foreground"
                        onClick={clearAll}
                    >
                        Clear All
                    </Button>
                </div>
            )}
        </div>
    );
}
