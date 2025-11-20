import { useState } from 'react';
import { MapPin, Users, Circle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface SearchFilters {
    location?: string;
    hasMutualFriends?: boolean;
    isOnline?: boolean;
}

interface SearchFilterChipsProps {
    filters: SearchFilters;
    onFilterChange: (filters: SearchFilters) => void;
    availableCities?: string[]; // Dynamic cities from search results
}

export function SearchFilterChips({
    filters,
    onFilterChange,
    availableCities = []
}: SearchFilterChipsProps) {
    const [showLocationMenu, setShowLocationMenu] = useState(false);

    const removeFilter = (key: keyof SearchFilters) => {
        const newFilters = { ...filters };
        delete newFilters[key];
        onFilterChange(newFilters);
    };

    const toggleMutualFriends = () => {
        if (filters.hasMutualFriends) {
            removeFilter('hasMutualFriends');
        } else {
            onFilterChange({
                ...filters,
                hasMutualFriends: true,
            });
        }
    };

    const toggleOnline = () => {
        if (filters.isOnline) {
            removeFilter('isOnline');
        } else {
            onFilterChange({
                ...filters,
                isOnline: true,
            });
        }
    };

    const setLocation = (location: string) => {
        onFilterChange({
            ...filters,
            location,
        });
        setShowLocationMenu(false);
    };

    const hasActiveFilters = Object.keys(filters).length > 0;

    return (
        <div className="flex flex-wrap gap-2 mt-3">
            {/* Location Filter - Only show if there are cities available */}
            {availableCities.length > 0 && (
                filters.location ? (
                    <div className="inline-flex items-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-0">
                        <DropdownMenu open={showLocationMenu} onOpenChange={setShowLocationMenu}>
                            <DropdownMenuTrigger asChild>
                                <button className="flex items-center gap-2 px-3 h-full hover:bg-white/10 rounded-l-md outline-none">
                                    <MapPin className="w-4 h-4" />
                                    {filters.location}
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                {availableCities.map((city) => (
                                    <DropdownMenuItem
                                        key={city}
                                        onClick={() => setLocation(city)}
                                        className={filters.location === city ? 'bg-primary-50' : ''}
                                    >
                                        {city}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <div className="w-[1px] h-4 bg-primary-foreground/20" />
                        <button
                            onClick={() => removeFilter('location')}
                            className="px-2 h-full hover:bg-white/10 rounded-r-md flex items-center justify-center outline-none"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                ) : (
                    <DropdownMenu open={showLocationMenu} onOpenChange={setShowLocationMenu}>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-2"
                            >
                                <MapPin className="w-4 h-4" />
                                Location
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            {availableCities.map((city) => (
                                <DropdownMenuItem
                                    key={city}
                                    onClick={() => setLocation(city)}
                                >
                                    {city}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )
            )}

            {/* Mutual Friends Filter */}
            <Button
                variant={filters.hasMutualFriends ? 'default' : 'outline'}
                size="sm"
                className="gap-2"
                onClick={toggleMutualFriends}
            >
                <Users className="w-4 h-4" />
                Mutual Friends
                {filters.hasMutualFriends && (
                    <X className="w-3 h-3 ml-1" />
                )}
            </Button>

            {/* Online Status Filter */}
            <Button
                variant={filters.isOnline ? 'default' : 'outline'}
                size="sm"
                className="gap-2"
                onClick={toggleOnline}
            >
                <Circle className={`w-4 h-4 ${filters.isOnline ? 'fill-green-500 text-green-500' : ''}`} />
                Online Now
                {filters.isOnline && (
                    <X className="w-3 h-3 ml-1" />
                )}
            </Button>

            {/* Clear All Filters */}
            {hasActiveFilters && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onFilterChange({})}
                    className="text-gray-600 hover:text-gray-900"
                >
                    Clear all
                </Button>
            )}
        </div>
    );
}
