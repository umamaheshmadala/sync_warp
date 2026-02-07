import React, { useState } from 'react';
import { useProductWizardStore } from '../../../../stores/useProductWizardStore';
import { useProductDraft } from '../../../../hooks/products/useProductDraft';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowLeft, ArrowRight, Crop as CropIcon, RotateCw, Trash2, Plus, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { ImageCropper } from '../../images/ImageCropper';
import { useImagePicker } from '../../../../hooks/products/creation/useImagePicker';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import getCroppedImg from '../../../../utils/canvasUtils';
import { Area } from 'react-easy-crop';

// Sortable Image Item Component
const SortableImageItem = ({ id, url, isActive, onClick }: any) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
    const style = { transform: CSS.Transform.toString(transform), transition };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={onClick}
            className={`relative flex-shrink-0 w-20 h-24 rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${isActive ? 'border-primary ring-2 ring-primary/20' : 'border-gray-200 bg-gray-100'}`}
        >
            <img src={url} alt="Thumbnail" className="w-full h-full object-contain" />
        </div>
    );
};

import { DiscardDialog } from '../DiscardDialog';

export const EditArrangeStep: React.FC = () => {
    const { images, setStep, reorderImages, removeImage, updateImageCrop, addImages, name, editMode, closeWizard, reset } = useProductWizardStore();
    const { pickImages } = useImagePicker();

    // Local state for active image being previewed/edited
    const [activeId, setActiveId] = useState<string>(images[0]?.id || '');
    const [isCropping, setIsCropping] = useState(false);
    const [showDiscardDialog, setShowDiscardDialog] = useState(false);

    // If no active ID but images exist, set first one
    if (!activeId && images.length > 0) setActiveId(images[0].id);

    const activeImage = images.find(img => img.id === activeId);

    // DND Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // 8px movement required to start drag, allows clicks
            },
        }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id) {
            reorderImages(active.id as string, over?.id as string);
        }
    };

    const handleAddMore = async () => {
        if (images.length >= 5) {
            toast.error("Max 5 images allowed");
            return;
        }
        const picked = await pickImages(5 - images.length);
        if (picked.length > 0) {
            const newImages = picked.map(img => ({
                id: uuidv4(),
                url: img.webPath || '',
                order: images.length
            }));
            addImages(newImages);
            // Optionally set active to the new one
            setActiveId(newImages[0].id);
        }
    };

    const handleCropSave = async (croppedAreaPixels: Area, rotation: number) => {
        if (!activeId || !activeImage) return;

        try {
            const croppedUrl = await getCroppedImg(activeImage.url, croppedAreaPixels, rotation);
            if (croppedUrl) {
                updateImageCrop(activeId, undefined, croppedUrl);
                setIsCropping(false);
            }
        } catch (e) {
            console.error(e);
            toast.error("Failed to crop image");
        }
    };

    const handlePrevImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!activeImage) return;
        const currentIndex = images.findIndex(img => img.id === activeImage.id);
        const prevIndex = (currentIndex - 1 + images.length) % images.length;
        setActiveId(images[prevIndex].id);
    };

    const handleNextImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!activeImage) return;
        const currentIndex = images.findIndex(img => img.id === activeImage.id);
        const nextIndex = (currentIndex + 1) % images.length;
        setActiveId(images[nextIndex].id);
    };

    if (!activeImage) return <div>No image selected</div>;

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Header */}
            <div className="h-16 flex items-center justify-between border-b border-gray-100 bg-white px-4 shrink-0">
                <div className="flex items-center gap-2">
                    <button onClick={() => setStep('media')} className="p-2 hover:bg-gray-100 rounded-full">
                        <ArrowLeft className="w-6 h-6 text-gray-900" />
                    </button>
                    <button
                        onClick={() => setShowDiscardDialog(true)}
                        className="text-sm font-medium text-gray-500 hover:text-red-600 px-2 hidden sm:block"
                    >
                        Discard
                    </button>
                </div>

                <h1 className="font-semibold text-lg text-gray-900 truncate max-w-[200px]">
                    {editMode ? 'Edit Product' : 'Create Product'}
                </h1>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowDiscardDialog(true)}
                        className="sm:hidden p-2 hover:bg-gray-100 rounded-full"
                    >
                        <X className="w-6 h-6 text-gray-500" />
                    </button>

                    <button
                        onClick={() => setStep('details')}
                        className="bg-black text-white px-4 py-1.5 rounded-full font-medium text-sm hover:opacity-90 transition-opacity"
                    >
                        Next
                    </button>
                </div>
            </div>

            {/* Main Preview Area */}
            <div className="flex-1 flex items-center justify-center p-4 overflow-hidden relative">
                {isCropping ? (
                    <div className="w-full h-full max-w-lg max-h-[60vh]">
                        <ImageCropper
                            imageSrc={activeImage.url}
                            onCropComplete={handleCropSave}
                            onClose={() => setIsCropping(false)}
                            isOpen={true}
                        />
                    </div>
                ) : (
                    <div className="relative w-full max-w-md aspect-[4/5] bg-black shadow-lg rounded-lg overflow-hidden group">
                        <img
                            src={activeImage.preview || activeImage.url}
                            alt="Preview"
                            className="w-full h-full object-contain bg-black"
                        />
                        {/* Overlay Controls - Always visible now */}
                        {/* Overlay Controls */}
                        <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex justify-center gap-4 z-20">
                            <button
                                onClick={() => setIsCropping(true)}
                                className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-colors"
                                title="Crop Image"
                            >
                                <CropIcon className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => {
                                    if (images.length === 1) {
                                        if (confirm('Remove the last image? This will take you back to selection.')) {
                                            removeImage(activeImage.id);
                                            setStep('media');
                                        }
                                    } else {
                                        removeImage(activeImage.id);
                                        const next = images.find(i => i.id !== activeImage.id);
                                        if (next) setActiveId(next.id);
                                    }
                                }}
                                className="p-3 bg-red-500/80 backdrop-blur-md rounded-full text-white hover:bg-red-600/90 transition-colors"
                                title="Delete Image"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Navigation Arrows Overlay */}
                        {images.length > 1 && (
                            <>
                                <button
                                    onClick={handlePrevImage}
                                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors z-10"
                                >
                                    <ChevronLeft className="w-6 h-6" />
                                </button>
                                <button
                                    onClick={handleNextImage}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors z-10"
                                >
                                    <ChevronRight className="w-6 h-6" />
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Thumbs & Tools */}
            <div className="h-40 bg-white border-t border-gray-100 shrink-0 flex flex-col items-center justify-center p-4">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={images.map(i => i.id)} strategy={horizontalListSortingStrategy}>
                        <div className="flex gap-3 overflow-x-auto pb-2 w-full max-w-2xl px-2 justify-center">
                            {images.map(img => (
                                <SortableImageItem
                                    key={img.id}
                                    id={img.id}
                                    url={img.preview || img.url}
                                    isActive={img.id === activeId}
                                    onClick={() => setActiveId(img.id)}
                                />
                            ))}
                            {images.length < 5 && (
                                <button
                                    onClick={handleAddMore}
                                    className="flex-shrink-0 w-20 h-24 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:text-gray-600 hover:border-gray-400"
                                >
                                    <Plus className="w-6 h-6 mb-1" />
                                    <span className="text-xs">Add</span>
                                </button>
                            )}
                        </div>
                    </SortableContext>
                </DndContext>
            </div>

            <DiscardDialog
                open={showDiscardDialog}
                onOpenChange={setShowDiscardDialog}
                onConfirm={() => {
                    closeWizard();
                    reset();
                }}
                title={editMode ? "Discard unsaved changes?" : "Discard product creation?"}
                description={editMode ? "All unsaved changes will be lost." : "Are you sure you want to stop creating this product? All progress will be lost."}
            />
        </div>
    );
};
