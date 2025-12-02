import React from 'react'
import { AlertCircle, RefreshCw, Trash2 } from 'lucide-react'
import { Button } from '../ui/button'

interface ImageUploadErrorProps {
  error: string
  onRetry: () => void
  onDelete: () => void
}

/**
 * ImageUploadError Component
 * 
 * Displays error state for failed image uploads
 * 
 * Features:
 * - Error icon and message
 * - Retry button
 * - Delete button
 * - Clear visual feedback
 */
export function ImageUploadError({
  error,
  onRetry,
  onDelete
}: ImageUploadErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center p-6 bg-red-50 rounded-lg border-2 border-red-200">
      {/* Error Icon */}
      <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center mb-3">
        <AlertCircle className="w-6 h-6 text-white" />
      </div>

      {/* Error Message */}
      <p className="text-sm font-medium text-red-900 mb-1">Upload Failed</p>
      <p className="text-xs text-red-700 text-center mb-4 max-w-xs">
        {error}
      </p>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          onClick={onRetry}
          size="sm"
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          <RefreshCw className="w-4 h-4 mr-1" />
          Retry
        </Button>
        <Button
          onClick={onDelete}
          size="sm"
          variant="outline"
          className="border-red-300 text-red-700 hover:bg-red-50"
        >
          <Trash2 className="w-4 h-4 mr-1" />
          Delete
        </Button>
      </div>
    </div>
  )
}
