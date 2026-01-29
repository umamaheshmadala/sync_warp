import React from 'react';
import { cn } from '@/lib/utils';
import { Tag } from 'lucide-react';

interface TicketOfferCardProps {
    businessName: string;
    offerName: string;
    offerType: string;
    offerCode: string;
    validUntil?: string;
    auditCode?: string; // New prop for Story 4.17
    color?: string; // Optional hex or class override, defaults to a trendy blue/purple
    className?: string;
}

export function TicketOfferCard({
    businessName,
    offerName,
    offerType,
    offerCode,
    validUntil,
    auditCode,
    color = "bg-indigo-600",
    className
}: TicketOfferCardProps) {

    // Helper for Title Case (Simple implementation)
    const toTitleCase = (str: string) => {
        if (!str) return '';
        return str.toLowerCase().split(' ').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    };

    const formattedOfferName = toTitleCase(offerName);

    // Helper to extract short code for display: AUDIT-TB1-202601-0042 -> 01-0042
    const getShortAuditCode = (fullCode?: string) => {
        if (!fullCode) return null;
        const parts = fullCode.split('-');
        if (parts.length < 4) return fullCode; // Fallback
        // parts[2] = 202601 (YYYYMM), parts[3] = 0042 (SEQ)
        const datePart = parts[2];
        const seqPart = parts[3];
        // Extract MM from YYYYMM (last 2 chars)
        const month = datePart.slice(-2);
        return `${month}-${seqPart}`;
    };

    const shortCode = getShortAuditCode(auditCode);

    // Fallback for barcode visual
    const BarcodeStrip = () => (
        <div className="flex flex-col gap-[2px] h-full justify-center opacity-80 select-none" aria-hidden="true">
            {Array.from({ length: 12 }).map((_, i) => (
                <div
                    key={i}
                    className="w-full bg-white"
                    style={{ height: Math.random() > 0.5 ? '4px' : '2px', opacity: Math.random() > 0.3 ? 1 : 0.6 }}
                />
            ))}
        </div>
    );

    return (
        <div className={cn("relative w-full max-w-lg filter drop-shadow-md", className)}>
            <div className="flex h-28 w-full overflow-hidden rounded-xl">

                {/* LEFT STUB - Width reduced by ~30% (25% -> 18%) */}
                <div className={cn("relative w-[18%] flex items-center justify-center p-2 text-white overflow-hidden", color)}>
                    {/* Vertical Text */}
                    <div
                        className="font-black text-2xl tracking-widest opacity-20 transform -rotate-90 whitespace-nowrap absolute select-none"
                        style={{ fontFamily: 'Impact, sans-serif' }}
                    >
                        OFFER
                    </div>

                    <div className="relative z-10 flex flex-col items-center justify-center h-full gap-2 transform -rotate-90">
                        {/* Removed foreground text as requested */}
                    </div>

                    {/* Left Edge Semi-circle Punch Hole - Textured to match background - Border removed */}
                    <div className="absolute top-1/2 -translate-y-1/2 -left-5 w-10 h-10 bg-[#f9fafb] rounded-full z-20 shadow-[inset_-1px_0_1px_rgba(0,0,0,0.05)]"></div>


                    {/* Dashed divider line overlay - Enhanced Visibility & Top to Bottom */}
                    <div className="absolute right-0 top-0 bottom-0 w-0 border-r-[2px] border-dashed border-white/50 z-10 shadow-[2px_0_0_0_rgba(0,0,0,0.1)]"></div>
                </div>

                {/* RIGHT MAIN CONTENT - Removed padding from wrapper to allow full height strip */}
                <div className={cn("flex-1 relative flex items-center justify-between bg-white overflow-hidden", color)}>
                    {/* Background Overlay for texture/color match but lighter */}
                    <div className="absolute inset-0 bg-white opacity-90 z-0"></div>

                    {/* Right Edge Semi-circle Punch Hole - Highlighted Contour - Border removed */}
                    <div
                        className="absolute top-1/2 -translate-y-1/2 w-10 h-10 bg-[#f9fafb] rounded-full z-50 pointer-events-none shadow-[inset_1px_0_1px_rgba(0,0,0,0.05)]"
                        style={{ right: '-20px' }}
                    ></div>

                    {/* Left Part of Right Section - Added padding here */}
                    <div className="relative z-10 flex flex-col items-start justify-center h-full max-w-[65%] space-y-1 pl-4 pr-1 py-3">
                        <div className="flex items-center gap-1.5 opacity-80">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                                {businessName}
                            </span>
                        </div>

                        <div>
                            <h2 className={cn("text-lg font-medium leading-none tracking-tight", color.replace('bg-', 'text-').replace('600', '800'))}>
                                {formattedOfferName}
                            </h2>
                        </div>

                        {/* Expiry Date Moved Here */}
                        <div className="flex items-center pt-1">
                            <span className="text-[10px] font-bold text-gray-400 uppercase mr-1">Exp:</span>
                            <span className="font-mono font-bold text-xs text-gray-600 tracking-wide">
                                {validUntil}
                            </span>
                        </div>
                    </div>

                    {/* Right Strip (Barcode & Banner) - Enhanced Border & Full Height */}
                    <div className={cn("relative z-10 w-[30%] h-full flex flex-col items-center justify-end py-1 pl-2 border-l-[2px] border-dashed border-gray-300 shadow-[-1px_0_0_0_rgba(255,255,255,0.8),-2px_0_1px_0_rgba(0,0,0,0.05)_inset]")}>

                        {/* Hanging Banner - Elongated (~60% height) to allow room for audit code */}
                        <div className={cn("absolute top-0 left-1/2 -translate-x-1/2 w-[60px] shadow-md z-20 flex flex-col items-center justify-center", color)} style={{ height: '60%' }}>
                            {/* Banner Body Content */}
                            <div className="flex-1 flex items-center justify-center px-2 pb-3">
                                <div className="text-white text-[10px] font-medium uppercase leading-tight text-center break-words w-full">
                                    {offerType || 'OFFER'}
                                </div>
                            </div>

                            {/* Pennant Bottom Cut */}
                            <div className={cn("absolute bottom-[-10px] left-0 w-full h-[10px]", color)} style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }}></div>
                        </div>

                        <div className="w-full flex-1 flex flex-col items-center justify-end pb-2 gap-1 overflow-hidden">

                            {/* Barcode Strip - Subtler bg */}
                            <div className="w-full flex-1 flex items-end justify-center opacity-10 pb-1">
                                <div className="transform rotate-90 scale-150 origin-bottom">
                                    <BarcodeStrip />
                                </div>
                            </div>

                            {/* Short Audit Code Display (Story 4.17) - Horizontal & Prominent */}
                            {shortCode && (
                                <div
                                    className="text-[11px] font-mono text-gray-400 font-semibold tracking-widest cursor-help z-30 select-none"
                                    title={`Audit ID: ${auditCode}`}
                                >
                                    {shortCode}
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
