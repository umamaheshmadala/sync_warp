// src/components/Wallet.tsx
import React, { useEffect, useState } from 'react';
import CouponWallet from './user/CouponWallet';
import { supabase } from '../lib/supabase';
import { Loader } from 'lucide-react';
import PageDebugPanel from './PageDebugPanel';

const Wallet: React.FC = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get current user
    const getCurrentUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
        }
      } catch (error) {
        console.error('Error getting user:', error);
      } finally {
        setLoading(false);
      }
    };

    getCurrentUser();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

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
    <>
      <div className="pb-20">
        <CouponWallet userId={userId} />
      </div>
      <PageDebugPanel 
        pageName="Wallet" 
        stats={{
          'User ID': userId?.slice(0, 8) + '...',
          'Page': 'Wallet/Coupons'
        }} 
      />
    </>
  );
};

export default Wallet;
