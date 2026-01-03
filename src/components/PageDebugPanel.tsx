// src/components/PageDebugPanel.tsx
// Compact debug panel to show page-specific stats (replaces large summary cards)
import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface PageDebugPanelProps {
  pageName: string
  stats: Record<string, string | number>
}

export default function PageDebugPanel({ pageName, stats }: PageDebugPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (import.meta.env.MODE !== 'development') {
    return null
  }

  return (
    <div className="fixed bottom-20 right-4 z-40 bg-gray-900 text-white rounded-lg shadow-xl max-w-xs">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-2 hover:bg-gray-800 rounded-t-lg transition-colors"
      >
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-sm font-semibold">{pageName}</span>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronUp className="w-4 h-4" />
        )}
      </button>

      {/* Stats - Expandable */}
      {isExpanded && (
        <div className="px-4 py-3 border-t border-gray-700 space-y-2">
          {Object.entries(stats).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between text-xs">
              <span className="text-gray-400">{key}:</span>
              <span className="font-mono text-green-400">{value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
