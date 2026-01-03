import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { friendsService } from '../../services/friendsService';
import { useDebounce } from '../useDebounce';

export function useFriendSearch(initialQuery = '') {
    const [query, setQuery] = useState(initialQuery);
    const debouncedQuery = useDebounce(query, 300);

    const { data, isLoading, error } = useQuery({
        queryKey: ['friendSearch', debouncedQuery],
        queryFn: () => friendsService.searchMyFriends(debouncedQuery),
        enabled: debouncedQuery.length > 0,
    });

    return {
        query,
        setQuery,
        results: data?.data || [],
        isLoading,
        error,
    };
}
