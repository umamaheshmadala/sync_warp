import React, { useState, useRef } from 'react'
import { Archive, Pin, ArchiveX, PinOff } from 'lucide-react'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { Capacitor } from '@capacitor/core'
import { conversationManagementService } from '../../services/conversationManagementService'
import { toast } from 'react-hot-toast'
import { cn } from '../../lib/utils'

interface Props {
  conversation: any
  onUpdate?: () => void
  children: React.ReactNode
}

export function SwipeableConversationCard({ conversation, onUpdate, children }: Props) {
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [isSwipingLeft, setIsSwipingLeft] = useState(false)
  const [isSwipingRight, setIsSwipingRight] = useState(false)
  const startX = useRef(0)
  const currentX = useRef(0)

  const SWIPE_THRESHOLD = 80 // pixels to trigger action
  const MAX_SWIPE = 120 // maximum swipe distance

  // Debug: Log when component mounts
  React.useEffect(() => {
    console.log('🔄 SwipeableConversationCard mounted')
    console.log('  - Capacitor.isNativePlatform():', Capacitor.isNativePlatform())
    console.log('  - Conversation:', conversation.other_participant_name)
  }, [])

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!Capacitor.isNativePlatform()) {
      console.log('⚠️ Touch start ignored - not native platform')
      return
    }
    startX.current = e.touches[0].clientX
    console.log('👆 Touch start at X:', startX.current)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!Capacitor.isNativePlatform()) return
    currentX.current = e.touches[0].clientX
    const diff = currentX.current - startX.current

    // Limit swipe distance
    const limitedDiff = Math.max(-MAX_SWIPE, Math.min(MAX_SWIPE, diff))
    setSwipeOffset(limitedDiff)

    setIsSwipingLeft(limitedDiff < -20)
    setIsSwipingRight(limitedDiff > 20)
    
    if (Math.abs(limitedDiff) > 20) {
      console.log('👉 Swiping:', limitedDiff > 0 ? 'RIGHT' : 'LEFT', 'offset:', limitedDiff)
    }
  }

  const handleTouchEnd = async () => {
    if (!Capacitor.isNativePlatform()) {
      console.log('⚠️ Touch end ignored - not native platform')
      return
    }

    const diff = currentX.current - startX.current
    console.log('🏁 Touch end - diff:', diff, 'threshold:', SWIPE_THRESHOLD)

    try {
      // Swipe left = Archive
      if (diff < -SWIPE_THRESHOLD) {
        console.log('📦 Archive action triggered')
        await Haptics.impact({ style: ImpactStyle.Medium })

        if (conversation.is_archived) {
          await conversationManagementService.unarchiveConversation(conversation.id)
          toast.success('Conversation unarchived')
        } else {
          await conversationManagementService.archiveConversation(conversation.id)
          toast.success('Conversation archived')
        }

        onUpdate?.()
      }
      // Swipe right = Pin
      else if (diff > SWIPE_THRESHOLD) {
        console.log('📌 Pin action triggered')
        await Haptics.impact({ style: ImpactStyle.Medium })

        if (conversation.is_pinned) {
          await conversationManagementService.unpinConversation(conversation.id)
          toast.success('Conversation unpinned')
        } else {
          await conversationManagementService.pinConversation(conversation.id)
          toast.success('Conversation pinned')
        }

        onUpdate?.()
      } else {
        console.log('⏹️ Swipe too short - no action')
      }
    } catch (error) {
      console.error('❌ Swipe action failed:', error)
      toast.error('Action failed')
    } finally {
      // Reset
      setSwipeOffset(0)
      setIsSwipingLeft(false)
      setIsSwipingRight(false)
    }
  }

  return (
    <div className="relative overflow-hidden">
      {/* Swipe actions background */}
      <div className="absolute inset-0 flex items-center justify-between px-6">
        {/* Right swipe action (Pin) */}
        <div className={cn(
          'flex items-center gap-2 transition-opacity',
          isSwipingRight ? 'opacity-100' : 'opacity-0'
        )}>
          {conversation.is_pinned ? (
            <>
              <PinOff className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-600">Unpin</span>
            </>
          ) : (
            <>
              <Pin className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-600">Pin</span>
            </>
          )}
        </div>

        {/* Left swipe action (Archive) */}
        <div className={cn(
          'flex items-center gap-2 transition-opacity',
          isSwipingLeft ? 'opacity-100' : 'opacity-0'
        )}>
          {conversation.is_archived ? (
            <>
              <span className="text-sm font-medium text-gray-600">Unarchive</span>
              <ArchiveX className="w-5 h-5 text-gray-600" />
            </>
          ) : (
            <>
              <span className="text-sm font-medium text-gray-600">Archive</span>
              <Archive className="w-5 h-5 text-gray-600" />
            </>
          )}
        </div>
      </div>

      {/* Conversation card */}
      <div
        className="relative bg-white transition-transform"
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: swipeOffset === 0 ? 'transform 0.2s ease-out' : 'none'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  )
}
