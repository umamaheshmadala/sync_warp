import React from 'react'
import { User } from 'lucide-react'
import { LinkPreview } from '../../../types/messaging'

export function ProfilePreview({ preview }: { preview: LinkPreview }) {
    const { title, description, image } = preview

    return (
        <div className="flex items-start gap-3 p-3">
            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0 border border-gray-100">
                {image ? (
                    <img src={image} alt="" className="w-full h-full object-cover" />
                ) : (
                    <User className="w-6 h-6 text-gray-400" />
                )}
            </div>

            <div className="flex-1 min-w-0 py-0.5">
                <div className="flex items-center justify-between gap-2">
                    <h4 className="font-semibold text-gray-900 text-sm truncate">
                        {title}
                    </h4>
                    <span className="flex-shrink-0 inline-flex items-center text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full font-medium">
                        Profile
                    </span>
                </div>
                <p className="text-xs text-gray-600 mt-0.5 truncate">
                    {description}
                </p>
            </div>
        </div>
    )
}
