import React, { useState, useEffect, useRef } from 'react'
import { X, Send, Play, Pause, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'

interface VideoPreviewModalProps {
    file: File | null
    videoPath?: string // For native mobile path
    onClose: () => void
    onSend: (caption: string, thumbnail?: Blob) => void
}

export function VideoPreviewModal({ file, videoPath, onClose, onSend }: VideoPreviewModalProps) {
    const [caption, setCaption] = useState('')
    const [isPlaying, setIsPlaying] = useState(false)
    const [videoUrl, setVideoUrl] = useState<string>('')
    const videoRef = useRef<HTMLVideoElement>(null)

    useEffect(() => {
        let url = ''
        if (file) {
            url = URL.createObjectURL(file)
            setVideoUrl(url)
        } else if (videoPath) {
            // For native, we might need a special handler, but for now assuming typical URL
            setVideoUrl(videoPath)
        }

        return () => {
            if (url) URL.revokeObjectURL(url)
        }
    }, [file, videoPath])

    // Effect for native path handling
    useEffect(() => {
        const loadNativeVideo = async () => {
            if (!file && videoPath) {
                // Dynamic import to avoid SSR issues if any (though this is SPA)
                const { Capacitor } = await import('@capacitor/core')
                if (Capacitor.isNativePlatform()) {
                    const src = Capacitor.convertFileSrc(videoPath)
                    setVideoUrl(src)
                } else {
                    setVideoUrl(videoPath)
                }
            }
        }
        loadNativeVideo()
    }, [file, videoPath])

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause()
            } else {
                videoRef.current.play()
            }
            setIsPlaying(!isPlaying)
        }
    }

    const handleSend = async () => {
        try {
            let thumbnailBlob: Blob | undefined

            // Try to capture thumbnail from video element
            if (videoRef.current) {
                const video = videoRef.current
                const canvas = document.createElement('canvas')
                // Scale down logic (similar to mediaUploadService)
                const scale = Math.min(300 / video.videoWidth, 300 / video.videoHeight)
                canvas.width = video.videoWidth * scale
                canvas.height = video.videoHeight * scale

                const ctx = canvas.getContext('2d')
                ctx?.drawImage(video, 0, 0, canvas.width, canvas.height)

                thumbnailBlob = await new Promise<Blob | undefined>(resolve =>
                    canvas.toBlob(b => resolve(b || undefined), 'image/jpeg', 0.8)
                )
            }
            // cast to any to avoid strict type error if we didn't update prop type yet
            onSend(caption, thumbnailBlob as any)
        } catch (e) {
            console.error('Failed to capture thumbnail:', e)
            onSend(caption)
        }
    }

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 md:p-6"
            >
                <div className="w-full max-w-4xl h-full flex flex-col gap-4 relative">

                    {/* Close Button - Always Top Right */}
                    <button
                        onClick={onClose}
                        className="absolute top-2 right-2 z-50 p-2 text-white/80 hover:text-white bg-black/50 rounded-full"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    {/* Main Preview Area */}
                    <div className="flex-1 flex items-center justify-center relative bg-black/50 rounded-lg overflow-hidden min-h-0">
                        <video
                            ref={videoRef}
                            src={videoUrl}
                            className="w-full h-full object-contain"
                            onClick={togglePlay}
                            onEnded={() => setIsPlaying(false)}
                            onPlay={() => setIsPlaying(true)}
                            onPause={() => setIsPlaying(false)}
                            playsInline
                            controls={false}
                            crossOrigin="anonymous"
                            onLoadedMetadata={(e) => {
                                e.currentTarget.currentTime = 0.1
                            }}
                        />

                        {/* Play/Pause Center Button Overlay */}
                        {!isPlaying && (
                            <div
                                className="absolute inset-0 flex items-center justify-center bg-black/20 cursor-pointer"
                                onClick={togglePlay}
                            >
                                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-all">
                                    <Play className="w-8 h-8 text-white ml-1" fill="currentColor" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input Area - Bottom Bar */}
                    <div className="w-full shrink-0 flex gap-3 items-end bg-gray-900/80 p-3 rounded-xl backdrop-blur-sm">
                        <div className="flex-1 relative">
                            <Textarea
                                value={caption}
                                onChange={(e) => setCaption(e.target.value)}
                                placeholder="Add a caption..."
                                className="w-full min-h-[44px] max-h-[120px] bg-white/10 border-white/20 text-white placeholder:text-white/50 resize-nbone rounded-lg focus-visible:ring-1 focus-visible:ring-white/50 py-2.5"
                                rows={1}
                            />
                        </div>

                        <Button
                            onClick={handleSend}
                            className="bg-primary hover:bg-primary/90 text-white rounded-full w-11 h-11 p-0 flex items-center justify-center shrink-0 mb-[1px]"
                        >
                            <Send className="w-5 h-5 ml-0.5" />
                        </Button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    )
}
