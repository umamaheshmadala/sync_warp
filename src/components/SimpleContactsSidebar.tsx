// Simple ContactsSidebar without Headless UI for testing
import React from 'react';
import { X, Users, UserPlus } from 'lucide-react';

interface SimpleContactsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const SimpleContactsSidebar: React.FC<SimpleContactsSidebarProps> = ({ isOpen, onClose }) => {
  console.log('🔍 SimpleContactsSidebar rendered with isOpen:', isOpen);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-gray-500 bg-opacity-75" 
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-sm">
          <div className="flex h-full flex-col bg-white shadow-xl">
            
            {/* Header */}
            <div className="bg-indigo-600 px-4 py-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-white">
                  Your Friends
                </h2>
                <button
                  type="button"
                  className="rounded-md bg-indigo-600 text-indigo-200 hover:text-white focus:outline-none focus:ring-2 focus:ring-white"
                  onClick={onClose}
                >
                  <span className="sr-only">Close panel</span>
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="mt-4">
                <p className="text-sm text-indigo-200">
                  0 friends • 0 online
                </p>
              </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 px-4 py-6">
              <div className="text-center py-8">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No friends yet
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Start connecting with people to share experiences
                </p>
                <div className="mt-4">
                  <button className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Find Friends
                  </button>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleContactsSidebar;