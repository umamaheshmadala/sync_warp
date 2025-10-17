import { useNavigate } from 'react-router-dom';
import { List, Bell, LogOut, User, Settings, Users } from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useSimpleProductSocial } from '../../hooks/useSimpleProductSocial';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import ContactsSidebar from '../ContactsSidebarWithTabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

export default function Header() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const signOut = useAuthStore((state) => state.signOut);
  const { wishlistCount } = useSimpleProductSocial();
  const [showContactsSidebar, setShowContactsSidebar] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth/login');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white shadow-sm">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <div 
          className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => navigate('/dashboard')}
        >
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
            <span className="text-white font-bold text-xl">S</span>
          </div>
          <span className="font-bold text-xl bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent hidden sm:inline-block">SynC</span>
        </div>

        {/* Spacer for layout balance */}
        <div className="flex-1"></div>

        {/* Right side - Friends, Wishlist, Notifications, Profile */}
        <div className="flex items-center space-x-2">
          {/* Friends Sidebar Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-700 hover:text-indigo-600 hover:bg-indigo-50"
            onClick={() => setShowContactsSidebar(true)}
            title="Friends"
          >
            <Users className="h-5 w-5" />
          </Button>

          {/* Wishlist */}
          <Button
            variant="ghost"
            size="icon"
            className="relative text-gray-700 hover:text-indigo-600 hover:bg-indigo-50"
            onClick={() => navigate('/wishlist')}
          >
            <List className="h-5 w-5" />
            {wishlistCount > 0 && (
              <Badge
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500 hover:bg-red-600"
              >
                {wishlistCount}
              </Badge>
            )}
          </Button>

          {/* Notifications - Placeholder */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden sm:flex text-gray-700 hover:text-indigo-600 hover:bg-indigo-50"
            onClick={() => navigate('/notifications')}
          >
            <Bell className="h-5 w-5" />
          </Button>

          {/* Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:ring-2 hover:ring-indigo-500 hover:ring-offset-2 transition-all">
                <Avatar className="h-10 w-10 border-2 border-gray-200">
                  <AvatarImage 
                    src={profile?.avatar_url || ''} 
                    alt={user?.email || 'User'} 
                  />
                  <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {profile?.full_name || 'User'}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                <User className="mr-2 h-4 w-4" />
                <span>View Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/favorites')}>
                <List className="mr-2 h-4 w-4" />
                <span>Favorites</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Friends Sidebar */}
      <ContactsSidebar
        isOpen={showContactsSidebar}
        onClose={() => setShowContactsSidebar(false)}
      />
    </header>
  );
}
