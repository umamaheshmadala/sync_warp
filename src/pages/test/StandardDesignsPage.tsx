import React, { useState } from 'react';
import { ProductCard } from '../../components/products/ProductCard';
import { Product } from '../../types/product';
import { Layout, RefreshCw, Ticket, QrCode, Share2, MoreHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';

// Mock Product Data
const MOCK_PRODUCT: Product = {
    id: 'prod-1',
    business_id: 'biz-1',
    name: 'Luxury Silk Scarf',
    description: '100% Mulberry silk scarf with hand-rolled edges.',
    price: 129.99,
    currency: 'USD',
    category: 'Accessories',
    image_urls: ['https://images.unsplash.com/photo-1520903920248-841c42f7c964?auto=format&fit=crop&q=80&w=800'],
    is_available: true,
    is_featured: true,
    display_order: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
};

const MOCK_PRODUCT_MULTI: Product = {
    ...MOCK_PRODUCT,
    id: 'prod-2',
    name: 'Designer Handbag Collection',
    image_urls: [
        'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&q=80&w=800',
        'https://images.unsplash.com/photo-1590874102752-ce33a0db6f52?auto=format&fit=crop&q=80&w=800'
    ],
    is_featured: false
};

const MOCK_PRODUCT_NO_IMG: Product = {
    ...MOCK_PRODUCT,
    id: 'prod-3',
    name: 'Minimalist Watch',
    image_urls: []
};

// Ticket Offer Constants
const offers = [
    {
        businessName: "The Coffee House",
        offerText: "Buy 1 Get 1 Free on all premium lattes",
        offerCode: "COFFEE24",
        validUntil: "Aug 20, 2024",
        color: "bg-teal-900",
        ticketNumber: "001-234-567"
    },
    {
        businessName: "Burger Joint",
        offerText: "20% OFF Combo Meals",
        offerCode: "YUMMY20",
        validUntil: "Sep 15, 2024",
        color: "bg-orange-800",
        ticketNumber: "002-888-999"
    }
];

export default function StandardDesignsPage() {
    const [key, setKey] = useState(0);
    const refresh = () => setKey(prev => prev + 1);

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-6xl mx-auto space-y-12">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Standard Designs</h1>
                        <p className="text-gray-500 mt-1">Central catalog for standardized UI components and designs.</p>
                    </div>
                </div>

                {/* Section 1: Ticket Offer Design */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between border-b pb-4">
                        <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                            <Ticket className="w-5 h-5 text-teal-600" />
                            Ticket Offer Style
                        </h2>
                        <button
                            onClick={refresh}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white rounded-lg border hover:bg-gray-50 transition-colors"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Refresh Animations
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8" key={key}>
                        {offers.map((offer, idx) => (
                            <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 flex justify-center bg-gray-100/50">
                                {/* TICKET CARD START */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: idx * 0.1 }}
                                    className="relative w-full max-w-[340px] drop-shadow-2xl filter"
                                >
                                    {/* Main Container */}
                                    <div className="relative flex h-[180px] overflow-hidden rounded-2xl bg-white shadow-lg">
                                        {/* Left Side (Stub) */}
                                        <div className={`relative w-[32%] ${offer.color} flex flex-col items-center justify-center p-3 text-white overflow-hidden mobile-stub`}>
                                            <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-repeat" />
                                            {/* Rotated Text */}
                                            <div className="rotate-270 transform whitespace-nowrap text-xs font-bold tracking-[0.2em] opacity-80 absolute left-2 top-1/2 -translate-y-1/2 -translate-x-1/2 h-full flex items-center justify-center w-full">
                                                OFFER
                                            </div>
                                            <div className="z-10 flex flex-col items-center gap-2 mt-auto mb-4">
                                                <QrCode className="w-10 h-10 opacity-90" />
                                                <span className="text-[9px] font-mono opacity-70 tracking-tighter">{offer.ticketNumber}</span>
                                            </div>

                                            {/* Perforation Dots (Right Side of Stub) */}
                                            <div className="absolute right-[-6px] top-0 bottom-0 flex flex-col justify-between py-2 z-20">
                                                {Array.from({ length: 12 }).map((_, i) => (
                                                    <div key={i} className="w-3 h-3 rounded-full bg-gray-100/50 -my-1" />
                                                ))}
                                            </div>
                                        </div>

                                        {/* Right Side (Content) */}
                                        <div className="relative flex-1 bg-white p-5 flex flex-col justify-between">
                                            {/* Header */}
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">{offer.businessName}</h3>
                                                    <h2 className="text-lg font-black text-gray-900 leading-tight pr-2 line-clamp-2">{offer.offerText}</h2>
                                                </div>
                                                <div className={`w-8 h-8 rounded-full ${offer.color} flex items-center justify-center text-white shrink-0 shadow-sm`}>
                                                    <Ticket className="w-4 h-4" />
                                                </div>
                                            </div>

                                            {/* Divider */}
                                            <div className="w-full border-t-2 border-dashed border-gray-100 my-2" />

                                            {/* Footer */}
                                            <div className="flex justify-between items-end">
                                                <div>
                                                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-0.5">Valid Until</p>
                                                    <p className="text-sm font-bold text-gray-700">{offer.validUntil}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button className="p-2 rounded-full hover:bg-gray-50 text-gray-400 hover:text-gray-600 transition-colors">
                                                        <Share2 className="w-4 h-4" />
                                                    </button>
                                                    <button className="p-2 rounded-full hover:bg-gray-50 text-gray-400 hover:text-gray-600 transition-colors">
                                                        <MoreHorizontal className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Code Badge */}
                                            <div className="absolute -bottom-3 -right-3 rotate-[-5deg] bg-yellow-400 text-yellow-900 text-[10px] font-black px-3 py-1 shadow-md z-10">
                                                {offer.offerCode}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                                {/* TICKET CARD END */}
                            </div>
                        ))}

                        {/* Design Notes */}
                        <div className="col-span-1 md:col-span-2 bg-blue-50/50 border border-blue-100 rounded-lg p-6">
                            <h3 className="text-sm font-bold text-blue-900 mb-2 flex items-center gap-2">
                                <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded">NOTE</span>
                                Design Considerations
                            </h3>
                            <ul className="text-sm text-blue-800 space-y-1 list-disc pl-5">
                                <li>Use <code className="font-mono bg-blue-100 px-1 rounded">w-full max-w-[340px]</code> to constrain width but maintain aspect ratio logic.</li>
                                <li><strong>Responsive:</strong> Cards scale down on smaller screens while keeping the ticket metaphor intact.</li>
                                <li><strong>Left Stub:</strong> Rotated "OFFER" text, darker shade of primary color, and QR mock.</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Section 2: Standard Product Card */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between border-b pb-4">
                        <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                            <Layout className="w-5 h-5 text-purple-600" />
                            Standard Product Card (Storefront)
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {/* Standard Featured */}
                        <div className="space-y-2">
                            <h3 className="text-sm font-semibold text-gray-400 uppercase">Featured & Single Image</h3>
                            <div className="w-[300px]">
                                <ProductCard
                                    product={MOCK_PRODUCT}
                                    size="medium"
                                    showActions={true}
                                />
                            </div>
                        </div>

                        {/* Standard Multi Image */}
                        <div className="space-y-2">
                            <h3 className="text-sm font-semibold text-gray-400 uppercase">Multi-Image Indicator</h3>
                            <div className="w-[300px]">
                                <ProductCard
                                    product={MOCK_PRODUCT_MULTI}
                                    size="medium"
                                    showActions={true}
                                />
                            </div>
                        </div>

                        {/* No Image */}
                        <div className="space-y-2">
                            <h3 className="text-sm font-semibold text-gray-400 uppercase">Placeholder Image</h3>
                            <div className="w-[300px]">
                                <ProductCard
                                    product={MOCK_PRODUCT_NO_IMG}
                                    size="medium"
                                    showActions={true}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
