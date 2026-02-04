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
};

export const useProductWizardStore = create<WizardState>((set) => ({
    ...initialState,

    openWizard: (businessId: string, draft?: ProductDraft) => {
        if (draft) {
            set({
                isOpen: true,
                step: 'media', // Always start at media to verify images? Or 'details'? Let's start at media for safety
                draftId: draft.id || null,
                images: draft.images,
                name: draft.name,
                description: draft.description,
                tags: draft.tags,
                notificationsEnabled: draft.notificationsEnabled,
                businessId: businessId,
            });
        } else {
            set({ ...initialState, isOpen: true, businessId: businessId });
        }
    },

    closeWizard: () => set({ isOpen: false }),

    setStep: (step) => set({ step }),

    reset: () => set(initialState),

    addImages: (newImages) => set((state) => ({
        images: [...state.images, ...newImages].slice(0, 5) // Max 5 enforced here too
    })),

    removeImage: (id) => set((state) => ({
        images: state.images.filter((img) => img.id !== id)
    })),

    reorderImages: (activeId, overId) => set((state) => {
        const oldIndex = state.images.findIndex((img) => img.id === activeId);
        const newIndex = state.images.findIndex((img) => img.id === overId);
        return {
            images: arrayMove(state.images, oldIndex, newIndex).map((img, i) => ({ ...img, order: i }))
        };
    }),

    updateImageCrop: (id, crop, preview) => set((state) => ({
        images: state.images.map((img) =>
            img.id === id ? { ...img, crop, preview } : img
        )
    })),

    updateDetails: (details) => set((state) => ({ ...state, ...details })),
}));
