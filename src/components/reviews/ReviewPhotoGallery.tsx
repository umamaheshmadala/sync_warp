import { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface ReviewPhotoGalleryProps {
    photos: string[] | null;
    compact?: boolean;
}

export function ReviewPhotoGallery({ photos, compact = false }: ReviewPhotoGalleryProps) {
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);

    // Safe check for valid photos array
    const validPhotos = photos?.filter(url => !!url) || [];

    if (validPhotos.length === 0) return null;

    const handlePrev = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev === 0 ? validPhotos.length - 1 : prev - 1));
    };

    const handleNext = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev === validPhotos.length - 1 ? 0 : prev + 1));
    };

    const openLightbox = (index: number) => {
        setCurrentIndex(index);
        setLightboxOpen(true);
    };

    const sizeClass = compact ? 'w-12 h-12' : 'w-24 h-24';

    return (
        <>
            {/* Thumbnail Grid */}
            <div className="mt-2">
                {validPhotos.length === 1 ? (
                    // Single photo - larger display, but respect compact
                    <img
                        src={validPhotos[0]}
                        alt="Review photo"
                        className={`${compact ? 'w-32 h-20' : 'w-full max-h-64'} object-cover rounded-lg cursor-zoom-in border border-gray-100`}
                        onClick={() => openLightbox(0)}
                    />
                ) : (
                    // Multiple photos - scrollable row
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                        {validPhotos.slice(0, 4).map((url, index) => (
                            <div
                                key={`${url}-${index}`}
                                className={`relative flex-shrink-0 ${sizeClass} cursor-pointer group`}
                                onClick={() => openLightbox(index)}
                            >
                                <img
                                    src={url}
                                    alt={`Photo ${index + 1}`}
                                    className="w-full h-full object-cover rounded-lg border border-gray-100 transition-transform group-hover:scale-[1.02]"
                                />

                                {/* "+X more" overlay on 4th photo */}
                                {index === 3 && validPhotos.length > 4 && (
                                    <div className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center backdrop-blur-[2px]">
                                        <span className="text-white font-semibold text-xs">
                                            +{validPhotos.length - 4}
                                        </span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Lightbox */}
            <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
                <DialogContent className="max-w-4xl h-[90vh] p-0 bg-black/95 border-none shadow-2xl">
                    <div className="relative w-full h-full flex items-center justify-center">
                        {/* Close button */}
                        <button
                            onClick={() => setLightboxOpen(false)}
                            className="absolute top-4 right-4 text-white/80 hover:text-white p-2 z-10 bg-black/20 rounded-full backdrop-blur-sm transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        {/* Counter */}
                        <div className="absolute top-4 left-4 text-white/90 text-sm font-medium bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm">
                            {currentIndex + 1} / {validPhotos.length}
                        </div>

                        {/* Main image */}
                        <img
                            src={validPhotos[currentIndex]}
                            alt={`Photo ${currentIndex + 1}`}
                            className="max-w-full max-h-full object-contain select-none"
                        />

                        {/* Navigation arrows */}
                        {validPhotos.length > 1 && (
                            <>
                                <button
                                    onClick={handlePrev}
                                    className="absolute left-4 text-white/80 hover:text-white p-3 bg-black/20 hover:bg-black/40 rounded-full backdrop-blur-sm transition-all"
                                >
                                    <ChevronLeft className="w-8 h-8" />
                                </button>
                                <button
                                    onClick={handleNext}
                                    className="absolute right-4 text-white/80 hover:text-white p-3 bg-black/20 hover:bg-black/40 rounded-full backdrop-blur-sm transition-all"
                                >
                                    <ChevronRight className="w-8 h-8" />
                                </button>
                            </>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
