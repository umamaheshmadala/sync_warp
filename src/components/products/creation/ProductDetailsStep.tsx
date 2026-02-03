import React, { useState } from 'react';
import { ArrowLeft, Save, Upload, Bell, BellOff } from 'lucide-react';
import { ProductTagSelector } from './ProductTagSelector';
import { ProductImage } from '../../../components/products/images/ProductImageManager';

interface ProductDetailsStepProps {
    images: ProductImage[];
    name: string;
    description: string;
    tags: string[];
    notificationsEnabled: boolean;
    onUpdate: (details: {
        name?: string;
        description?: string;
        tags?: string[];
        notifications_enabled?: boolean;
    }) => void;
    onBack: () => void;
    onPublish: () => void;
    onSaveDraft: () => void;
}

export const ProductDetailsStep: React.FC<ProductDetailsStepProps> = ({
    images,
    name,
    description,
    tags,
    notificationsEnabled,
    onUpdate,
    onBack,
    onPublish,
    onSaveDraft
}) => {
    const [nameError, setNameError] = useState('');

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.slice(0, 100);
        onUpdate({ name: val });
        if (val.trim()) setNameError('');
    };

    const validateAndPublish = () => {
        if (!name.trim()) {
            setNameError('Product name is required');
            return;
        }
        onPublish();
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-900">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                <button
                    onClick={onBack}
                    className="flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400"
                >
                    <ArrowLeft className="w-5 h-5 mr-1" />
                    Back
                </button>
                <h1 className="text-lg font-semibold">Details</h1>
                <button
                    onClick={validateAndPublish}
                    className="text-blue-600 font-semibold"
                >
                    Publish
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8">
                {/* Thumbnails Preview */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {images.map((img, idx) => (
                        <div key={img.id} className="relative flex-shrink-0 w-16 h-20 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                            <img src={img.previewUrl} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                            <div className="absolute top-0 right-0 bg-black/50 text-white text-[10px] px-1">
                                {idx + 1}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Inputs */}
                <div className="space-y-4">
                    {/* Name */}
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Product Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={handleNameChange}
                            placeholder="e.g. Summer Floral Dress"
                            className={`w-full px-3 py-2 rounded-lg border bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all
                        ${nameError ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}
                    `}
                        />
                        <div className="flex justify-between text-xs">
                            <span className="text-red-500">{nameError}</span>
                            <span className="text-gray-400">{name.length}/100</span>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Description
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => onUpdate({ description: e.target.value.slice(0, 300) })}
                            placeholder="Add details about size, material, care..."
                            rows={4}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                        />
                        <div className="flex justify-end text-xs text-gray-400">
                            {description.length}/300
                        </div>
                    </div>

                    {/* Tags */}
                    <ProductTagSelector
                        selectedTags={tags}
                        onChange={(t) => onUpdate({ tags: t })}
                    />

                    {/* Notifications */}
                    <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                        <div className="flex items-center gap-3">
                            {notificationsEnabled ? (
                                <Bell className="w-5 h-5 text-blue-500" />
                            ) : (
                                <BellOff className="w-5 h-5 text-gray-400" />
                            )}
                            <div className="flex flex-col">
                                <span className="text-sm font-medium">Notify Followers</span>
                                <span className="text-xs text-gray-500">Send alert when published</span>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={notificationsEnabled}
                                onChange={(e) => onUpdate({ notifications_enabled: e.target.checked })}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </label>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="pt-4 flex justify-center">
                    <button
                        onClick={onSaveDraft}
                        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <Save className="w-4 h-4" />
                        Save as Draft
                    </button>
                </div>
            </div>
        </div>
    );
};
