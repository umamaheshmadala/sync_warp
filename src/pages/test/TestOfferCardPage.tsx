import React, { useState } from 'react';
import { TicketOfferCard } from '../../components/offers/TicketOfferCard';
import { RefreshCw } from 'lucide-react';

export default function TestOfferCardPage() {
    const [key, setKey] = useState(0);

    const refresh = () => setKey(prev => prev + 1);

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Ticket Offer Card Design</h1>
                        <p className="text-gray-500">Trendy ticket-style layout per requirements.</p>
                    </div>
                    <button
                        onClick={refresh}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8" key={key}>

                    {/* Example 1: Standard Blue/Teal (Cyber Week) */}
                    <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-gray-400 uppercase">Teal / Cyan</h3>
                        <TicketOfferCard
                            businessName="TechGadgets Inc."
                            offerName="60% OFF"
                            offerType="Big Sale"
                            offerCode="CYBER2026"
                            validUntil="Dec 31, 2026"
                            color="bg-teal-700"
                        />
                    </div>

                    {/* Example 2: Purple (Trendy) */}
                    <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-gray-400 uppercase">Brand Purple</h3>
                        <TicketOfferCard
                            businessName="Glamour Salon"
                            offerName="BOGO FREE"
                            offerType="Hair Treatments"
                            offerCode="GLAM24"
                            validUntil="Feb 14, 2026"
                            color="bg-purple-700"
                        />
                    </div>

                    {/* Example 3: Orange (Food/Dining) */}
                    <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-gray-400 uppercase">Vibrant Orange</h3>
                        <TicketOfferCard
                            businessName="Burger King"
                            offerName="FREE MEAL"
                            offerType="Loyalty Reward"
                            offerCode="WHOPPER"
                            validUntil="Mar 10, 2026"
                            color="bg-orange-600"
                        />
                    </div>

                    {/* Example 4: Navy (Professional) */}
                    <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-gray-400 uppercase">Navy Blue</h3>
                        <TicketOfferCard
                            businessName="Office Depot"
                            offerName="$50 OFF"
                            offerType="Back to School"
                            offerCode="SCHOOL50"
                            validUntil="Aug 20, 2026"
                            color="bg-blue-900"
                        />
                    </div>

                </div>

                <div className="mt-12 p-6 bg-white rounded-xl border border-gray-200">
                    <h3 className="text-lg font-bold mb-4">Design Notes</h3>
                    <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600">
                        <li><strong>Left Stub:</strong> Rotated "OFFER" text, darker shade of the theme color.</li>
                        <li><strong>Cutouts:</strong> Semi-circles implemented via CSS pseudo-elements masking.</li>
                        <li><strong>Dashed Line:</strong> Separates stub from main content.</li>
                        <li><strong>Barcode:</strong> Generative CSS pattern (random widths/opacity) to simulate a barcode.</li>
                        <li><strong>Responsive:</strong> Cards scale down on smaller screens but maintain aspect ratio logic.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
