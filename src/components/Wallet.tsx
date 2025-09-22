// src/components/Wallet.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { Wallet as WalletIcon, CreditCard, Gift, Star, Zap, Plus } from 'lucide-react';

const Wallet: React.FC = () => {
  // Sample data for demonstration
  const coupons = [
    { id: 1, title: '50% off Pizza Palace', value: '₹250 saved', expiry: '2 days left', category: 'Food' },
    { id: 2, title: '20% off Fashion Store', value: '₹400 saved', expiry: '1 week left', category: 'Shopping' },
    { id: 3, title: 'Buy 1 Get 1 Free Coffee', value: '₹150 saved', expiry: '3 days left', category: 'Cafe' }
  ];

  const stats = [
    { label: 'Total Saved', value: '₹1,250', icon: CreditCard, color: 'text-green-600' },
    { label: 'Active Coupons', value: '12', icon: Gift, color: 'text-blue-600' },
    { label: 'This Month', value: '₹650', icon: Star, color: 'text-purple-600' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-100 rounded-full">
            <WalletIcon className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Wallet</h1>
            <p className="text-gray-600">Manage your deals and coupons</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-4 py-6 space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {stats.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <motion.div
                key={stat.label}
                className="bg-white rounded-lg p-4 shadow-sm border border-gray-200"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="flex flex-col items-center text-center">
                  <IconComponent className={`h-6 w-6 mb-2 ${stat.color}`} />
                  <div className="text-lg font-semibold text-gray-900">{stat.value}</div>
                  <div className="text-xs text-gray-500">{stat.label}</div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Active Coupons */}
      <div className="px-4 pb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Active Coupons</h2>
          <button className="flex items-center space-x-1 text-indigo-600 text-sm font-medium">
            <Plus className="h-4 w-4" />
            <span>Add Coupon</span>
          </button>
        </div>

        <div className="space-y-3">
          {coupons.map((coupon, index) => (
            <motion.div
              key={coupon.id}
              className="bg-white rounded-lg p-4 shadow-sm border border-gray-200"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full">
                      {coupon.category}
                    </span>
                    <span className="text-sm text-gray-500">{coupon.expiry}</span>
                  </div>
                  <h3 className="font-medium text-gray-900 mt-1">{coupon.title}</h3>
                  <p className="text-green-600 font-semibold text-sm">{coupon.value}</p>
                </div>
                <div className="flex items-center">
                  <Zap className="h-5 w-5 text-yellow-500" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-4 pb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-4">
          <motion.button
            className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 text-left"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Gift className="h-6 w-6 text-purple-600 mb-2" />
            <div className="font-medium text-gray-900">Browse Deals</div>
            <div className="text-sm text-gray-500">Find new offers</div>
          </motion.button>
          
          <motion.button
            className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 text-left"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Star className="h-6 w-6 text-yellow-600 mb-2" />
            <div className="font-medium text-gray-900">Favorites</div>
            <div className="text-sm text-gray-500">Your saved deals</div>
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default Wallet;