import React, { useState } from 'react'
import { BellOff, Clock } from 'lucide-react'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { Capacitor } from '@capacitor/core'
import { conversationManagementService, type MuteDuration } from '../../services/conversationManagementService'
import { toast } from 'react-hot-toast'
import { cn } from '../../lib/utils'

interface Props {
  conversationId: string
  conversationName: string
  isMuted: boolean
  onClose: () => void
  onMuted: () => void
}

export function MuteConversationDialog({
  conversationId,
  conversationName,
  isMuted,
  onClose,
  onMuted
}: Props) {
  const [selectedDuration, setSelectedDuration] = useState<MuteDuration>('1h')
  const [isMuting, setIsMuting] = useState(false)

  const durations: Array<{ value: MuteDuration; label: string; description: string }> = [
    { value: '1h', label: '1 hour', description: 'Mute for 1 hour' },
    { value: '8h', label: '8 hours', description: 'Mute for 8 hours' },
    { value: '1week', label: '1 week', description: 'Mute for 1 week' },
    { value: 'forever', label: 'Forever', description: 'Mute until you unmute' },
  ]

  const handleMute = async () => {
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Light })
    }

    setIsMuting(true)

    try {
      await conversationManagementService.muteConversation(conversationId, selectedDuration)
      toast.success(`Muted for ${durations.find(d => d.value === selectedDuration)?.label}`)
      onMuted()
      onClose()
    } catch (error) {
      console.error('Mute failed:', error)
      toast.error('Failed to mute conversation')
    } finally {
      setIsMuting(false)
    }
  }

  const handleUnmute = async () => {
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Light })
    }

    setIsMuting(true)

    try {
      await conversationManagementService.unmuteConversation(conversationId)
      toast.success('Conversation unmuted')
      onMuted()
      onClose()
    } catch (error) {
      console.error('Unmute failed:', error)
      toast.error('Failed to unmute conversation')
    } finally {
      setIsMuting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex items-center gap-3 mb-4">
          <BellOff className="w-6 h-6 text-gray-600" />
          <h2 className="text-xl font-semibold">
            {isMuted ? 'Unmute Conversation' : 'Mute Notifications'}
          </h2>
        </div>

        {isMuted ? (
          <div>
            <p className="text-gray-600 mb-6">
              Unmute notifications for "{conversationName}"?
            </p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={isMuting}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUnmute}
                disabled={isMuting}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isMuting ? 'Unmuting...' : 'Unmute'}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-gray-600 mb-4">
              Mute notifications for "{conversationName}"
            </p>

            <div className="space-y-2 mb-6">
              {durations.map(duration => (
                <label
                  key={duration.value}
                  className={cn(
                    'flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors',
                    selectedDuration === duration.value
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <input
                    type="radio"
                    checked={selectedDuration === duration.value}
                    onChange={() => setSelectedDuration(duration.value)}
                    className="text-blue-600"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{duration.label}</div>
                    <div className="text-sm text-gray-600">{duration.description}</div>
                  </div>
                  <Clock className="w-4 h-4 text-gray-400" />
                </label>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={isMuting}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleMute}
                disabled={isMuting}
                className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
              >
                {isMuting ? 'Muting...' : 'Mute'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
