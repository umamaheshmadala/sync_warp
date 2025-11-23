import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserPlus, SearchX, Sparkles } from 'lucide-react';
import { EmptyState } from '../ui/EmptyState';

export function NoFriendsEmptyState() {
    const navigate = useNavigate();

    return (
        <EmptyState
            icon={Users}
            title="No Friends Yet"
            description="Start building your network by finding and adding friends to your circle."
            action={{
                label: "Find Friends",
                onClick: () => navigate('/friends/search')
            }}
            iconBgClass="bg-blue-50"
            iconColorClass="text-blue-500"
        />
    );
}

export function NoRequestsEmptyState() {
    return (
        <EmptyState
            icon={UserPlus}
            title="No New Requests"
            description="You're all caught up! New friend requests will appear here when people add you."
            iconBgClass="bg-green-50"
            iconColorClass="text-green-500"
        />
    );
}

export function SearchNoResultsEmptyState({ query }: { query: string }) {
    return (
        <EmptyState
            icon={SearchX}
            title="No Results Found"
            description={`We couldn't find anyone matching "${query}". Try different keywords or check the spelling.`}
            iconBgClass="bg-gray-50"
            iconColorClass="text-gray-400"
        />
    );
}

export function NoPYMKEmptyState() {
    return (
        <EmptyState
            icon={Sparkles}
            title="No Suggestions"
            description="Check back later! We'll suggest people you might know as your network grows."
            iconBgClass="bg-purple-50"
            iconColorClass="text-purple-500"
        />
    );
}
