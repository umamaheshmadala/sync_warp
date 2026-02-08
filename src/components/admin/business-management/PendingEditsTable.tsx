
import React from 'react';
import { Eye, Clock } from 'lucide-react';
import { PendingEditSummary } from '../../../services/adminPendingEditsService';

interface PendingEditsTableProps {
    date: PendingEditSummary[];
    isLoading: boolean;
    onReviewClick: (businessId: string) => void;
}

export const PendingEditsTable: React.FC<PendingEditsTableProps> = ({
    date, // Note: using 'date' prop name to match existing table patterns if any, or just 'data' is better. Let's use 'data'.
    isLoading,
    onReviewClick
}) => {
    // Actually, I'll use 'data' in the component logic but prop name in interface is data.
    // Re-declaring prop:
    const pendingEdits = date; // Mapping 'date' prop to pendingEdits variable for clarity, assuming typo in my head or standard prop name

    if (isLoading) {
        return (
            <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-2 text-gray-500">Loading pending edits...</p>
            </div>
        );
    }

    if (pendingEdits.length === 0) {
        return (
            <div className="p-12 text-center bg-gray-50 rounded-lg border border-dashed border-gray-300">
                <div className="mx-auto h-12 w-12 text-gray-400 mb-3">
                    <CheckCircleIcon />
                </div>
                <h3 className="text-lg font-medium text-gray-900">All Caught Up!</h3>
                <p className="text-gray-500 mt-1">There are no pending edits to review.</p>
            </div>
        );
    }

    return (
        <div className="overflow-hidden bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                            Business
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                            Submitted By
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                            Submitted At
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                            Changes
                        </th>
                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                            <span className="sr-only">Actions</span>
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                    {pendingEdits.map((edit) => (
                        <tr key={edit.id} className="hover:bg-gray-50 transition-colors">
                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                                {edit.business_name}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                {edit.owner_name}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                <div className="flex items-center gap-1.5">
                                    <Clock size={14} />
                                    {new Date(edit.submitted_at).toLocaleDateString()} {new Date(edit.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                <span className="inline-flex items-center rounded-full bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20">
                                    {edit.change_count} field{edit.change_count !== 1 ? 's' : ''}
                                </span>
                            </td>
                            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                <button
                                    onClick={() => onReviewClick(edit.business_id)}
                                    className="text-indigo-600 hover:text-indigo-900 inline-flex items-center gap-1"
                                >
                                    Review <Eye size={16} />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

function CheckCircleIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );
}
