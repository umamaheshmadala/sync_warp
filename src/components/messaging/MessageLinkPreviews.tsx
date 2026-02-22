import React from 'react'
import { ReviewLinkPreview } from '../chat/ReviewLinkPreview'
import { OfferLinkPreview } from '../chat/OfferLinkPreview'
import { LinkPreviewCard } from './LinkPreviewCard'
import type { LinkPreview } from '../../services/linkPreviewService'

interface MessageLinkPreviewsProps {
    previews: LinkPreview[] | undefined | null
}

export const MessageLinkPreviews = React.memo(function MessageLinkPreviews({ previews }: MessageLinkPreviewsProps) {
    if (!previews || previews.length === 0) return null

    const firstPreview = previews[0]
    const isReview = firstPreview.metadata?.type === 'review'
    const isOffer = firstPreview.type === 'sync-offer' || firstPreview.metadata?.type === 'offer'

    return (
        <>
            {isReview && (
                <div className="mt-2">
                    <ReviewLinkPreview preview={firstPreview} />
                </div>
            )}

            {isOffer && (
                <div className="mt-2 text-left">
                    <OfferLinkPreview preview={firstPreview} />
                </div>
            )}

            {!isReview && !isOffer && (
                <div className="space-y-2 w-full max-w-[75vw]">
                    {previews.map((preview, index) => (
                        <LinkPreviewCard
                            key={`${preview.url}-${index}`}
                            preview={preview}
                            showRemoveButton={false}
                        />
                    ))}
                </div>
            )}
        </>
    )
})
