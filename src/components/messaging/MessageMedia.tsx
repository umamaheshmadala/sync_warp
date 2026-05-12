import React, { useState } from 'react'
import { cn } from '../../lib/utils'
import { OptimisticImageMessage } from './OptimisticImageMessage'
import { MediaPlaceholder } from './MediaPlaceholder'
import { OptimisticVideoMessage } from './OptimisticVideoMessage'
import { VideoMessage } from './VideoMessage'
import { ExpandableText } from './ExpandableText'
import { messageCacheManager } from '../../utils/messageCacheManager'
import type { Message } from '../../types/messaging'

interface MessageMediaProps {
    message: Message
    isOwn: boolean
    content: string
    onRetryUpload: () => void
    onImageClick: (index: number) => void
    onVideoFullscreen: () => void
}

export const MessageMedia = React.memo(function MessageMedia({
    message,
    isOwn,
    content,
    onRetryUpload,
    onImageClick,
    onVideoFullscreen
}: MessageMediaProps) {
    const [imageLoadedStates, setImageLoadedStates] = useState<Record<string, boolean>>({})

    const handleCancelUpload = () => {
        if (message._tempId) {
            console.log('🛑 User cancelled upload via UI')
            messageCacheManager.updateMessage(message.conversation_id, message._tempId, {
                _failed: true,
                _uploadProgress: 0
            })
        }
    }

    if (message.type === 'image') {
        if (message.media_urls && message.media_urls.length > 0) {
            if (message._optimistic) {
                // Optimistic UI Grid
                return (
                    <div className={cn(
                        "grid gap-1",
                        message.media_urls.length === 1 ? "grid-cols-1" : "grid-cols-2",
                        message.media_urls.length > 1 ? "max-w-[300px]" : "max-w-sm"
                    )}>
                        {message.media_urls.slice(0, 4).map((url, index) => (
                            <div key={index} className={cn(
                                "relative aspect-square overflow-hidden",
                                message.media_urls!.length === 3 && index === 0 ? "col-span-2 aspect-video" : "",
                                "rounded-lg"
                            )}>
                                <OptimisticImageMessage
                                    thumbnailUrl={url}
                                    fullResUrl={url}
                                    uploadProgress={message._uploadProgress || 0}
                                    status={message._failed ? 'failed' : 'uploading'}
                                    isOwn={isOwn}
                                    onRetry={onRetryUpload}
                                    onCancel={handleCancelUpload}
                                    hideCaption={true}
                                />
                                {index === 3 && message.media_urls!.length > 4 && (
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                                        <span className="text-white text-2xl font-bold">
                                            +{message.media_urls!.length - 4}
                                        </span>
                                    </div>
                                )}
                            </div>
                        ))}
                        {content && (
                            <div className={cn("col-span-full pt-1", isOwn ? "text-right" : "text-left")}>
                                <ExpandableText content={content} limit={40} className="text-sm" isOwn={isOwn} />
                            </div>
                        )}
                    </div>
                )
            } else {
                // Regular Grid
                return (
                    <div className="space-y-1">
                        <div className={cn(
                            "grid gap-1",
                            message.media_urls.length === 1 ? "grid-cols-1" : "grid-cols-2",
                            message.media_urls.length > 1 ? "max-w-[300px]" : "max-w-sm"
                        )}>
                            {message.media_urls.slice(0, 4).map((url, index) => {
                                const isSingle = message.media_urls!.length === 1
                                const hasDim = isSingle && message.media_width && message.media_height

                                if (isSingle) {
                                    return (
                                        <div
                                            key={index}
                                            className="relative cursor-pointer hover:opacity-95 transition-opacity rounded-lg"
                                            onClick={() => onImageClick(index)}
                                        >
                                            <MediaPlaceholder
                                                width={message.media_width || 300}
                                                height={message.media_height || 300}
                                                thumbnailUrl={message.thumbnail_url}
                                                isLoading={!imageLoadedStates[url]}
                                                maxWidth={300}
                                            >
                                                <img decoding="async"
                                                    src={url}
                                                    alt={`Image ${index + 1}`}
                                                    className="w-full h-full object-cover rounded-lg"
                                                    loading="lazy"
                                                    onLoad={() => setImageLoadedStates(prev => ({ ...prev, [url]: true }))}
                                                />
                                            </MediaPlaceholder>
                                        </div>
                                    )
                                }

                                return (
                                    <div
                                        key={index}
                                        className={cn(
                                            "relative cursor-pointer overflow-hidden rounded-lg hover:opacity-95 transition-opacity aspect-square",
                                            message.media_urls!.length === 3 && index === 0 ? "col-span-2 aspect-video" : ""
                                        )}
                                        onClick={() => onImageClick(index)}
                                    >
                                        <img decoding="async"
                                            src={url}
                                            alt={`Image ${index + 1}`}
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                        />
                                        {index === 3 && message.media_urls!.length > 4 && (
                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                <span className="text-white text-2xl font-bold">
                                                    +{message.media_urls!.length - 4}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                        {content && (
                            <ExpandableText content={content} limit={40} className="mt-1 text-sm pl-1" isOwn={isOwn} />
                        )}
                    </div>
                )
            }
        } else {
            // Missing media fallback
            return (
                <div className="p-4 bg-gray-100 rounded-lg border border-gray-200 text-center min-w-[200px]">
                    <p className="text-sm text-gray-500 italic">Image unavailable</p>
                    <p className="text-xs text-gray-400 mt-1">Media URL missing</p>
                    {content && (
                        <ExpandableText content={content} limit={40} className="mt-2 text-sm text-left" isOwn={isOwn} />
                    )}
                </div>
            )
        }
    }

    if (message.type === 'video') {
        if (message.media_urls && message.media_urls.length > 0) {
            if (message._optimistic) {
                return (
                    <OptimisticVideoMessage
                        thumbnailUrl={message.thumbnail_url || message.media_urls[0]}
                        fullResUrl={message.media_urls[0]}
                        uploadProgress={message._uploadProgress || 0}
                        status={message._failed ? 'failed' : 'uploading'}
                        caption={content}
                        isOwn={isOwn}
                        onCancel={handleCancelUpload}
                    />
                )
            } else {
                return (
                    <div className="space-y-2">
                        <VideoMessage
                            id={message.id}
                            videoUrl={message.media_urls[0]}
                            thumbnailUrl={message.thumbnail_url}
                            duration={undefined}
                            width={message.media_width || undefined}
                            height={message.media_height || undefined}
                            onFullscreen={onVideoFullscreen}
                        />
                        {content && (
                            <ExpandableText content={content} limit={40} className="mt-2 text-sm" isOwn={isOwn} />
                        )}
                    </div>
                )
            }
        } else {
            return (
                <div className="p-4 bg-gray-100 rounded-lg border border-gray-200 text-center min-w-[200px]">
                    <p className="text-sm text-gray-500 italic">Video unavailable</p>
                    <p className="text-xs text-gray-400 mt-1">Media URL missing</p>
                    {content && (
                        <ExpandableText content={content} limit={40} className="mt-2 text-sm text-left" isOwn={isOwn} />
                    )}
                </div>
            )
        }
    }

    return null
})
