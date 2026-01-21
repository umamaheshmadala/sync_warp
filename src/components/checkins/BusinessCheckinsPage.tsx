// src/components/checkins/BusinessCheckinsPage.tsx
// DEPRECATED: Check-in functionality has been moved to BusinessProfile.tsx
// This page now redirects to the main business dashboard

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';

const BusinessCheckinsPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect after a short delay to allow reading the message
    const timer = setTimeout(() => {
      navigate('/business/dashboard', { replace: true });
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-8 h-8 text-yellow-600" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Page Moved
        </h1>

        <p className="text-gray-600 mb-6">
          Check-ins are now available directly on each business's profile page. Redirecting you to the business directory...
        </p>

        <div className="flex items-center justify-center text-blue-600">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          <span className="font-medium">Redirecting...</span>
        </div>

        <button
          onClick={() => navigate('/business/dashboard', { replace: true })}
          className="mt-6 text-sm text-gray-400 hover:text-gray-600 underline"
        >
          Click here if not redirected
        </button>
      </div>
    </div>
  );
};

export default BusinessCheckinsPage;