import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ChangesDiffViewerProps {
    changes: Record<string, { from: any; to: any }>;
    className?: string;
}

export function ChangesDiffViewer({ changes, className }: ChangesDiffViewerProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!changes || Object.keys(changes).length === 0) {
        return <span className="text-gray-400 italic text-sm">No details available</span>;
    }

    const keys = Object.keys(changes);
    const hasSnapshot = keys.includes('snapshot');

    return (
        <div className={cn("text-sm", className)}>
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium focus:outline-none"
            >
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                {isExpanded ? (hasSnapshot ? "Hide Archived Details" : "Hide Changes") : (hasSnapshot ? "View Archived Details" : "View Changes")}
            </button>

            {isExpanded && (
                <div className="mt-2 bg-gray-50 rounded-md border border-gray-200 p-3 space-y-2 animate-in fade-in zoom-in-95 duration-200">
                    {/* Special Handling for Snapshot (Hard Delete) */}
                    {hasSnapshot && (
                        <div className="bg-white border border-gray-200 rounded p-3 mb-2">
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 border-b border-gray-100 pb-1">
                                Archived Business Data
                            </h4>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                {Object.entries(changes.snapshot as any).map(([k, v]) => (
                                    <div key={k} className="col-span-1">
                                        <span className="text-gray-500 capitalize text-xs block">{k.replace(/_/g, ' ')}:</span>
                                        <span className="font-medium text-gray-800 break-words">{String(v || '-')}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Standard Diffs */}
                    {keys.filter(k => k !== 'snapshot').map((key) => {
                        const change = changes[key];
                        // Safety check if change structure matches {from, to}
                        if (!change || typeof change !== 'object' || (!('from' in change) && !('to' in change))) {
                            return null;
                        }

                        const { from, to } = change;

                        // Format values nicely
                        const formatValue = (val: any) => {
                            if (val === null) return <span className="text-gray-400 italic">null</span>;
                            if (val === undefined) return <span className="text-gray-400 italic">undefined</span>;
                            if (typeof val === 'boolean') return val ? 'True' : 'False';
                            if (typeof val === 'object') return JSON.stringify(val);
                            if (String(val).trim() === '') return <span className="text-gray-400 italic">empty</span>;
                            return String(val);
                        };

                        return (
                            <div key={key} className="grid grid-cols-[1fr,auto,1fr] gap-2 items-start py-1 border-b border-gray-100 last:border-0">
                                <div className="font-semibold text-gray-700 break-words capitalize">
                                    {key.replace(/_/g, ' ')}
                                </div>
                                <div className="text-gray-400 px-2">→</div>
                                <div className="text-gray-900 break-words flex flex-col gap-1">
                                    <div className="line-through text-red-400 text-xs bg-red-50 w-fit px-1 rounded">
                                        {formatValue(from)}
                                    </div>
                                    <div className="text-green-700 font-medium bg-green-50 w-fit px-1 rounded">
                                        {formatValue(to)}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
