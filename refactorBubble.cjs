const fs = require('fs');
const filePath = 'src/components/messaging/MessageBubble.tsx';
let code = fs.readFileSync(filePath, 'utf8');
const lines = code.split('\n');

// Find the start of Message Content
const mediaStartIndex = lines.findIndex(line => line.includes("{/* Message Content */}")); // line 671 roughly
// Find the end of Media (just before the fallback flex flex-col gap-2)
const mediaEndIndex = lines.findIndex((line, i) => i > mediaStartIndex && line.includes('<div className="flex flex-col gap-2">'));

if (mediaStartIndex !== -1 && mediaEndIndex !== -1) {
    const beforeMedia = lines.slice(0, mediaStartIndex + 1);
    const newMedia = `              {message.type === 'image' || message.type === 'video' ? (
                <MessageMedia
                  message={message}
                  isOwn={isOwn}
                  content={content}
                  onRetryUpload={handleRetryUpload}
                  onImageClick={(index) => {
                    const conversationMessages = useMessagingStore.getState().messages.get(message.conversation_id) || []
                    const allImages = []
                    let globalIndex = 0
                    let found = false

                    conversationMessages.forEach((msg) => {
                      if (msg.type === 'image' && Array.isArray(msg.media_urls) && msg.media_urls.length > 0 && !msg._optimistic) {
                        if (msg.id === message.id) {
                          globalIndex = allImages.length + index
                          found = true
                        }
                        allImages.push(...msg.media_urls)
                      }
                    })

                    if (!found && message.media_urls) {
                      allImages.push(...message.media_urls)
                      globalIndex = index
                    }

                    setLightboxImages(allImages)
                    setLightboxInitialIndex(globalIndex)
                    setLightboxOpen(true)
                  }}
                  onVideoFullscreen={() => setShowVideoPlayer(true)}
                />
              ) : (`;
    const afterMedia = lines.slice(mediaEndIndex);
    code = [...beforeMedia, newMedia, ...afterMedia].join('\n');
} else {
    console.log("Could not find media block");
}

// Reload lines
const lines2 = code.split('\n');
const statusStartIndex = lines2.findIndex(line => line.includes("{/* Timestamp & Status Row */}"));
const statusEndIndex = lines2.findIndex((line, i) => i > statusStartIndex && line.includes("{/* Message Reactions (Displays below bubble) */}"));

if (statusStartIndex !== -1 && statusEndIndex !== -1) {
    const beforeStatus = lines2.slice(0, statusStartIndex + 1);
    const newStatus = `              <MessageStatus
                message={message}
                isOwn={isOwn}
                isPinned={isMessagePinned?.(message.id)}
                showReadAsDelivered={showReadAsDelivered}
              />
            </div>`;
    // The afterStatus should start exactly on the "Message Reactions" line 
    const afterStatus = lines2.slice(statusEndIndex);
    code = [...beforeStatus, newStatus, ...afterStatus].join('\n');
} else {
    console.log("Could not find status block");
}

fs.writeFileSync(filePath, code);
console.log("MessageBubble refactored successfully!");
