import { SharingAnalyticsDashboard } from '../components/analytics/SharingAnalyticsDashboard';

/**
 * Sharing Analytics Demo Page
 * Story 9.7.6: Deal Sharing Analytics
 * 
 * Test page to view and verify sharing analytics dashboard
 */
export default function SharingAnalyticsDemo() {
    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Sharing Analytics</h1>
                    <p className="mt-2 text-gray-600">
                        Track your deal sharing performance and friend engagement
                    </p>
                </div>

                {/* Analytics Dashboard */}
                <SharingAnalyticsDashboard />

                {/* Debug Info */}
                <div className="mt-8 bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">How to Test</h2>
                    <div className="space-y-2 text-sm text-gray-600">
                        <p>1. <strong>Share deals</strong> with friends using the ShareDeal component</p>
                        <p>2. <strong>Track clicks</strong> by adding <code className="bg-gray-100 px-1 rounded">?share_id=xxx</code> to URLs</p>
                        <p>3. <strong>Track conversions</strong> by favoriting shared offers</p>
                        <p>4. <strong>View analytics</strong> - stats update automatically</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
