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

  const renderCouponShared = () => (
    <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300 rounded-lg p-4 shadow-sm">
      <div className="flex gap-3">
        <div className="flex-shrink-0">
          <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
            <Gift className="w-7 h-7 text-white" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Gift className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-semibold text-purple-600 uppercase tracking-wide">
                  Coupon Shared
                </span>
              </div>
              <h4 className="font-bold text-gray-900 text-base line-clamp-1">
                {preview.title}
              </h4>
            </div>
          </div>
          
          {preview.description && (
            <p className="text-sm text-gray-700 mb-2">
              {preview.description}
            </p>
          )}
          
          {preview.metadata && (
            <div className="space-y-1 text-xs text-gray-600">
              {preview.metadata.business_name && (
                <div className="flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  <span>{preview.metadata.business_name}</span>
                </div>
              )}
              {preview.metadata.valid_until && (
                <div className="flex items-center gap-1">
                  <span className="font-medium">Expires:</span>
                  <span>{new Date(preview.metadata.valid_until).toLocaleDateString()}</span>
                </div>
              )}
              {preview.metadata.discount_value && (
                <div className="inline-block mt-2 px-3 py-1 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-full font-bold text-sm">
                  {preview.metadata.discount_value}% OFF
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  const renderCouponShareFailed = () => (
    <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
      <div className="flex gap-3">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center">
            <X className="w-6 h-6 text-white" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-red-900 text-sm mb-1">
            {preview.title}
          </h4>
          <p className="text-xs text-red-700">
            {preview.description}
          </p>
        </div>
      </div>
    </div>
  )

  switch (preview.type) {
    case 'sync-coupon':
      return renderSyncCouponPreview()
    case 'sync-deal':
      return renderSyncDealPreview()
    case 'coupon_shared':
      return renderCouponShared()
    case 'coupon_share_failed':
      return renderCouponShareFailed()
    case 'generic':
    default:
      return renderGenericPreview()
  }
}
