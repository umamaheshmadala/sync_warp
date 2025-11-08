import React, { useState } from 'react'
import { pushNotificationService } from '../services/pushNotifications'
import './PushNotificationPrompt.css'

export const PushNotificationPrompt: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true)
  const [requesting, setRequesting] = useState(false)

  const handleEnable = async () => {
    setRequesting(true)
    
    const granted = await pushNotificationService.requestPermissions()
    
    if (granted) {
      console.log('Push notifications enabled')
      setIsVisible(false)
    } else {
      alert('Push notifications were denied. You can enable them in Settings.')
    }
    
    setRequesting(false)
  }

  const handleDismiss = () => {
    setIsVisible(false)
    // Save dismissal to local storage to not show again
    localStorage.setItem('push_prompt_dismissed', 'true')
  }

  // Don't show if previously dismissed
  if (localStorage.getItem('push_prompt_dismissed')) {
    return null
  }

  if (!isVisible) return null

  return (
    <div className="push-prompt">
      <div className="push-prompt__content">
        <div className="push-prompt__icon">🔔</div>
        <div className="push-prompt__text">
          <h3>Stay Updated</h3>
          <p>Get notified about new reviews, offers, and followers</p>
        </div>
      </div>
      
      <div className="push-prompt__actions">
        <button 
          onClick={handleEnable}
          disabled={requesting}
          className="push-prompt__button push-prompt__button--primary"
        >
          {requesting ? 'Enabling...' : 'Enable Notifications'}
        </button>
        <button 
          onClick={handleDismiss}
          className="push-prompt__button push-prompt__button--secondary"
        >
          Not Now
        </button>
      </div>
    </div>
  )
}
