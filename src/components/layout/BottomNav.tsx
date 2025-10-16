import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Search, List, Wallet, User } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useSimpleProductSocial } from '../../hooks/useSimpleProductSocial';
import { Badge } from '../ui/badge';

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { wishlistCount } = useSimpleProductSocial();

  const navItems = [
    {
      icon: Home,
      label: 'Home',
      path: '/dashboard',
      isActive: location.pathname === '/dashboard' || location.pathname === '/',
    },
    {
      icon: Search,
      label: 'Discover',
      path: '/discovery',
      isActive: location.pathname.startsWith('/discovery') || location.pathname.startsWith('/search'),
    },
    {
      icon: List,
      label: 'Wishlist',
      path: '/wishlist',
      isActive: location.pathname === '/wishlist',
      badge: wishlistCount > 0 ? wishlistCount : undefined,
    },
    {
      icon: Wallet,
      label: 'Wallet',
      path: '/wallet',
      isActive: location.pathname === '/wallet',
    },
    {
      icon: User,
      label: 'Profile',
      path: '/profile',
      isActive: location.pathname === '/profile',
    },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t">
      <div className="flex items-center justify-around h-16 px-2">
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
