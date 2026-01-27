import React from 'react';
import { cn } from '@/lib/utils';
import { Tag } from 'lucide-react';

interface TicketOfferCardProps {
    businessName: string;
    offerName: string;
    offerType: string;
    offerCode: string;
    validUntil?: string;
    color?: string; // Optional hex or class override, defaults to a trendy blue/purple
    className?: string;
}

export function TicketOfferCard({
    businessName,
    offerName,
    offerType,
    offerCode,
    validUntil,
    color = "bg-indigo-600",
    className
}: TicketOfferCardProps) {

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
        <div className={cn("relative w-full max-w-lg filter drop-shadow-md transition-transform hover:scale-[1.01]", className)}>
            <div className="flex h-28 w-full overflow-hidden rounded-xl">

                {/* LEFT STUB */}
                <div className={cn("relative w-[25%] flex items-center justify-center p-2 text-white overflow-hidden", color)}>
                    {/* Vertical Text */}
                    <div
                        className="font-black text-3xl tracking-widest opacity-20 transform -rotate-90 whitespace-nowrap absolute select-none"
                        style={{ fontFamily: 'Impact, sans-serif' }}
                    >
                        OFFER
                    </div>

                    <div className="relative z-10 flex flex-col items-center justify-center h-full gap-2 transform -rotate-90">
                        {/* Removed foreground text as requested */}
                    </div>

                    {/* Left Edge Semi-circle Punch Hole - Textured to match background */}
                    <div className="absolute top-1/2 -translate-y-1/2 -left-5 w-10 h-10 bg-[#f9fafb] rounded-full z-20 shadow-[inset_-1px_0_2px_rgba(0,0,0,0.05)] border border-black/5"></div>


                    {/* Dashed divider line overlay */}
                    <div className="absolute right-0 top-4 bottom-4 w-0 border-r-2 border-dashed border-white/40 z-10"></div>
                </div>

                {/* RIGHT MAIN CONTENT */}
                <div className={cn("flex-1 relative flex items-center justify-between p-4 bg-white overflow-hidden", color)}>
                    {/* Background Overlay for texture/color match but lighter */}
                    <div className="absolute inset-0 bg-white opacity-90 z-0"></div>

                    {/* Right Edge Semi-circle Punch Hole - Highlighted Contour */}
                    <div
                        className="absolute top-1/2 -translate-y-1/2 w-10 h-10 bg-[#f9fafb] rounded-full z-50 pointer-events-none shadow-[inset_1px_0_2px_rgba(0,0,0,0.05)] border border-black/5"
                        style={{ right: '-20px' }}
                    ></div>

                    {/* Left Part of Right Section */}
                    <div className="relative z-10 flex flex-col items-start justify-center h-full max-w-[65%] space-y-1">
                        <div className="flex items-center gap-1.5 opacity-80">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                                {businessName}
                            </span>
                        </div>

                        <div>
                            <h2 className={cn("text-lg font-black leading-none uppercase tracking-tight", color.replace('bg-', 'text-').replace('600', '800'))}>
                                {offerName}
                            </h2>
                        </div>

                        {/* Expiry Date Moved Here */}
                        <div className="flex items-center pt-1">
                            <span className="text-[10px] font-bold text-gray-400 uppercase mr-1">Valid Until:</span>
                            <span className="font-mono font-bold text-xs text-gray-600 tracking-wide">
                                {validUntil}
                            </span>
                        </div>
                    </div>

                    {/* Right Strip (Barcode Only now) */}
                    <div className={cn("relative z-10 w-[35%] h-full flex flex-col items-center justify-center py-1 border-l-2 border-dashed border-gray-200 pl-2")}>

                        {/* Badge */}
                        <div className={cn("absolute -top-3 left-1/2 -translate-x-1/2 pt-3 pb-1 px-3 shadow-sm min-w-[50px] z-20", color)}>
                            <div className="text-white text-[9px] font-black uppercase leading-tight text-center whitespace-normal">
                                {offerType || 'OFFER'}
                            </div>
                            {/* Triangle Arrow */}
                            <div className={cn("absolute bottom-[-5px] left-0 w-full h-[5px]", color)} style={{ clipPath: 'polygon(0 0, 50% 100%, 100% 0)' }}></div>
                        </div>

                        <div className="flex-1 w-full flex flex-col items-center justify-center relative mt-4">
                            {/* Barcode */}
                            <div className="transform rotate-90 scale-x-125 scale-y-75 opacity-20">
                                <BarcodeStrip />
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
