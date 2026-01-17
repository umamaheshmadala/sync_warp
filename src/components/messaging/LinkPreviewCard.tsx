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

// Imports from existing file...
import { FollowButton } from '../following/FollowButton'
import { FavoriteProductButton } from '../favorites/FavoriteProductButton'
import { FavoriteOfferButton } from '../favorites/FavoriteOfferButton'
import { AddFriendButton } from '../friends/AddFriendButton'
import { unifiedShareService } from '../../services/unifiedShareService'
import { useAuthStore } from '../../store/authStore'
import { useDeepLinkStore } from '../../store/deepLinkStore'

interface Props {
  preview: LinkPreview
  onRemove?: () => void
  showRemoveButton?: boolean
  isLoading?: boolean
  showActions?: boolean // New prop
}

export function LinkPreviewCard({ preview, onRemove, showRemoveButton = true, isLoading, showActions = true }: Props) {
  const navigate = useNavigate()
  const user = useAuthStore(state => state.user)

  // Deep link store for opening modals (AC-18)
  const { openOffer, openProfile, openProduct } = useDeepLinkStore()

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

    // Storefront/Product/Offer/Profile navigation - NOW WITH MODAL SUPPORT (AC-18)
    if (['sync-storefront', 'sync-product', 'sync-offer', 'sync-profile', 'sync-deal', 'sync-coupon'].includes(preview.type)) {
      const { businessSlug, productId, offerId, userId, entityId, businessId } = preview.metadata || {}

      switch (preview.type) {
        case 'sync-storefront':
          // Storefront: Navigate to page (not modal)
          if (businessSlug) navigate(`/business/${businessSlug}`)
          else if (businessId || entityId) navigate(`/business/${businessId || entityId}`)
          break
        case 'sync-product':
          // Product: Open modal
          const pid = productId || entityId
          const bsForProduct = businessSlug || businessId
          if (pid && bsForProduct) {
            openProduct(pid, bsForProduct)
          }
          break
        case 'sync-coupon':
          const couponId = (preview.metadata as any)?.couponId || entityId
          if (couponId) navigate(`/coupons/${couponId}`)
          break
        case 'sync-offer':
        case 'sync-deal':
          // Offer: Open modal
          const oid = offerId || entityId
          if (oid) {
            openOffer(oid)
          }
          break
        case 'sync-profile':
          // Profile: Open modal
          const uid = userId || entityId
          if (uid) {
            openProfile(uid)
          }
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

  // Handle Conversion Tracking
  const handleActionClick = (type: 'follow' | 'favorite' | 'add_friend') => {
    const { shareEventId, entityId } = preview.metadata || {}
    if (shareEventId && user?.id) {
      unifiedShareService.trackConversion(shareEventId, type, user.id)
        .catch(err => console.error('Failed to track conversion:', err));
    }
  }

  const renderActionRow = () => {
    if (!showActions) return null
    const { entityId, businessId, productId, offerId, userId } = preview.metadata || {}
    const id = entityId || businessId || productId || offerId || userId

    if (!id) return null

    // Determine button based on type
    let actionButton = null
    switch (preview.type) {
      case 'sync-storefront': // Follow Business
        // Need businessId
        if (preview.metadata?.businessId || preview.metadata?.entityId) {
          const bid = preview.metadata.businessId || preview.metadata.entityId
          actionButton = (
            <div onClickCapture={() => handleActionClick('follow')}>
              <FollowButton
                businessId={bid}
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-xs"
              />
            </div>
          )
        }
        break
      case 'sync-product': // Favorite Product
        if (preview.metadata?.productId || preview.metadata?.entityId) {
          const pid = preview.metadata.productId || preview.metadata.entityId
          actionButton = (
            <div onClickCapture={() => handleActionClick('favorite')}>
              <FavoriteProductButton
                productId={pid}
                iconOnly={false}
                className="h-8 px-3 text-xs bg-white/80 hover:bg-white shadow-sm border-none"
              />
            </div>
          )
        }
        break
      case 'sync-offer': // Favorite Offer
      case 'sync-deal':
      case 'sync-coupon':
        if (preview.metadata?.offerId || preview.metadata?.entityId) {
          const oid = preview.metadata.offerId || preview.metadata.entityId
          actionButton = (
            <div onClickCapture={() => handleActionClick('favorite')}>
              <FavoriteOfferButton
                offerId={oid}
                className="h-8 px-3 text-xs bg-white/80 hover:bg-white shadow-sm border-none"
                iconClassName="w-3.5 h-3.5"
              />
            </div>
          )
        }
        break
      case 'sync-profile': // Add Friend
        if (preview.metadata?.userId || preview.metadata?.entityId) {
          const uid = preview.metadata.userId || preview.metadata.entityId
          // Don't show add friend for self
          if (uid === user?.id) return null

          actionButton = (
            <div onClickCapture={() => handleActionClick('add_friend')}>
              <AddFriendButton
                friendId={uid}
                compact={false}
                className="h-8 text-xs px-3"
              />
            </div>
          )
        }
        break
    }

    if (!actionButton) return null

    return (
      <div className="px-3 pb-3 -mt-2 flex justify-end">
        <div onClick={(e) => e.stopPropagation()}>
          {actionButton}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('rounded-lg overflow-hidden border relative group cursor-pointer transition-all hover:shadow-md flex flex-col', getPreviewStyles(preview.type))}>
      <div onClick={handleClick} className="flex-1">
        {renderContent()}
      </div>

      {renderActionRow()}

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

