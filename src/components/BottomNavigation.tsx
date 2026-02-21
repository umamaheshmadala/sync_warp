// src/components/BottomNavigation.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Home, Heart, UserCheck, Wallet, Users } from 'lucide-react';
import NavigationBadge from './NavigationBadge';
import { useHapticFeedback } from '../hooks/useHapticFeedback';
import { useNavigationState } from '../hooks/useNavigationState';
import { useFollowerNotifications } from '../hooks/useFollowerNotifications';
import { useRoutePreload } from '../hooks/useRoutePreload';

interface BottomNavigationProps {
  currentRoute?: string;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  route: string;
  badge?: number;
  color?: string;
  activeColor?: string;
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({ currentRoute }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = currentRoute || location.pathname;
  const { triggerHaptic } = useHapticFeedback();
  const { addToHistory } = useNavigationState();
  const { unreadCount } = useFollowerNotifications();
  const { preloadRoute } = useRoutePreload();

  const navItems: NavItem[] = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      route: '/dashboard',
      color: 'text-gray-500',
      activeColor: 'text-indigo-600'
    },
    {
      id: 'favorites',
      label: 'Favorites',
      icon: Heart,
      route: '/favorites',
      color: 'text-gray-500',
      activeColor: 'text-red-600'
    },
    {
      id: 'following',
      label: 'Following',
      icon: UserCheck,
      route: '/following',
      badge: unreadCount,
      color: 'text-gray-500',
      activeColor: 'text-green-600'
    },
    {
      id: 'wallet',
      label: 'Wallet',
      icon: Wallet,
      route: '/wallet',
      badge: 3, // Example: 3 new coupons
      color: 'text-gray-500',
      activeColor: 'text-purple-600'
    },
    {
      id: 'friends',
      label: 'Friends',
      icon: Users,
      route: '/friends',
      color: 'text-gray-500',
      activeColor: 'text-blue-600'
    }
  ];

  const isActive = (route: string) => {
    // Strict matching to prevent bleed overlap
    // Ensure we match exact path or path + /
    if (currentPath === route) return true;
    if (currentPath.startsWith(`${route}/`)) return true;
    return false;
  };

  // Track navigation changes (previously used for animations)
  useEffect(() => {
    // Kept to maintain the same effect hook structure if needed,
    // though previously it managed lastActiveTab and isAnimating.
  }, [currentPath, navItems]);

  const handleNavClick = (route: string, _itemId: string) => {
    // Trigger haptic feedback
    triggerHaptic('light');

    // Add to navigation history
    addToHistory(route);
  };

  return (
    <nav
      className="w-full z-50 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)] bottom-nav-enter"
    >
      {/* Container with max width matching header */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-around h-14 gap-1">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            const active = isActive(item.route);

            return (
              <Link
                key={item.id}
                to={item.route}
                onClick={() => handleNavClick(item.route, item.id)}
                className="flex flex-col items-center justify-center p-0.5 rounded-lg relative min-w-0 flex-1 group overflow-hidden transition-colors focus:outline-none focus:bg-transparent active:bg-transparent safe-hover-bg"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                {/* Icon with enhanced animations */}
                <div
                  className="relative z-10 transition-transform duration-200 ease-out"
                  style={{ transform: active ? 'scale(1.1)' : 'scale(1)' }}
                >
                  <IconComponent
                    className={`h-5 w-5 transition-all duration-200 ${active ? (item.activeColor || 'text-indigo-600') : (item.color || 'text-gray-500')
                      }`}
                    strokeWidth={active ? 2.5 : 2}
                  />
                </div>

                {/* Label with smooth transitions */}
                <span
                  className={`mt-0.5 text-[10px] relative z-10 transition-all duration-200 ease-out ${active ? 'font-semibold -translate-y-px' : 'font-medium'
                    } ${active ? (item.activeColor || 'text-indigo-600') : (item.color || 'text-gray-500')}`}
                >
                  {item.label}
                </span>

                {/* Ripple effect on tap */}
                {active && (
                  <div className="absolute inset-0 rounded-lg nav-ripple" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default BottomNavigation;