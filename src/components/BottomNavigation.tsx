// src/components/BottomNavigation.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Search, Wallet, Users, User } from 'lucide-react';

interface BottomNavigationProps {
  currentRoute: string;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  route: string;
  badge?: number;
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({ currentRoute }) => {
  const navigate = useNavigate();

  const navItems: NavItem[] = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      route: '/dashboard'
    },
    {
      id: 'search',
      label: 'Search',
      icon: Search,
      route: '/search'
    },
    {
      id: 'wallet',
      label: 'Wallet',
      icon: Wallet,
      route: '/wallet',
      badge: 3 // Example: 3 new coupons
    },
    {
      id: 'social',
      label: 'Social',
      icon: Users,
      route: '/social'
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      route: '/profile'
    }
  ];

  const isActive = (route: string) => {
    return currentRoute === route || currentRoute.startsWith(route + '/');
  };

  const handleNavClick = (route: string) => {
    navigate(route);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 safe-area-pb">
      <div className="flex items-center justify-around px-2 py-1">
        {navItems.map((item) => {
          const IconComponent = item.icon;
          const active = isActive(item.route);
          
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.route)}
              className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors relative min-w-0 flex-1 ${
                active 
                  ? 'text-indigo-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {/* Badge */}
              {item.badge && item.badge > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
              
              {/* Icon */}
              <IconComponent 
                className={`h-6 w-6 transition-colors ${
                  active ? 'text-indigo-600' : 'text-gray-500'
                }`}
                strokeWidth={active ? 2.5 : 2}
              />
              
              {/* Label */}
              <span 
                className={`mt-1 text-xs font-medium transition-colors ${
                  active ? 'text-indigo-600' : 'text-gray-500'
                }`}
              >
                {item.label}
              </span>

              {/* Active indicator */}
              {active && (
                <div className="absolute top-0 left-1/2 h-1 w-6 -translate-x-1/2 rounded-full bg-indigo-600" />
              )}
            </button>
          );
        })}
      </div>

      {/* Safe area padding for devices with home indicators */}
      <div className="h-safe-area-inset-bottom bg-white" />
    </nav>
  );
};

export default BottomNavigation;