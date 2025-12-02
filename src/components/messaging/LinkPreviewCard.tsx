// src/components/messaging/LinkPreviewCard.tsx
import React from 'react'
import { X, Gift, Tag, ExternalLink } from 'lucide-react'
import { LinkPreview } from '../../services/linkPreviewService'

interface Props {
  preview: LinkPreview
  onRemove?: () => void
  showRemoveButton?: boolean
}

export function LinkPreviewCard({ preview, onRemove, showRemoveButton = true }: Props) {
  const handleLinkClick = (e: React.MouseEvent, url: string) => {
    e.preventDefault()
    window.open(url, '_blank', 'noopener,noreferrer')
  }
  
  const renderSyncCouponPreview = () => (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3 flex gap-3">
      <div className="flex-shrink-0">
        <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
          <Gift className="w-6 h-6 text-white" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 text-sm line-clamp-1">
              {preview.title}
            </h4>
            <p className="text-xs text-gray-600 mt-1 line-clamp-2">
              {preview.description}
            </p>
            {preview.metadata?.brandName && (
              <p className="text-xs text-blue-600 mt-1">
                {preview.metadata.brandName}
              </p>
            )}
          </div>
          {showRemoveButton && onRemove && (
            <button
              onClick={onRemove}
              className="flex-shrink-0 p-1 hover:bg-blue-100 rounded"
              aria-label="Remove preview"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          )}
        </div>
      </div>
    </div>
  )

  const renderSyncDealPreview = () => (
    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-3 flex gap-3">
      <div className="flex-shrink-0">
        {preview.image ? (
          <img 
            src={preview.image} 
            alt=""
            className="w-12 h-12 rounded-lg object-cover"
          />
        ) : (
          <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
            <Tag className="w-6 h-6 text-white" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 text-sm line-clamp-1">
              {preview.title}
            </h4>
            <p className="text-xs text-gray-600 mt-1 line-clamp-2">
              {preview.description}
            </p>
            {preview.metadata?.savings && (
              <p className="text-xs font-medium text-green-600 mt-1">
                Save ${preview.metadata.savings.toFixed(2)}
              </p>
            )}
          </div>
          {showRemoveButton && onRemove && (
            <button
              onClick={onRemove}
              className="flex-shrink-0 p-1 hover:bg-green-100 rounded"
              aria-label="Remove preview"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          )}
        </div>
      </div>
    </div>
  )

  const renderGenericPreview = () => (
    <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
      {preview.image && (
        <img 
          src={preview.image} 
          alt=""
          className="w-full h-32 object-cover"
        />
      )}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
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
            <button
              onClick={(e) => handleLinkClick(e, preview.url)}
              className="text-xs text-blue-600 hover:underline mt-1 inline-flex items-center gap-1"
            >
              {new URL(preview.url).hostname}
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
          {showRemoveButton && onRemove && (
            <button
              onClick={onRemove}
              className="flex-shrink-0 p-1 hover:bg-gray-200 rounded"
              aria-label="Remove preview"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          )}
        </div>
      </div>
    </div>
  )

  switch (preview.type) {
    case 'sync-coupon':
      return renderSyncCouponPreview()
    case 'sync-deal':
      return renderSyncDealPreview()
    case 'generic':
    default:
      return renderGenericPreview()
  }
}
