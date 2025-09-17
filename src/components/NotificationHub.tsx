import React from 'react';

interface NotificationHubProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationHub: React.FC<NotificationHubProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50" onClick={onClose}>
      <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-xl p-4">
        <h2 className="text-lg font-semibold mb-4">Notifications</h2>
        <p className="text-gray-600">No new notifications</p>
      </div>
    </div>
  );
};

export default NotificationHub;