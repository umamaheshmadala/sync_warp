import React from 'react';
import { TopProductView, TopProductEngagement } from '../../../services/productAnalyticsService';
import { Eye, Heart, MessageCircle, Share2, ImageIcon } from 'lucide-react';

interface TopProductsListProps {
    viewsData: TopProductView[];
    engagementData: TopProductEngagement[];
    isLoading: boolean;
}

export const TopProductsList: React.FC<TopProductsListProps> = ({ viewsData, engagementData, isLoading }) => {
    if (isLoading) {
        return <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />;
    }

    const ProductRow = ({ product, rank, type }: { product: any, rank: number, type: 'view' | 'engagement' }) => (
        <div className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors">
            <div className="flex-shrink-0 w-6 text-center font-bold text-gray-400">
                {rank}
            </div>
            <div className="flex-shrink-0 w-10 h-10 bg-gray-200 rounded-md overflow-hidden">
                {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <ImageIcon size={16} />
                    </div>
                )}
            </div>
            <div className="flex-grow min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {product.name}
                </p>
                {type === 'view' ? (
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Eye size={12} /> {new Intl.NumberFormat().format(product.view_count)} views
                    </p>
                ) : (
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                        <span className="flex items-center gap-1"><Heart size={10} /> {product.like_count}</span>
                        <span className="flex items-center gap-1"><MessageCircle size={10} /> {product.comment_count}</span>
                        <span className="flex items-center gap-1"><Share2 size={10} /> {product.share_count}</span>
                    </div>
                )}
            </div>
            {type === 'engagement' && (
                <div className="text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-400 px-2 py-1 rounded">
                    {product.engagement_score} pts
                </div>
            )}
        </div>
    );

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top by Views */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Eye className="w-4 h-4 text-blue-500" />
                    Most Viewed Products
                </h3>
                <div className="space-y-1">
                    {viewsData.length > 0 ? (
                        viewsData.map((p, i) => <ProductRow key={p.id} product={p} rank={i + 1} type="view" />)
                    ) : (
                        <p className="text-sm text-gray-500 text-center py-8">No view data yet.</p>
                    )}
                </div>
            </div>

            {/* Top by Engagement */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Heart className="w-4 h-4 text-pink-500" />
                    Most Engaging Products
                </h3>
                <div className="space-y-1">
                    {engagementData.length > 0 ? (
                        engagementData.map((p, i) => <ProductRow key={p.id} product={p} rank={i + 1} type="engagement" />)
                    ) : (
                        <p className="text-sm text-gray-500 text-center py-8">No engagement data yet.</p>
                    )}
                </div>
            </div>
        </div>
    );
};
