/**
 * Test Page for Story 5.5: Enhanced Sharing Limits
 * Quick test interface to validate sharing limits functionality
 */

import React, { useState, useEffect } from 'react';
import { useSharingLimits } from '../hooks/useSharingLimits';
import { SharingStatsCard } from '../components/Sharing/SharingStatsCard';
import { LimitExceededModal } from '../components/Sharing/LimitExceededModal';
import sharingLimitsService from '../services/sharingLimitsService';

const TestSharingLimits: React.FC = () => {
  const {
    stats,
    limits,
    loading,
    error,
    isDriver,
    checkCanShare,
    shareWithValidation,
    refreshStats,
  } = useSharingLimits();

  const [testFriendId, setTestFriendId] = useState('');
  const [testCouponId, setTestCouponId] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [permissionCheck, setPermissionCheck] = useState<any>(null);
  const [shareableCoupons, setShareableCoupons] = useState<any[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState('');
  const [loadingCoupons, setLoadingCoupons] = useState(false);

  const handleCheckPermission = async () => {
    if (!testFriendId) {
      alert('Please enter a friend ID');
      return;
    }
    try {
      const result = await checkCanShare(testFriendId);
      console.log('Permission check result:', result);
      setPermissionCheck(result);
      
      if (!result.can_share) {
        setShowModal(true);
      } else {
        alert(`✅ Can share! ${result.remaining_total} shares remaining today`);
      }
    } catch (err) {
      console.error('Check permission error:', err);
      alert(`❌ Error checking permission: ${err}`);
    }
  };

  const handleLogShare = async () => {
    if (!testFriendId || !selectedCollectionId) {
      alert('Please select a friend and a coupon from your wallet');
      return;
    }
    try {
      // Get the selected coupon details
      const selectedCoupon = shareableCoupons.find(c => c.collection_id === selectedCollectionId);
      if (!selectedCoupon) {
        alert('❌ Selected coupon not found in shareable list');
        return;
      }

      const result = await shareWithValidation(
        testFriendId, 
        selectedCoupon.coupon_id,
        selectedCollectionId
      );
      
      if (result.success) {
        alert('✅ Share logged successfully!\n\nCoupon removed from your wallet and added to friend\'s wallet');
        await refreshStats();
        await loadShareableCoupons(); // Refresh coupon list
      } else {
        alert(`❌ ${result.message}`);
      }
    } catch (err) {
      console.error('Log share error:', err);
      alert(`❌ Error: ${err}`);
    }
  };

  const loadShareableCoupons = async () => {
    setLoadingCoupons(true);
    try {
      const userId = await sharingLimitsService.getCurrentUserId();
      if (!userId) {
        console.error('No user ID found');
        return;
      }
      const coupons = await sharingLimitsService.getShareableCoupons(userId);
      setShareableCoupons(coupons || []);
      console.log('✅ Loaded shareable coupons:', coupons);
    } catch (err) {
      console.error('Error loading shareable coupons:', err);
    } finally {
      setLoadingCoupons(false);
    }
  };

  useEffect(() => {
    loadShareableCoupons();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            📊 Story 5.5: Sharing Limits Test
          </h1>
          <p className="text-gray-600">
            Test the enhanced sharing limits functionality
          </p>
        </div>

        {/* Stats Card (Full View) */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Current Sharing Stats</h2>
          {loading ? (
            <div className="text-gray-500">Loading stats...</div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
              Error: {error}
            </div>
          ) : stats ? (
            <SharingStatsCard stats={stats} />
          ) : (
            <div className="text-gray-500">No stats available</div>
          )}
        </div>

        {/* Stats Card (Compact View) */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Compact View</h2>
          {stats && <SharingStatsCard stats={stats} compact />}
        </div>

        {/* Shareable Coupons Wallet */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Your Shareable Coupons</h2>
            <button
              onClick={loadShareableCoupons}
              disabled={loadingCoupons}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {loadingCoupons ? 'Loading...' : '🔄 Refresh'}
            </button>
          </div>

          {loadingCoupons ? (
            <div className="text-center py-8 text-gray-500">Loading coupons...</div>
          ) : shareableCoupons.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No shareable coupons in your wallet.
              <br />
              <span className="text-sm">Collect coupons from businesses to share them!</span>
            </div>
          ) : (
            <div className="space-y-2">
              {shareableCoupons.map((coupon) => (
                <div
                  key={coupon.collection_id}
                  onClick={() => setSelectedCollectionId(coupon.collection_id)}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    selectedCollectionId === coupon.collection_id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{coupon.coupon_title}</h3>
                      <p className="text-sm text-gray-600 mt-1">Code: {coupon.coupon_code}</p>
                      <div className="flex gap-4 mt-2 text-xs text-gray-500">
                        <span>Collected: {new Date(coupon.collected_at).toLocaleDateString()}</span>
                        <span>Expires: {new Date(coupon.expires_at).toLocaleDateString()}</span>
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
                          {coupon.acquisition_method}
                        </span>
                      </div>
                    </div>
                    {selectedCollectionId === coupon.collection_id && (
                      <div className="ml-4 text-blue-600 text-2xl">✓</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Test Controls */}
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <h2 className="text-xl font-semibold">Test Controls</h2>

          {/* Input Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Friend ID (UUID)
              </label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter friend UUID"
                value={testFriendId}
                onChange={(e) => setTestFriendId(e.target.value)}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Selected Coupon:</strong>
                {selectedCollectionId ? (
                  <span className="ml-2">
                    {shareableCoupons.find(c => c.collection_id === selectedCollectionId)?.coupon_title || 'Unknown'}
                  </span>
                ) : (
                  <span className="ml-2 text-blue-600">None - Select a coupon from your wallet above</span>
                )}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleCheckPermission}
              disabled={loading}
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Check Permission
            </button>

            <button
              onClick={handleLogShare}
              disabled={loading}
              className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Log Share
            </button>

            <button
              onClick={refreshStats}
              disabled={loading}
              className="flex-1 bg-gray-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Refresh Stats
            </button>
          </div>
        </div>

        {/* Debug Info */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-xl font-semibold">Debug Information</h2>

          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-700">Limits</h3>
                <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-auto">
                  {JSON.stringify(limits, null, 2)}
                </pre>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700">Permission Check</h3>
                <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-auto">
                  {JSON.stringify(permissionCheck, null, 2)}
                </pre>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700">Stats</h3>
              <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-60">
                {JSON.stringify(stats, null, 2)}
              </pre>
            </div>
          </div>
        </div>

        {/* How to Use */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-blue-900">📖 How to Test (NEW Workflow)</h2>
          <ol className="space-y-2 text-sm text-blue-800">
            <li><strong>1.</strong> First, collect a coupon:
              <code className="block bg-blue-100 px-2 py-1 rounded mt-1 text-xs">
                INSERT INTO user_coupon_collections (user_id, coupon_id, expires_at, status)<br/>
                VALUES (auth.uid(), 'COUPON-ID', NOW() + INTERVAL '30 days', 'active');
              </code>
            </li>
            <li><strong>2.</strong> Your shareable coupons will appear in the wallet above</li>
            <li><strong>3.</strong> Click on a coupon to select it (blue checkmark appears)</li>
            <li><strong>4.</strong> Get friend ID: <code className="bg-blue-100 px-2 py-1 rounded">SELECT id FROM auth.users LIMIT 5</code></li>
            <li><strong>5.</strong> Paste friend ID and click "Check Permission"</li>
            <li><strong>6.</strong> Click "Log Share" - coupon will disappear from your wallet!</li>
            <li><strong>7.</strong> Check friend's wallet to see they received it</li>
            <li><strong>8.</strong> Try to share same coupon again - it won't be in the list anymore! ✅</li>
          </ol>
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
            <p className="text-sm text-green-800">
              <strong>✨ Key Improvements:</strong><br/>
              • One coupon can only be shared once<br/>
              • Coupon moves from your wallet to friend's wallet<br/>
              • Complete lifecycle tracking<br/>
              • Filter by acquisition method (collected vs. received)
            </p>
          </div>
        </div>
      </div>

      {/* Limit Exceeded Modal */}
      <LimitExceededModal
        open={showModal}
        onClose={() => setShowModal(false)}
        permissionCheck={permissionCheck}
        isDriver={isDriver}
        onUpgradeClick={() => {
          console.log('User clicked to learn about Drivers');
          setShowModal(false);
        }}
      />
    </div>
  );
};

export default TestSharingLimits;
