import React from 'react'
import { ReviewLinkPreview } from '../chat/ReviewLinkPreview'
import { OfferLinkPreview } from '../chat/OfferLinkPreview'
import { LinkPreviewCard } from './LinkPreviewCard'
import type { LinkPreview } from '../../services/linkPreviewService'

interface MessageLinkPreviewsProps {
    previews: LinkPreview[] | any | undefined | null
}

export const MessageLinkPreviews = React.memo(function MessageLinkPreviews({ previews }: MessageLinkPreviewsProps) {
    if (!previews) return null

    // Defensively parse previews to guarantee it's an array
    let previewArray: LinkPreview[] = []

    if (typeof previews === 'string') {
        try {
            const parsed = JSON.parse(previews)
            previewArray = Array.isArray(parsed) ? parsed : [parsed]
        } catch (e) {
            console.error('Failed to parse link_previews string:', e)
            return null
        }
    } else if (Array.isArray(previews)) {
        previewArray = previews
    } else if (typeof previews === 'object') {
        previewArray = [previews]
    }

    if (previewArray.length === 0) return null

    const firstPreview = previewArray[0]
    if (!firstPreview) return null

    const isReview = firstPreview.metadata?.type === 'review' || firstPreview.type === 'sync-review'
    const isOffer = firstPreview.type === 'sync-offer' || firstPreview.metadata?.type === 'offer' || firstPreview.type === 'sync-deal' || firstPreview.type === 'sync-coupon'

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
                    {previewArray.map((preview, index) => (
                        <LinkPreviewCard
                            key={`${preview.url || 'preview'}-${index}`}
                            preview={preview}
                            showRemoveButton={false}
                        />
                    ))}
                </div>
            )}
        </>
    )
})
