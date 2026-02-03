import React from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X, GripVertical, Pencil } from 'lucide-react';

interface PreviewImage {
    id: string; // unique
    previewUrl: string; // preview URL (blob or remote)
    isCover?: boolean;
}

interface ImagePreviewListProps {
    images: PreviewImage[];
    onReorder: (newOrder: PreviewImage[]) => void;
    onRemove: (id: string) => void;
    onEdit: (image: PreviewImage) => void;
}

const SortableItem = ({
    image,
    index,
    onRemove,
    onEdit
}: {
    image: PreviewImage;
    index: number;
    onRemove: (id: string) => void;
    onEdit: (img: PreviewImage) => void;
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: image.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`relative group aspect-[4/5] bg-gray-100 rounded-lg overflow-hidden border border-gray-200 ${isDragging ? 'z-50 shadow-xl scale-105' : ''}`}
        >
            <img
                src={image.previewUrl}
                alt={`Product image ${index + 1}`}
                className="w-full h-full object-cover"
            />

            {/* Cover Label for first item */}
            {index === 0 && (
                <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    Cover
                </div>
            )}

            {/* Drag Handle */}
            <div
                {...attributes}
                {...listeners}
                className="absolute top-2 right-2 p-1 bg-white/80 rounded cursor-grab hover:bg-white active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <GripVertical className="w-4 h-4 text-gray-700" />
            </div>

            {/* Edit/Remove Actions Overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none">
                {/* Edit Button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onEdit(image);
                    }}
                    className="pointer-events-auto p-2 bg-white rounded-full hover:bg-gray-100 transition-colors"
                    title="Edit Crop"
                >
                    <Pencil className="w-4 h-4 text-gray-700" />
                </button>

                {/* Remove Button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove(image.id);
                    }}
                    className="pointer-events-auto p-2 bg-white rounded-full hover:bg-red-50 transition-colors"
                    title="Remove"
                >
                    <X className="w-4 h-4 text-red-500" />
                </button>
            </div>
        </div>
    );
};

export const ImagePreviewList: React.FC<ImagePreviewListProps> = ({
    images,
    onReorder,
    onRemove,
    onEdit
}) => {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (active.id !== over?.id) {
            const oldIndex = images.findIndex((img) => img.id === active.id);
            const newIndex = images.findIndex((img) => img.id === over?.id);

            onReorder(arrayMove(images, oldIndex, newIndex));
        }
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                <SortableContext
                    items={images.map(img => img.id)}
                    strategy={rectSortingStrategy}
                >
                    {images.map((image, index) => (
                        <SortableItem
                            key={image.id}
                            image={image}
                            index={index}
                            onRemove={onRemove}
                            onEdit={onEdit}
                        />
                    ))}
                </SortableContext>
            </div>
        </DndContext>
    );
};
