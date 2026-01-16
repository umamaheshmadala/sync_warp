import React from 'react'
import { Store } from 'lucide-react'
import { LinkPreview } from '../../../types/messaging'

export function StorefrontPreview({ preview }: { preview: LinkPreview }) {
    const { title, description, image } = preview

    return (
        <div className="flex items-start gap-3 p-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                {image ? (
                    <img src={image} alt="" className="w-full h-full object-cover" />
                ) : (
                    <Store className="w-5 h-5 text-purple-500" />
                )}
            </div>

            <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 text-sm truncate">
                    {title || 'Business'}
                </h4>
                <p className="text-xs text-gray-600 line-clamp-2 mt-0.5">
                    {description || 'Visit this business on SynC'}
                </p>
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-purple-600 mt-1 uppercase tracking-wide">
                    <Store className="w-3 h-3" />
                    Business
                </span>
            </div>
        </div>
    )
}
