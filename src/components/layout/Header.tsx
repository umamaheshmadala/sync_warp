import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { List, LogOut, User, Settings, UserPlus, Search, MessageCircle } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useSimpleProductSocial } from '../../hooks/useSimpleProductSocial';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import ContactsSidebar from '../ContactsSidebarWithTabs';
import { NotificationCenter } from '../notifications/NotificationCenter';
import MobileProfileDrawer from '../MobileProfileDrawer';
import { SearchSuggestions } from '../search/SearchSuggestions';
import { useSearch } from '../../hooks/useSearch';
import { useConversations } from '../../hooks/useConversations';
import { useMessagingStore } from '../../store/messagingStore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { SyncStatusIndicator } from '../ui/SyncStatusIndicator';

export default function Header() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const signOut = useAuthStore((state) => state.signOut);
  const { wishlistCount } = useSimpleProductSocial();
  const [showContactsSidebar, setShowContactsSidebar] = useState(false);
  const [showMobileProfileDrawer, setShowMobileProfileDrawer] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const search = useSearch({ autoSearch: false });
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  // Initialize conversations to get unread count
  useConversations();
  const totalUnreadCount = useMessagingStore((state) => state.totalUnreadCount);

  // Get recent searches from localStorage
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  useEffect(() => {
    const stored = localStorage.getItem('recent_searches');
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored).map((s: any) => s.query).slice(0, 5));
      } catch (e) {
        console.error('Error loading recent searches:', e);
      }
    }
  }, []);

  // Clear search query when navigating away from search page
  const location = useLocation();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (!location.pathname.startsWith('/search')) {
      setSearchQuery('');
      setShowSearchSuggestions(false);
    } else {
      // Sync input with URL query when on search page
      const query = searchParams.get('q');
      console.log('🔍 [Header] Sync check - Path:', location.pathname, 'Query:', query, 'Current Input:', searchQuery);
      if (query) {
        console.log('🔍 [Header] Updating input to:', query);
        setSearchQuery(query);
      }
    }
  }, [location.pathname, searchParams]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth/login');
  };

  const handleSearchFocus = () => {
    setShowSearchSuggestions(true);
  };

  const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setShowSearchSuggestions(true);

    // Get suggestions if query is long enough
    if (value.length >= 2) {
      setSuggestionsLoading(true);
      try {
        await search.getSuggestions(value);
        // Get suggestions from search hook (they're stored in search.suggestions)
        setSuggestions(search.suggestions || []);
      } catch (error) {
        console.error('Error getting suggestions:', error);
      } finally {
        setSuggestionsLoading(false);
      }
    } else {
      setSuggestions([]);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery) {
      performSearch(trimmedQuery);
    }
  };

  // Also handle Enter key in input
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmedQuery = searchQuery.trim();
      if (trimmedQuery) {
        performSearch(trimmedQuery);
      }
    }
  };

  const performSearch = (query: string) => {
    // Save to recent searches
    const stored = localStorage.getItem('recent_searches');
    let recent: any[] = [];
    if (stored) {
      try {
        recent = JSON.parse(stored);
      } catch (e) {
        recent = [];
      }
    }
    // Add new search, remove duplicates, keep max 10
    recent = [{ query, timestamp: Date.now() }, ...recent.filter(s => s.query !== query)].slice(0, 10);
    localStorage.setItem('recent_searches', JSON.stringify(recent));
    setRecentSearches(recent.map(s => s.query).slice(0, 5));

    // Navigate to search results (keep query visible in search box)
    navigate(`/search?q=${encodeURIComponent(query)}`);
    setShowSearchSuggestions(false);
    searchInputRef.current?.blur();
  };

  const handleSuggestionSelect = (suggestion: string) => {
    setSearchQuery(suggestion);
    performSearch(suggestion);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 w-full border-b border-gray-200 bg-white shadow-sm">
      <div className="max-w-7xl mx-auto flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left side - Profile Avatar (Mobile) or Logo (Desktop) */}
        <div className="flex items-center space-x-3">
          {/* Mobile: Profile Avatar */}
          {user && (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden w-10 h-10 rounded-full p-0 hover:ring-2 hover:ring-indigo-500 hover:ring-offset-2 transition-all"
              onClick={() => setShowMobileProfileDrawer(true)}
              title="Open Profile Menu"
            >
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
          )}

          {/* Logo - Desktop Only */}
          <div
            className="hidden md:flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate('/dashboard')}
          >
            {/* Logo with text for desktop */}
            <img
              src="/Logo/Logo Text Transparent PNG 2.png"
              alt="Sync"
              className="h-[55px]"
            />
          </div>
        </div>

        {/* Search Bar - Center */}
        <div className="flex-1 max-w-2xl mx-4 relative">
          <form onSubmit={handleSearchSubmit} className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={handleSearchFocus}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search businesses, products, offers..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50 focus:bg-white transition-all"
              />
            </div>

            {/* Search Suggestions Overlay */}
            <SearchSuggestions
              searchTerm={searchQuery}
              suggestions={suggestions}
              isLoading={suggestionsLoading}
              isVisible={showSearchSuggestions}
              onSuggestionSelect={handleSuggestionSelect}
              onClose={() => setShowSearchSuggestions(false)}
              recentSearches={recentSearches}
            />
          </form>
        </div>

        {/* Right side - Notifications, Friends (Mobile) | Wishlist, Notifications, Profile (Desktop) */}
        <div className="flex items-center space-x-2">
          {/* Sync Status - Desktop Only - REMOVED */}
          {/* <div className="hidden md:block">
            <SyncStatusIndicator compact />
          </div> */}

          {/* Messages - Desktop Only */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:flex relative text-gray-700 hover:text-indigo-600 hover:bg-indigo-50"
            onClick={() => navigate('/messages')}
            title="Messages"
          >
            <MessageCircle className="h-5 w-5" />
            {totalUnreadCount > 0 && (
              <span className="absolute top-0 right-0 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold ring-2 ring-white">
                {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
              </span>
            )}
          </Button>

          {/* Wishlist - Desktop Only */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:flex relative text-gray-700 hover:text-indigo-600 hover:bg-indigo-50"
            onClick={() => navigate('/wishlist')}
            title="Wishlist"
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

          {/* Notifications - All screens */}
          <NotificationCenter />

          {/* Messages - Mobile Only */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 relative"
            onClick={() => navigate('/messages')}
            title="Messages"
          >
            <MessageCircle className="h-6 w-6" />
            {totalUnreadCount > 0 && (
              <span className="absolute top-0 right-0 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold ring-2 ring-white">
                {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
              </span>
            )}
          </Button>

          {/* Friends Sidebar Toggle - Mobile shows on right, Desktop hidden */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-gray-700 hover:text-indigo-600 hover:bg-indigo-50"
            onClick={() => setShowContactsSidebar(true)}
            title="Friends"
          >
            <UserPlus className="h-6 w-6" />
          </Button>

          {/* Profile Dropdown - Desktop Only */}
          <div className="hidden md:block">
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
      </div>

      {/* Friends Sidebar */}
      <ContactsSidebar
        isOpen={showContactsSidebar}
        onClose={() => setShowContactsSidebar(false)}
      />

      {/* Mobile Profile Drawer */}
      <MobileProfileDrawer
        isOpen={showMobileProfileDrawer}
        onClose={() => setShowMobileProfileDrawer(false)}
      />
    </header>
  );
}
