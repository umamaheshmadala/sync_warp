import React from 'react'
import { ExternalLink } from 'lucide-react'
import { LinkPreview } from '../../../types/messaging'

export function GenericPreview({ preview }: { preview: LinkPreview }) {
    const getHostname = (url: string) => {
        try {
            return new URL(url).hostname
        } catch {
            return url
        }
    }

    return (
        <>
            {preview.image && (
                <img
                    src={preview.image}
                    alt=""
                    className="w-full h-32 object-cover block bg-gray-100"
                />
            )}
            <div className="p-3">
                <h4 className="font-semibold text-gray-900 text-sm line-clamp-1 flex items-center gap-1">
                    {preview.favicon && (
                        <img src={preview.favicon} alt="" className="w-4 h-4" />
                    )}
                    {preview.title}
                </h4>
                {preview.description && (
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                        {preview.description}
                    </p>
                )}
                <span className="text-xs text-blue-600 mt-1 inline-flex items-center gap-1">
                    {getHostname(preview.url)}
                    <ExternalLink className="w-3 h-3" />
                </span>
            </div>
        </>
    )
}
