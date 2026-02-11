import React from 'react';
import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';
import { PrefilledFieldIndicator, usePrefilledFields } from '../components/PrefilledFieldIndicator';
import { cn } from '@/lib/utils'; // Assuming this alias exists, if not I'll standard imports or check tsconfig. 
// Actually, looking at previous files, I don't see exact path for utils. I'll check BusinessRegistration imports. 
// BusinessRegistration doesn't use cn. I'll use standard className strings or check if a utility exists.
// Re-checking Step1_PhoneVerify.tsx... it didn't use 'cn'. 
// I will just use template literals for classNames to be safe and avoid missing dependency errors.

interface Step2_BasicDetailsProps {
    formData: {
        businessName: string;

        category: string;
        description: string;
        businessEmail: string;
        businessPhone: string;
        address?: string; // For preview
        city?: string;    // For preview
        state?: string;   // For preview
        websiteUrl?: string; // For preview
    };
    onFieldChange: (field: string, value: string) => void;
    prefilledFields: string[];
    categories: Array<{ id: string; name: string; display_name: string }>;
    errors: Record<string, string>;
}

export function Step2_BasicDetails({
    formData,
    onFieldChange,
    prefilledFields,
    categories,
    errors
}: Step2_BasicDetailsProps) {
    const { isPrefilled, markAsEdited } = usePrefilledFields(prefilledFields);

    const handleChange = (field: string, value: string) => {
        onFieldChange(field, value);
        markAsEdited(field);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
            >
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-indigo-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Basic Details</h2>
                </div>
                <p className="text-gray-600">
                    Tell customers about your business
                </p>
            </motion.div>

            {/* Business Name */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                        Business Name *
                    </label>
                    <PrefilledFieldIndicator isPrefilled={isPrefilled('businessName')} />
                </div>
                <input
                    type="text"
                    value={formData.businessName}
                    onChange={(e) => handleChange('businessName', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 ${isPrefilled('businessName') ? "border-blue-300 bg-blue-50" : "border-gray-200"
                        } ${errors.businessName ? "border-red-500" : ""}`}
                    placeholder="Enter your business name"
                />
                {errors.businessName && (
                    <p className="mt-1 text-sm text-red-600">{errors.businessName}</p>
                )}
            </div>



            {/* Category */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                        Category *
                    </label>
                    <PrefilledFieldIndicator isPrefilled={isPrefilled('category')} />
                </div>
                <select
                    value={formData.category}
                    onChange={(e) => handleChange('category', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 ${isPrefilled('category') ? "border-blue-300 bg-blue-50" : "border-gray-200"
                        } ${errors.category ? "border-red-500" : ""}`}
                >
                    <option value="">Select category</option>
                    {categories.map(cat => (
                        <option key={cat.id} value={cat.name}>
                            {cat.display_name}
                        </option>
                    ))}
                </select>
                {errors.category && (
                    <p className="mt-1 text-sm text-red-600">{errors.category}</p>
                )}
            </div>

            {/* Description */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                </label>
                <textarea
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    rows={4}
                    maxLength={500}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 resize-none ${errors.description ? "border-red-500" : "border-gray-200"
                        }`}
                    placeholder="Describe your business, products, and services..."
                />
                <div className="flex justify-between mt-1">
                    {errors.description ? (
                        <p className="text-sm text-red-600">{errors.description}</p>
                    ) : (
                        <span />
                    )}
                    <span className="text-sm text-gray-400">
                        {formData.description.length}/500
                    </span>
                </div>
            </div>

            {/* Contact Details */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                        Business Phone
                    </label>
                    <PrefilledFieldIndicator isPrefilled={isPrefilled('businessPhone')} />
                </div>
                <input
                    type="tel"
                    value={formData.businessPhone}
                    onChange={(e) => handleChange('businessPhone', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 ${isPrefilled('businessPhone') ? "border-blue-300 bg-blue-50" : "border-gray-200"
                        }`}
                    placeholder="+91 98765 43210"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Email
                </label>
                <input
                    type="email"
                    value={formData.businessEmail}
                    onChange={(e) => handleChange('businessEmail', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 ${errors.businessEmail ? "border-red-500" : "border-gray-200"
                        }`}
                    placeholder="contact@business.com"
                />
                {errors.businessEmail && (
                    <p className="mt-1 text-sm text-red-600">{errors.businessEmail}</p>
                )}
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Website URL
                </label>
                <div className="flex items-center justify-between mb-2">
                    <PrefilledFieldIndicator isPrefilled={isPrefilled('websiteUrl')} />
                </div>
                <input
                    type="url"
                    value={formData.websiteUrl}
                    onChange={(e) => handleChange('websiteUrl', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 ${isPrefilled('websiteUrl') ? "border-blue-300 bg-blue-50" : "border-gray-200"
                        }`}
                    placeholder="https://yourwebsite.com"
                />
            </div>
        </div>
    );
}

export default Step2_BasicDetails;
