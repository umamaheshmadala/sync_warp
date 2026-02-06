import { create } from 'zustand';
import { WizardState, ProductDraft, ProductImage } from '../types/productWizard';
import { arrayMove } from '@dnd-kit/sortable';

const initialState = {
    isOpen: false,
    step: 'media' as const,
    draftId: null,
    images: [],
    name: '',
    description: '',
    tags: [],
    notificationsEnabled: true,
    businessId: null,
    editMode: false,
    editingProductId: null,
    isDirty: false,
};

export const useProductWizardStore = create<WizardState>((set) => ({
    ...initialState,

    openWizard: (businessId: string, draft?: ProductDraft, productToEdit?: any) => {
        if (productToEdit) {
            // Edit Mode: Rehydrate from published product
            // Handle both new 'images' (JSONB) and legacy 'image_urls' (text[])
            let productImages: ProductImage[] = [];

            if (productToEdit.images && Array.isArray(productToEdit.images) && productToEdit.images.length > 0) {
                // New schema: Array of objects { url, order, ... } OR strings (if mixed)
                productImages = productToEdit.images.map((img: any, index: number) => ({
                    id: `existing-${index}-${Date.now()}`,
                    url: typeof img === 'string' ? img : img.url,
                    order: typeof img === 'object' && img.order !== undefined ? img.order : index,
                    preview: undefined
                }));
            } else if (productToEdit.image_urls && Array.isArray(productToEdit.image_urls)) {
                // Legacy schema: Array of strings
                productImages = productToEdit.image_urls.map((url: string, index: number) => ({
                    id: `existing-${index}-${Date.now()}`,
                    url: url,
                    order: index
                }));
            }

            const hasImages = productImages.length > 0;

            set({
                isOpen: true,
                step: hasImages ? 'edit' : 'media', // Start at Edit step if images exist
                businessId: businessId,
                editMode: true,
                editingProductId: productToEdit.id,
                name: productToEdit.name,
                description: productToEdit.description || '',
                tags: productToEdit.tags || [],
                notificationsEnabled: productToEdit.notifications_enabled ?? true,
                images: productImages,
                draftId: null,
                isDirty: false // Reset dirty state
            });
        } else if (draft) {
            // Resume Draft
            const hasImages = draft.images && draft.images.length > 0;

            set({
                isOpen: true,
                step: hasImages ? 'edit' : 'media', // Resume at appropriate step
                draftId: draft.id || null,
                images: draft.images,
                name: draft.name,
                description: draft.description,
                tags: draft.tags,
                notificationsEnabled: draft.notificationsEnabled,
                businessId: businessId,
                editMode: false,
                editingProductId: null,
                isDirty: false
            });
        } else {
            // New Product
            set({
                ...initialState,
                isOpen: true,
                businessId: businessId,
                editMode: false,
                editingProductId: null,
                isDirty: false
            });
        }
    },

    closeWizard: () => set({ isOpen: false }),

    setStep: (step) => set({ step }),

    reset: () => set(initialState),

    addImages: (newImages) => set((state) => ({
        images: [...state.images, ...newImages].slice(0, 5),
        isDirty: true
    })),

    removeImage: (id) => set((state) => ({
        images: state.images.filter((img) => img.id !== id),
        isDirty: true
    })),

    reorderImages: (activeId, overId) => set((state) => {
        const oldIndex = state.images.findIndex((img) => img.id === activeId);
        const newIndex = state.images.findIndex((img) => img.id === overId);
        return {
            images: arrayMove(state.images, oldIndex, newIndex).map((img, i) => ({ ...img, order: i })),
            isDirty: true
        };
    }),

    updateImageCrop: (id, crop, preview) => set((state) => ({
        images: state.images.map((img) =>
            img.id === id ? { ...img, crop, preview } : img
        ),
        isDirty: true
    })),

    updateDetails: (details) => set((state) => ({ ...state, ...details, isDirty: true })),
}));
