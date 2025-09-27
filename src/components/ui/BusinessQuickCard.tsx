import React from 'react';
import { Star } from 'lucide-react';

interface BusinessQuickCardProps {
  business: {
    id: string;
    name: string;
    category: string;
    location: string;
    rating: number;
    reviewCount: number;
    isPromoted?: boolean;
  };
  index: number;
  onClick: () => void;
}

const BusinessQuickCard: React.FC<BusinessQuickCardProps> = ({ business, index, onClick }) => {
  const getEmojiForCategory = (category: string, index: number) => {
    const emojiMap: Record<string, string> = {
      'Cafe': '☕',
      'Bakery': '🍰',
      'Restaurant': '🍽️',
      'Store': '🏪',
      'Shop': '🛍️'
    };
    return emojiMap[category] || (index % 2 === 0 ? '☕' : '🍰');
  };

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl shadow-lg overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-105 relative group"
    >
      {business.isPromoted && (
        <div className="absolute top-2 left-2 z-10">
          <span className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-2 py-1 rounded-full text-xs font-medium shadow-md">
            ✨ Featured
          </span>
        </div>
      )}
      
      <div className="h-24 bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 relative flex items-center justify-center group-hover:from-indigo-200 group-hover:via-purple-200 group-hover:to-pink-200 transition-all duration-300">
        <div className="text-center">
          <div className="text-2xl mb-1 group-hover:scale-110 transition-transform duration-300">
            {getEmojiForCategory(business.category, index)}
          </div>
          <p className="text-xs text-gray-600 font-medium">{business.category}</p>
        </div>
      </div>
      
      <div className="p-3">
        <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-1 group-hover:text-indigo-600 transition-colors">
          {business.name}
        </h3>
        <p className="text-xs text-gray-600 mb-2">{business.location}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Star className="w-3 h-3 text-yellow-400 fill-current mr-1" />
            <span className="text-xs font-medium">{business.rating}</span>
          </div>
          <span className="text-xs text-gray-500">({business.reviewCount})</span>
        </div>
      </div>
    </div>
  );
};

export default BusinessQuickCard;