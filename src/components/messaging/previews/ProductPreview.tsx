import React from 'react'
import { ShoppingBag } from 'lucide-react'
import { LinkPreview } from '../../../types/messaging'

export function ProductPreview({ preview }: { preview: LinkPreview }) {
    const { title, image, metadata } = preview

    return (
        <div className="flex items-start gap-3 p-3">
            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                {image ? (
                    <img src={image} alt="" className="w-full h-full object-cover" />
                ) : (
                    <ShoppingBag className="w-6 h-6 text-green-500" />
                )}
            </div>

            <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 text-sm truncate">
                    {title}
                </h4>
                <div className="flex items-center gap-2 mt-0.5">
                    {metadata?.price !== undefined && (
                        <span className="font-bold text-green-600 text-sm">
                            {metadata.currency || '₹'}{metadata.price}
                        </span>
                    )}
                    {metadata?.businessName && (
                        <span className="text-xs text-gray-500 truncate">
                            at {metadata.businessName}
                        </span>
                    )}
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-green-600 mt-1 uppercase tracking-wide">
                    <ShoppingBag className="w-3 h-3" />
                    Product
                </span>
            </div>
        </div>
    )
}
