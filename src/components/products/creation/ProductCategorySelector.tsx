import React, { useEffect, useState } from 'react';
import { productCategoryService, CategoryOptionGroup } from '../../../services/productCategoryService';
import { AlertCircle, Loader2, ChevronDown } from 'lucide-react';

interface ProductCategorySelectorProps {
    businessId: string;
    primaryId: string | null;
    secondaryId: string | null;
    tertiaryId: string | null;
    onChange: (selections: { primary: string | null; secondary: string | null; tertiary: string | null }) => void;
}

export const ProductCategorySelector: React.FC<ProductCategorySelectorProps> = ({
    businessId, primaryId, secondaryId, tertiaryId, onChange
}) => {
    const [groups, setGroups] = useState<CategoryOptionGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        const fetchOptions = async () => {
            try {
                setLoading(true);
                const data = await productCategoryService.getProductCategoryOptions(businessId);
                if (isMounted) setGroups(data);
            } catch (e: any) {
                if (isMounted) setError(e.message || 'Failed to load categories');
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        if (businessId) fetchOptions();
        return () => { isMounted = false; };
    }, [businessId]);

    if (loading) {
        return <div className="flex items-center gap-2 text-sm text-gray-500 py-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading categories...</div>;
    }

    if (error) {
        return <div className="text-sm text-red-500 flex items-center gap-1"><AlertCircle className="w-4 h-4"/> {error}</div>;
    }

    if (groups.length === 0) {
        return (
            <div className="bg-orange-50 text-orange-800 p-3 rounded-lg text-sm flex gap-2">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>Your business needs standard categories before you can categorize products. Go to Business Settings to set them.</p>
            </div>
        );
    }

    const renderDropdown = (
        label: string, 
        value: string | null, 
        onChangeValue: (val: string | null) => void, 
        excludeIds: (string | null)[], 
        required: boolean = false
    ) => {
        return (
            <div className="space-y-1 relative">
                <label className="block text-sm font-medium text-gray-700">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
                <div className="relative">
                    <select
                        value={value || ''}
                        onChange={(e) => onChangeValue(e.target.value || null)}
                        className="w-full pl-3 pr-10 py-2.5 rounded-lg border border-gray-200 bg-white focus:ring-2 focus:ring-black focus:border-transparent outline-none appearance-none cursor-pointer hover:bg-gray-50 transition-colors"
                        required={required}
                    >
                        <option value="">Select {label.toLowerCase()}</option>
                        {groups.map((group) => {
                            const availableOptions = group.options.filter(opt => !excludeIds.includes(opt.id) || opt.id === value);
                            if (availableOptions.length === 0) return null;
                            return (
                                <optgroup key={group.l2Id} label={group.l2Name} className="font-semibold text-gray-900">
                                    {availableOptions.map(opt => (
                                        <option key={opt.id} value={opt.id} className="font-normal text-gray-700">
                                            {opt.name}
                                        </option>
                                    ))}
                                </optgroup>
                            );
                        })}
                    </select>
                    <ChevronDown className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-4">
            {renderDropdown(
                "Primary Category", 
                primaryId, 
                (val) => onChange({ primary: val, secondary: val ? secondaryId : null, tertiary: val && secondaryId ? tertiaryId : null }), 
                [], 
                true
            )}

            {primaryId && renderDropdown(
                "Secondary Category", 
                secondaryId, 
                (val) => onChange({ primary: primaryId, secondary: val, tertiary: val ? tertiaryId : null }), 
                [primaryId]
            )}

            {primaryId && secondaryId && renderDropdown(
                "Tertiary Category", 
                tertiaryId, 
                (val) => onChange({ primary: primaryId, secondary: secondaryId, tertiary: val }), 
                [primaryId, secondaryId]
            )}
        </div>
    );
};
