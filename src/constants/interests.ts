import { Utensils, ShoppingBag, Coffee, Car, Home, Heart, Music, Star } from 'lucide-react';

export const INTEREST_CATEGORIES = [
    {
        id: 'food',
        name: 'Food & Dining',
        icon: Utensils,
        description: 'Restaurants, cafes, food delivery',
        color: 'bg-orange-100 text-orange-600'
    },
    {
        id: 'shopping',
        name: 'Shopping & Retail',
        icon: ShoppingBag,
        description: 'Fashion, electronics, home goods',
        color: 'bg-purple-100 text-purple-600'
    },
    {
        id: 'coffee',
        name: 'Coffee & Beverages',
        icon: Coffee,
        description: 'Coffee shops, bars, smoothies',
        color: 'bg-amber-100 text-amber-600'
    },
    {
        id: 'automotive',
        name: 'Automotive',
        icon: Car,
        description: 'Car services, gas stations, repairs',
        color: 'bg-blue-100 text-blue-600'
    },
    {
        id: 'home',
        name: 'Home & Garden',
        icon: Home,
        description: 'Home improvement, gardening, decor',
        color: 'bg-green-100 text-green-600'
    },
    {
        id: 'health',
        name: 'Health & Beauty',
        icon: Heart,
        description: 'Spas, fitness, health services',
        color: 'bg-pink-100 text-pink-600'
    },
    {
        id: 'entertainment',
        name: 'Entertainment',
        icon: Music,
        description: 'Movies, concerts, events',
        color: 'bg-indigo-100 text-indigo-600'
    },
    {
        id: 'premium',
        name: 'Premium Services',
        icon: Star,
        description: 'Luxury experiences, premium brands',
        color: 'bg-yellow-100 text-yellow-600'
    }
];
