import React from 'react'
import { Outlet, useParams } from 'react-router-dom'
import { ConversationListSidebar } from './ConversationListSidebar'
import { cn } from '../../lib/utils'

/**
 * MessagingLayout Component
 * 
 * Implements a responsive split-view layout for messaging:
 * - Desktop: Sidebar (Left) + Chat/Empty (Right)
 * - Mobile: Sidebar OR Chat (based on route)
 */
export function MessagingLayout() {
  const { conversationId } = useParams<{ conversationId: string }>()

  // Logic to determine visibility based on route and screen size
  // On mobile:
  // - If conversationId exists -> Show Chat (Hide Sidebar)
  // - If no conversationId -> Show Sidebar (Hide Chat)
  // On desktop:
  // - Always show Sidebar
  // - Always show Chat (or Empty State)

  return (
    <div className="flex flex-1 min-h-0 bg-gray-50 overflow-x-hidden w-full max-w-full"> {/* Fill parent container properly without percentage overflow bugs */}
      {/* Sidebar Area */}
      <div className={cn(
        "w-full md:w-[350px] lg:w-[380px] border-r bg-white flex flex-col flex-1 min-h-0 md:flex-none md:h-full z-10",
        conversationId ? "hidden md:flex" : "flex"
      )}>
        <ConversationListSidebar />
      </div>

      {/* Main Content Area */}
      <div className={cn(
        "flex-1 flex flex-col min-h-0 min-w-0 bg-white overflow-x-hidden max-w-full",
        !conversationId ? "hidden md:flex" : "flex"
      )}>
        <Outlet />
      </div>
    </div>
  )
}
