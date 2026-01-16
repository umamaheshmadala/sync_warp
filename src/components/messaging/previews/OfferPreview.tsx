import React from 'react'
import { Gift, Clock } from 'lucide-react'
import { LinkPreview } from '../../../types/messaging'

export function OfferPreview({ preview }: { preview: LinkPreview }) {
    const { title, metadata, image } = preview

    // Handle optional metadata fields
    const discountText = metadata?.discountValue ? `${metadata.discountValue}% OFF` : 'Special Offer'
    const isExpired = metadata?.validUntil && new Date(metadata.validUntil) < new Date()

    return (
        <div className="flex items-start gap-3 p-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center overflow-hidden flex-shrink-0 text-white shadow-sm relative">
                {image ? (
                    <img src={image} alt="" className="w-full h-full object-cover" />
                ) : metadata?.discountValue ? (
                    <span className="font-bold text-sm tracking-tighter">{metadata.discountValue}%</span>
                ) : (
                    <Gift className="w-6 h-6" />
                )}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-bold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded uppercase tracking-wide">
                        {discountText}
                    </span>
                </div>

                <h4 className="font-semibold text-gray-900 text-sm truncate">
                    {title}
                </h4>

                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    {(metadata?.businessName || metadata?.brandName) && (
                        <span className="truncate max-w-[120px]">at {metadata.businessName || metadata.brandName}</span>
                    )}
                    {metadata?.validUntil && (
                        <span className={`flex items-center gap-1 whitespace-nowrap ${isExpired ? 'text-red-500 font-medium' : ''}`}>
                            <Clock className="w-3 h-3" />
                            {isExpired ? 'Expired' : `Expires ${new Date(metadata.validUntil).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
                        </span>
                    )}
                </div>
            </div>
        </div>
    )
}
