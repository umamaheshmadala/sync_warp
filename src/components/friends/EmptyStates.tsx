import { Users, UserPlus, SearchX, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '../ui/EmptyState';

export function NoFriendsEmptyState() {
    const navigate = useNavigate();

    return (
        <EmptyState
            icon={<Users className="w-full h-full" />}
            title="No Friends Yet"
            description="Start building your network by finding and adding friends"
            action={{
                label: "Find Friends",
                onClick: () => navigate('/friends/search')
            }}
        />
    );
}

export function NoRequestsEmptyState() {
    return (
        <EmptyState
            icon={<UserPlus className="w-full h-full" />}
            title="No New Requests"
            description="You're all caught up! New friend requests will appear here"
        />
    );
}

export function SearchNoResultsEmptyState({ query }: { query: string }) {
    return (
        <EmptyState
            icon={<SearchX className="w-full h-full" />}
            title="No Results Found"
            description={`We couldn't find anyone matching "${query}". Try different keywords or check spelling.`}
        />
    );
}

export function NoPYMKEmptyState() {
    return (
        <EmptyState
            icon={<User className="w-full h-full" />}
            title="No Suggestions"
            description="Check back later! We'll suggest people you might know as your network grows."
        />
    );
}
