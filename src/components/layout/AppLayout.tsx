import { useLocation } from 'react-router-dom';
import Header from './Header';
import BottomNavigation from '../BottomNavigation';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  
  // Don't show header/nav on auth pages only (root path is now dashboard)
  const isAuthPage = location.pathname.startsWith('/auth');
  
  if (isAuthPage) {
    return <>{children}</>;
  }
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 pt-16 pb-16 md:pt-16 md:pb-0">{children}</main>
      <BottomNavigation currentRoute={location.pathname} />
    </div>
  );
}
