// src/components/BottomNavigation.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Heart, UserCheck, Wallet, Users } from 'lucide-react';
import NavigationBadge from './NavigationBadge';
import { useHapticFeedback } from '../hooks/useHapticFeedback';
import { useNavigationState } from '../hooks/useNavigationState';
import { useFollowerNotifications } from '../hooks/useFollowerNotifications';

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
  const [lastActiveTab, setLastActiveTab] = useState<string>('');
  const [isAnimating, setIsAnimating] = useState(false);

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
    // Special case: /following/feed is independent and doesn't highlight /following
    if (route === '/following' && currentPath === '/following/feed') {
      return false;
    }
    return currentPath === route || currentPath.startsWith(route + '/');
  };

  // Track navigation changes for animations
  useEffect(() => {
    const activeItem = navItems.find(item => isActive(item.route));
    if (activeItem && activeItem.id !== lastActiveTab) {
      setLastActiveTab(activeItem.id);
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 300);
    }
  }, [currentPath, lastActiveTab, navItems]);

  const handleNavClick = (route: string, _itemId: string) => {
    // Trigger haptic feedback
    triggerHaptic('light');

    // Add to navigation history
    addToHistory(route);

    // Navigate with smooth animation
    setIsAnimating(true);
    navigate(route);

    // Reset animation state
    setTimeout(() => setIsAnimating(false), 300);
  };

  return (
    <motion.nav
      className="w-full z-50 bg-white/95 backdrop-blur-lg border-t border-gray-200 pb-[env(safe-area-inset-bottom)]"
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      {/* Container with max width matching header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-around py-1">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            const active = isActive(item.route);

            return (
              <motion.button
                key={item.id}
                onClick={() => handleNavClick(item.route, item.id)}
                className="flex flex-col items-center justify-center p-0.5 rounded-lg relative min-w-0 flex-1 group"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                {/* Enhanced Badge with animation */}
                <NavigationBadge
                  count={item.badge || 0}
                  show={!!(item.badge && item.badge > 0)}
                  color="bg-red-500"
                />

                {/* Animated Background */}
                <AnimatePresence>
                  {active && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    />
                  )}
                </AnimatePresence>

                {/* Icon with enhanced animations */}
                <motion.div
                  className="relative z-10"
                  animate={{
                    scale: active ? 1.1 : 1,
                    rotate: active && isAnimating ? [0, -10, 10, 0] : 0
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 25,
                    rotate: { duration: 0.3 }
                  }}
                >
                  <IconComponent
                    className={`h-5 w-5 transition-all duration-200 ${active ? (item.activeColor || 'text-indigo-600') : (item.color || 'text-gray-500')
                      } group-hover:scale-110`}
                    strokeWidth={active ? 2.5 : 2}
                  />
                </motion.div>

                {/* Label with smooth transitions */}
                <motion.span
                  className={`mt-0.5 text-[10px] font-medium transition-all duration-200 relative z-10 ${active ? (item.activeColor || 'text-indigo-600') : (item.color || 'text-gray-500')
                    }`}
                  animate={{
                    y: active ? -1 : 0,
                    fontWeight: active ? 600 : 500
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  {item.label}
                </motion.span>

                {/* Ripple effect on tap */}
                <motion.div
                  className="absolute inset-0 rounded-lg"
                  initial={false}
                  animate={isAnimating && lastActiveTab === item.id ? {
                    background: [
                      'rgba(99, 102, 241, 0)',
                      'rgba(99, 102, 241, 0.1)',
                      'rgba(99, 102, 241, 0)'
                    ]
                  } : {}}
                  transition={{ duration: 0.3 }}
                />
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.nav>
  );
};

export default BottomNavigation;