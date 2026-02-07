import React from 'react';
import { Check } from 'lucide-react';

interface ProductTagSelectorProps {
    selectedTags: string[];
    onChange: (tags: string[]) => void;
}

const AVAILABLE_TAGS = [
    { id: 'available', label: '🟢 Available' },
    { id: 'featured', label: '⭐ Featured' },
    { id: 'hot', label: '🔥 Hot' },
    { id: 'new_arrival', label: '🆕 New Arrival' },
    { id: 'sale', label: '🏷️ On Sale' },
    { id: 'limited', label: '⚠️ Limited' }
];

export const ProductTagSelector: React.FC<ProductTagSelectorProps> = ({
    selectedTags,
    onChange
}) => {
    const toggleTag = (tagId: string) => {
        if (selectedTags.includes(tagId)) {
            onChange(selectedTags.filter(t => t !== tagId));
        } else {
            if (selectedTags.length >= 3) return; // Limit 3
            onChange([...selectedTags, tagId]);
        }
    };

    return (
        <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
                Status Tags (max 3)
            </label>
            <div className="flex flex-wrap gap-2">
                {AVAILABLE_TAGS.map(tag => {
                    const isSelected = selectedTags.includes(tag.id);
                    const isDisabled = !isSelected && selectedTags.length >= 3;

                    return (
                        <button
                            key={tag.id}
                            onClick={() => toggleTag(tag.id)}
                            disabled={isDisabled}
                            className={`
                px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5
                ${isSelected
                                    ? 'bg-blue-100 text-blue-700 border-blue-200 border'
                                    : 'bg-gray-100 text-gray-600 border-transparent border hover:bg-gray-200'}
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
                        >
                            {tag.label}
                            {isSelected && <Check className="w-3.5 h-3.5" />}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
