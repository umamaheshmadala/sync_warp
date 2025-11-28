/**
 * ShareDeal Demo Component
 * Story 9.7.5: ShareDeal Integration
 * 
 * Demo page to test the unified ShareDeal component
 * Can be accessed at /share-deal-demo
 */

import { ShareDeal } from '../components/ShareDeal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

export function ShareDealDemo() {
    // Mock deal data for testing
    const mockDeal = {
        id: 'demo-deal-123',
        title: '50% off Premium Coffee',
        description: 'Get premium artisan coffee at half price. Limited time offer!',
        price: 15.99,
        original_price: 31.98,
        category: 'Food & Drink',
        image_url: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=400',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">ShareDeal Component Demo</h1>
                    <p className="text-gray-600 mt-2">Story 9.7.5: Unified share dialog with Friends, Link, and Email tabs</p>
                </div>

                {/* Demo Deal Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>{mockDeal.title}</CardTitle>
                        <CardDescription>{mockDeal.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <span className="text-2xl font-bold text-green-600">${mockDeal.price}</span>
                                {mockDeal.original_price && (
                                    <span className="ml-2 text-sm text-gray-500 line-through">
                                        ${mockDeal.original_price}
                                    </span>
                                )}
                            </div>
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                                {mockDeal.category}
                            </span>
                        </div>

                        {/* Share Button */}
                        <div className="pt-4 border-t">
                            <ShareDeal deal={mockDeal} variant="default" size="default" />
                        </div>
                    </CardContent>
                </Card>

                {/* Feature List */}
                <Card>
                    <CardHeader>
                        <CardTitle>Features</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-2 text-sm">
                            <li className="flex items-start">
                                <span className="mr-2">✅</span>
                                <span><strong>Friends Tab:</strong> Select multiple friends, add custom message, choose share method (notification/message)</span>
                            </li>
                            <li className="flex items-start">
                                <span className="mr-2">✅</span>
                                <span><strong>Link Tab:</strong> Copy shareable link to clipboard with one click</span>
                            </li>
                            <li className="flex items-start">
                                <span className="mr-2">✅</span>
                                <span><strong>Email Tab:</strong> Send deal via email (opens default email client)</span>
                            </li>
                            <li className="flex items-start">
                                <span className="mr-2">✅</span>
                                <span><strong>Analytics:</strong> Tracks share method, deal ID, and additional metadata</span>
                            </li>
                            <li className="flex items-start">
                                <span className="mr-2">✅</span>
                                <span><strong>Toast Notifications:</strong> Success/error feedback for all actions</span>
                            </li>
                        </ul>
                    </CardContent>
                </Card>

                {/* Usage Example */}
                <Card>
                    <CardHeader>
                        <CardTitle>Usage Example</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                            {`import { ShareDeal } from '@/components/ShareDeal';

function MyComponent() {
  const deal = {
    id: 'deal-123',
    title: 'Amazing Deal',
    description: 'Great savings!',
  };

  return (
    <ShareDeal 
      deal={deal}
      variant="outline"
      size="default"
    />
  );
}`}
                        </pre>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default ShareDealDemo;
