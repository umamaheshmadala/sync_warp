
import React from 'react';
import { ProductTagConfig, ProductTagType } from '../../../types/product';
import { TAG_CONFIGS } from '../../../hooks/useProductTags';
import { Check } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { ProductTagPill } from './ProductTagPill';

interface ProductTagSelectorProps {
    selectedTags: string[];
    onChange: (tags: string[]) => void;
    className?: string;
}

export const ProductTagSelector: React.FC<ProductTagSelectorProps> = ({ selectedTags, onChange, className }) => {

    // Filter out "new_arrival" as it is automated
    const availableTags = Object.entries(TAG_CONFIGS).filter(([key]) => key !== 'new_arrival' && key !== 'custom');

    const toggleTag = (tagKey: string) => {
        if (selectedTags.includes(tagKey)) {
            onChange(selectedTags.filter(t => t !== tagKey));
        } else {
            // Prevent multiple mutually exclusive tags if needed, for now allow multiple
            onChange([...selectedTags, tagKey]);
        }
    };

    return (
        <div className={cn("space-y-3", className)}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Product Tags
            </label>
            <div className="flex flex-wrap gap-3">
                {availableTags.map(([key, config]) => {
                    const isSelected = selectedTags.includes(key);
                    return (
                        <button
                            key={key}
                            type="button"
                            onClick={() => toggleTag(key)}
                            className={cn(
                                "relative rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1",
                                isSelected ? "ring-2 ring-primary ring-offset-1 scale-105" : "opacity-70 hover:opacity-100 hover:scale-105"
                            )}
                        >
                            <ProductTagPill
                                type={key as ProductTagType}
                                config={config}
                                className="cursor-pointer"
                            />
                            {isSelected && (
                                <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-0.5 border border-white">
                                    <Check className="w-2 h-2 text-white" />
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
            <p className="text-xs text-gray-500">
                "New Arrival" tag is automatically applied to products created in the last 7 days.
            </p>
        </div>
    );
};
