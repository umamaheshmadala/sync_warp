
import React from 'react';
import { Check, X } from 'lucide-react';

interface FieldDiffRowProps {
    label: string;
    currentValue: string | null | undefined;
    newValue: string | null | undefined;
    status: 'approved' | 'rejected' | 'pending';
    onApprove: () => void;
    onReject: () => void;
}

export const FieldDiffRow: React.FC<FieldDiffRowProps> = ({
    label,
    currentValue,
    newValue,
    status,
    onApprove,
    onReject
}) => {
    // Helper to format array values (like categories)
    const formatValue = (val: any) => {
        if (Array.isArray(val)) return val.join(', ');
        if (!val) return <span className="text-gray-400 italic">None</span>;
        return val;
    };

    return (
        <tr className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
            <td className="py-3 px-4 font-medium text-gray-700 w-1/4">{label}</td>

            <td className="py-3 px-4 text-gray-600 w-1/3 border-r border-gray-100">
                {formatValue(currentValue)}
            </td>

            <td className="py-3 px-4 w-1/3 bg-yellow-50/50">
                <span className="font-medium text-gray-900">{formatValue(newValue)}</span>
            </td>

            <td className="py-3 px-4 w-[120px] text-right">
                <div className="flex justify-end gap-2">
                    <button
                        onClick={onApprove}
                        className={`p-1.5 rounded-full transition-colors ${status === 'approved'
                                ? 'bg-green-100 text-green-600 ring-2 ring-green-500'
                                : 'text-gray-400 hover:bg-green-50 hover:text-green-600'
                            }`}
                        title="Approve change"
                    >
                        <Check size={18} />
                    </button>
                    <button
                        onClick={onReject}
                        className={`p-1.5 rounded-full transition-colors ${status === 'rejected'
                                ? 'bg-red-100 text-red-600 ring-2 ring-red-500'
                                : 'text-gray-400 hover:bg-red-50 hover:text-red-600'
                            }`}
                        title="Reject change"
                    >
                        <X size={18} />
                    </button>
                </div>
            </td>
        </tr>
    );
};
