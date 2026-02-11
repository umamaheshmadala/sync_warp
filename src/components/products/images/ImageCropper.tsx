import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Point, Area } from 'react-easy-crop';
import { Slider } from '@/components/ui/slider'; // Adjust import if needed or use native input range
import { X, Check, RotateCw, Grid3X3, Minus, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'; // Assuming these exist provided by shadcn/etc
import { Button } from '@/components/ui/button';

interface ImageCropperProps {
    imageSrc: string;
    isOpen: boolean;
    onClose: () => void;
    onCropComplete: (croppedAreaPixels: Area, rotation: number) => void;
    aspect?: number; // Optional aspect ratio
}

export const ImageCropper: React.FC<ImageCropperProps> = ({
    imageSrc,
    isOpen,
    onClose,
    onCropComplete,
    aspect = 4 / 5, // Default to 4:5
}) => {
    const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [showGrid, setShowGrid] = useState(true);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

    const onCropChange = (crop: Point) => {
        setCrop(crop);
    };

    const onZoomChange = (zoom: number) => {
        setZoom(zoom);
    };

    const onRotationChange = (rotation: number) => {
        setRotation(rotation);
    };

    const handleCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleSave = () => {
        if (croppedAreaPixels) {
            onCropComplete(croppedAreaPixels, rotation);
        }
    };

    const handleRotate = () => {
        setRotation((prev) => (prev + 90) % 360);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[600px] h-[90vh] sm:h-auto flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-4 border-b">
                    <DialogTitle>Crop Image</DialogTitle>
                </DialogHeader>

                <div className="relative flex-1 min-h-[400px] bg-[#1a1a1a]">
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        rotation={rotation}
                        aspect={aspect}
                        onCropChange={onCropChange}
                        onCropComplete={handleCropComplete}
                        onZoomChange={onZoomChange}
                        showGrid={showGrid}
                        style={{
                            containerStyle: { background: '#1a1a1a' },
                            cropAreaStyle: { border: '2px solid white' }
                        }}
                    />
                </div>

                <div className="p-4 bg-white border-t space-y-4">
                    {/* Controls */}
                    <div className="flex items-center justify-between gap-4">
                        <span className="text-sm font-medium w-12 text-gray-500">Zoom</span>
                        <Minus className="w-4 h-4 text-gray-500" onClick={() => setZoom(Math.max(1, zoom - 0.1))} />
                        <input
                            type="range"
                            min={1}
                            max={3}
                            step={0.1}
                            value={zoom}
                            onChange={(e) => setZoom(Number(e.target.value))}
                            className="flex-1"
                        />
                        <Plus className="w-4 h-4 text-gray-500" onClick={() => setZoom(Math.min(3, zoom + 0.1))} />
                    </div>

                    <div className="flex items-center justify-center gap-4">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRotate}
                            className="flex items-center gap-2"
                        >
                            <RotateCw className="w-4 h-4" />
                            Rotate 90°
                        </Button>

                        <Button
                            variant={showGrid ? "default" : "outline"}
                            size="sm"
                            onClick={() => setShowGrid(!showGrid)}
                            className="flex items-center gap-2"
                        >
                            <Grid3X3 className="w-4 h-4" />
                            Grid: {showGrid ? 'ON' : 'OFF'}
                        </Button>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="ghost" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave}>
                            <Check className="w-4 h-4 mr-2" />
                            Apply Crop
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
