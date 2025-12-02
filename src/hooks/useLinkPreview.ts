// src/hooks/useLinkPreview.ts
import { useState, useCallback, useEffect } from 'react'
import { linkPreviewService, LinkPreview } from '../services/linkPreviewService'
import { useDebounce } from './useDebounce'

export function useLinkPreview(text: string) {
  const [previews, setPreviews] = useState<LinkPreview[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [removedPreviews, setRemovedPreviews] = useState<Set<string>>(new Set())

  // Debounce text input to avoid excessive API calls
  const debouncedText = useDebounce(text, 500)

  useEffect(() => {
    let cancelled = false

    const generatePreviews = async () => {
      const urls = linkPreviewService.extractUrls(debouncedText)
      if (urls.length === 0) {
        setPreviews([])
        return
      }

      setIsLoading(true)

      try {
        const newPreviews = await linkPreviewService.generatePreviews(debouncedText)
        
        if (!cancelled) {
          // Filter out removed previews
          const filteredPreviews = newPreviews.filter(
            preview => !removedPreviews.has(preview.url)
          )
          setPreviews(filteredPreviews)
        }
      } catch (error) {
        console.error('Failed to generate previews:', error)
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    generatePreviews()

    return () => {
      cancelled = true
    }
  }, [debouncedText, removedPreviews])

  const removePreview = useCallback((url: string) => {
    setRemovedPreviews(prev => new Set(prev).add(url))
    setPreviews(prev => prev.filter(p => p.url !== url))
  }, [])

  const reset = useCallback(() => {
    setPreviews([])
    setRemovedPreviews(new Set())
    setIsLoading(false)
  }, [])

  return {
    previews,
    isLoading,
    removePreview,
    reset
  }
}
