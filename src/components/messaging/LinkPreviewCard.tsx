import React from 'react'
import { X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { LinkPreview } from '../../types/messaging'
import { cn } from '../../lib/utils'
import {
  StorefrontPreview,
  ProductPreview,
  OfferPreview,
  ProfilePreview,
  GenericPreview,
  GenericLoadingPreview
} from './previews'

interface Props {
  preview: LinkPreview
  onRemove?: () => void
  showRemoveButton?: boolean
  isLoading?: boolean
}

export function LinkPreviewCard({ preview, onRemove, showRemoveButton = true, isLoading }: Props) {
  const navigate = useNavigate()

  if (isLoading) {
    return (
      <div className="rounded-lg overflow-hidden border border-gray-200 bg-white">
        <GenericLoadingPreview />
      </div>
    )
  }

  const handleClick = (e: React.MouseEvent) => {
    // If clicking remove button or interactive elements
    if ((e.target as HTMLElement).closest('button')) return

    e.preventDefault()

    // Storefront/Product/Offer/Profile navigation
    if (['sync-storefront', 'sync-product', 'sync-offer', 'sync-profile', 'sync-deal', 'sync-coupon'].includes(preview.type)) {
      const { businessSlug, productId, offerId, userId, entityId } = preview.metadata || {}

      switch (preview.type) {
        case 'sync-storefront':
          if (businessSlug) navigate(`/business/${businessSlug}`)
          break
        case 'sync-product':
          if (businessSlug && (productId || entityId)) navigate(`/business/${businessSlug}/product/${productId || entityId}`)
          break
        case 'sync-coupon':
          const couponId = (preview.metadata as any)?.couponId || entityId
          if (couponId) navigate(`/coupons/${couponId}`)
          break
        case 'sync-offer':
        case 'sync-deal':
          const oid = offerId || entityId
          if (businessSlug && oid) navigate(`/business/${businessSlug}/offer/${oid}`)
          else if (oid) navigate(`/offers/${oid}`)
          break
        case 'sync-profile':
          if (userId || entityId) navigate(`/profile/${userId || entityId}`)
          break
      }
      return
    }

    // Generic or System
    if (preview.url && !preview.url.startsWith('/')) {
      window.open(preview.url, '_blank', 'noopener,noreferrer')
    }
  }

  const getPreviewStyles = (type: LinkPreview['type']) => {
    switch (type) {
      case 'sync-storefront': return 'bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200'
      case 'sync-product': return 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
      case 'sync-offer':
      case 'sync-deal':
      case 'sync-coupon':
        return 'bg-gradient-to-r from-orange-50 to-red-50 border-orange-200'
      case 'sync-profile': return 'bg-white border-gray-200'
      default: return 'bg-gray-50 border-gray-200'
    }
  }

  const renderContent = () => {
    switch (preview.type) {
      case 'sync-storefront': return <StorefrontPreview preview={preview} />
      case 'sync-product': return <ProductPreview preview={preview} />
      case 'sync-offer': return <OfferPreview preview={preview} />
      case 'sync-profile': return <ProfilePreview preview={preview} />

      // Legacy mapping
      case 'sync-deal': return <OfferPreview preview={preview} />
      case 'sync-coupon': return <OfferPreview preview={preview} />

      default: return <GenericPreview preview={preview} />
    }
  }

  return (
    <div className={cn('rounded-lg overflow-hidden border relative group cursor-pointer transition-all hover:shadow-md', getPreviewStyles(preview.type))}>
      <div onClick={handleClick}>
        {renderContent()}
      </div>

      {showRemoveButton && onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          className="absolute top-2 right-2 p-1 bg-white/80 hover:bg-white rounded-full transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100 shadow-sm z-10"
          aria-label="Remove preview"
        >
          <X className="w-3 h-3 text-gray-500" />
        </button>
      )}
    </div>
  )
}

