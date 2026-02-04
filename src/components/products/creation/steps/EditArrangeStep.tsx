import React, { useState } from 'react';
import { useProductWizardStore } from '../../../../stores/useProductWizardStore';
import { useProductDraft } from '../../../../hooks/useProductDraft';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowLeft, ArrowRight, Crop as CropIcon, RotateCw, Trash2, Plus } from 'lucide-react';
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
            className={`relative flex-shrink-0 w-20 h-24 rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${isActive ? 'border-primary ring-2 ring-primary/20' : 'border-gray-200 dark:border-gray-700'}`}
        >
            <img src={url} alt="Thumbnail" className="w-full h-full object-cover" />
        </div>
    );
};

export const EditArrangeStep: React.FC = () => {
    const { images, setStep, reorderImages, removeImage, updateImageCrop, addImages } = useProductWizardStore();
    const { pickImages } = useImagePicker();

    // Local state for active image being previewed/edited
    const [activeId, setActiveId] = useState<string>(images[0]?.id || '');
    const [isCropping, setIsCropping] = useState(false);

    // If no active ID but images exist, set first one
    if (!activeId && images.length > 0) setActiveId(images[0].id);

    const activeImage = images.find(img => img.id === activeId);

    // DND Sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
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

    if (!activeImage) return <div>No image selected</div>;

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="h-16 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 shrink-0">
                <button onClick={() => setStep('media')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                    <ArrowLeft className="w-6 h-6 text-gray-900 dark:text-white" />
                </button>
                <h1 className="font-semibold text-lg text-gray-900 dark:text-white">Edit</h1>
                <button onClick={() => setStep('details')} className="text-primary font-semibold text-base hover:text-primary-dark">
                    Next
                </button>
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
                            className="w-full h-full object-cover"
                        />
                        {/* Overlay Controls */}
                        <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex justify-center gap-4">
                            <button
                                onClick={() => setIsCropping(true)}
                                className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30"
                            >
                                <CropIcon className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => {
                                    if (images.length <= 1) {
                                        // Confirm? or just go back
                                    }
                                    removeImage(activeImage.id);
                                    // Set next active
                                    const next = images.find(i => i.id !== activeImage.id);
                                    if (next) setActiveId(next.id);
                                    else setStep('media');
                                }}
                                className="p-2 bg-red-500/80 backdrop-blur-md rounded-full text-white hover:bg-red-600/90"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Thumbs & Tools */}
            <div className="h-40 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 shrink-0 flex flex-col items-center justify-center p-4">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={images.map(i => i.id)} strategy={horizontalListSortingStrategy}>
                        <div className="flex gap-3 overflow-x-auto pb-2 w-full max-w-2xl px-2">
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
                                    className="flex-shrink-0 w-20 h-24 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center text-gray-400 hover:text-gray-600 hover:border-gray-400"
                                >
                                    <Plus className="w-6 h-6 mb-1" />
                                    <span className="text-xs">Add</span>
                                </button>
                            )}
                        </div>
                    </SortableContext>
                </DndContext>
            </div>
        </div>
    );
};
