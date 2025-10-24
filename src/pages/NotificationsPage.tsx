// src/pages/NotificationsPage.tsx
// Full-page notifications view (temporary redirect page)

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ArrowLeft } from 'lucide-react';

export default function NotificationsPage() {
  const navigate = useNavigate();

  // Auto-redirect to following page after 2 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/following/feed');
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="mb-6">
          <Bell className="h-16 w-16 text-indigo-600 mx-auto animate-bounce" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          Notifications Moved!
        </h1>
        
        <p className="text-gray-600 mb-6">
          Notifications are now shown in the bell icon (🔔) at the top-right of the header.
        </p>

        <p className="text-sm text-gray-500 mb-8">
          Redirecting you to the Following Feed...
        </p>

        <div className="space-y-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go to Dashboard
          </button>

          <button
            onClick={() => navigate('/following/feed')}
            className="w-full inline-flex items-center justify-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            View Following Feed
          </button>
        </div>

        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Tip:</strong> Click the 🔔 bell icon in the header to see your notifications!
          </p>
        </div>
      </div>
    </div>
  );
}
