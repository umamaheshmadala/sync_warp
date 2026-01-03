import React from 'react';
import { useAuthStore } from '../store/authStore';
import CouponWallet from './user/CouponWallet';

const Wallet: React.FC = () => {
  const user = useAuthStore(state => state.user);
  const userId = user?.id;

  if (!userId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Please log in to view your wallet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20">
      <CouponWallet userId={userId} />
    </div>
  );
};

export default Wallet;
