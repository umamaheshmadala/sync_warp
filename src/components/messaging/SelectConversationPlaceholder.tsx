import React from 'react'
import { MessageSquare } from 'lucide-react'

export function SelectConversationPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-gray-50">
      <div className="bg-white p-4 rounded-full shadow-sm mb-4">
        <MessageSquare className="h-12 w-12 text-gray-400" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">
        Select a conversation
      </h2>
      <p className="text-gray-500 max-w-sm">
        Choose a conversation from the list on the left to start chatting, or start a new one.
      </p>
    </div>
  )
}
