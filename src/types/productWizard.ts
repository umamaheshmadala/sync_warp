export type WizardStep = 'media' | 'edit' | 'details';

export interface ProductImage {
    id: string; // Unique ID for drag-drop
    url: string; // Blob URL or remote URL
    file?: File; // Original file (if new)
    preview?: string; // Cropped preview
    crop?: { x: number; y: number; zoom: number; rotation: number };
    order: number;
}

export interface ProductDraft {
    id?: string; // Database ID if resumed draft
    images: ProductImage[];
    name: string;
    description: string;
    tags: string[];
    notificationsEnabled: boolean;
    updatedAt: string;
}

export interface WizardState {
    // UI State
    isOpen: boolean;
    step: WizardStep;

    // Data State
    draftId: string | null;
    images: ProductImage[];
    name: string;
    description: string;
    tags: string[];
    notificationsEnabled: boolean;
    businessId: string | null;

    // Actions
    openWizard: (businessId: string, draft?: ProductDraft) => void;
    closeWizard: () => void;
    setStep: (step: WizardStep) => void;

    addImages: (newImages: ProductImage[]) => void;
    removeImage: (id: string) => void;
    reorderImages: (activeId: string, overId: string) => void;
    updateImageCrop: (id: string, crop: ProductImage['crop'], preview: string) => void;

    updateDetails: (details: Partial<{ name: string; description: string; tags: string[]; notificationsEnabled: boolean }>) => void;
    reset: () => void;
}
