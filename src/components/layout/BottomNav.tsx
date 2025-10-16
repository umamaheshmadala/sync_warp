import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Search, Heart, Wallet, Users } from 'lucide-react';
import { cn } from '../../lib/utils';
import useUnifiedFavorites from '../../hooks/useUnifiedFavorites';
import { Badge } from '../ui/badge';

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const favorites = useUnifiedFavorites();

  const navItems = [
    {
      icon: Home,
      label: 'Home',
      path: '/dashboard',
      isActive: location.pathname === '/dashboard' || location.pathname === '/',
    },
    {
      icon: Search,
      label: 'Search',
      path: '/search',
      isActive: location.pathname.startsWith('/search') || location.pathname.startsWith('/discovery'),
    },
    {
      icon: Heart,
      label: 'Favorites',
      path: '/favorites',
      isActive: location.pathname === '/favorites',
      badge: favorites.counts.total > 0 ? favorites.counts.total : undefined,
    },
    {
      icon: Wallet,
      label: 'Wallet',
      path: '/wallet',
      isActive: location.pathname === '/wallet',
    },
    {
      icon: Users,
      label: 'Social',
      path: '/social',
      isActive: location.pathname === '/social',
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-around h-16 px-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'relative flex flex-col items-center justify-center flex-1 h-full space-y-1 transition-colors',
                item.isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {item.badge && (
                  <Badge
                    className="absolute -top-2 -right-2 h-4 w-4 flex items-center justify-center p-0 text-[10px]"
                    variant="destructive"
                  >
                    {item.badge}
                  </Badge>
                )}
              </div>
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
