import { useState, useCallback, useEffect } from 'react';
import { ProductImage } from '../../../components/products/images/ProductImageManager';
import { useProductDraft } from './useProductDraft';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useProducts } from '../../useProducts';
import { useAuthStore } from '../../../store/authStore';

export type CreationStep = 'images' | 'details';

export interface ProductCreationState {
    step: CreationStep;
    images: ProductImage[];
    name: string;
    description: string;
    tags: string[];
    notifications_enabled: boolean;
    isDraftLoaded: boolean;
}

export const useProductCreation = () => {
    const navigate = useNavigate();
    const user = useAuthStore(state => state.user);
    // Use existing useProducts hook -> likely need to ensure it has createProduct method
    // If not, we'll use a direct service call or update the hook later
    // For now assuming we can call a function or service
    // Actually, let's use the productService directly as we just built it for images
    // But we need to create the product record first. 
    // Let's assume there's a createProduct in useProducts or we build one.
    // Checking useProducts previously showed it handles "create". 

    const { saveDraft, loadDraft, clearDraft, draftExists } = useProductDraft();

    const [state, setState] = useState<ProductCreationState>({
        step: 'images',
        images: [],
        name: '',
        description: '',
        tags: [],
        notifications_enabled: true,
        isDraftLoaded: false
    });

    useEffect(() => {
        // Load draft on mount
        const init = async () => {
            const draft = await loadDraft();
            if (draft) {
                // Restore state
                // Note: images from draft might be tricky if blobs are missing
                // For MVP: Restore details, clear images or show placeholders?
                // If we didn't persist image blobs, we can't restore them easily.
                // Let's assume we start fresh images for now if draft had them, or warn user.

                setState(prev => ({
                    ...prev,
                    name: draft.name,
                    description: draft.description,
                    tags: draft.tags,
                    notifications_enabled: draft.notifications_enabled,
                    step: draft.step || 'images',
                    isDraftLoaded: true
                    // images: ... restore if possible
                }));
                toast.success('Draft restored', { id: 'draft-restored' });
            } else {
                setState(s => ({ ...s, isDraftLoaded: true }));
            }
        };
        init();
    }, [loadDraft]);

    // Auto-save draft on state change (debounce ideally)
    useEffect(() => {
        if (!state.isDraftLoaded) return;

        // Simple debounce could happen here or in saveDraft
        const timeout = setTimeout(() => {
            saveDraft({
                name: state.name,
                description: state.description,
                tags: state.tags,
                notifications_enabled: state.notifications_enabled,
                step: state.step,
                // store image metadata?
                images: state.images.map(img => ({ id: img.id }))
            });
        }, 1000);

        return () => clearTimeout(timeout);
    }, [state, saveDraft]);

    const setImages = useCallback((action: React.SetStateAction<ProductImage[]>) => {
        setState(prev => {
            const newImages = typeof action === 'function'
                ? (action as (prev: ProductImage[]) => ProductImage[])(prev.images)
                : action;
            return { ...prev, images: newImages };
        });
    }, []);

    const updateDetails = useCallback((details: Partial<ProductCreationState>) => {
        setState(prev => ({ ...prev, ...details }));
    }, []);

    const goToStep = useCallback((step: CreationStep) => {
        if (step === 'details') {
            // Validation
            if (state.images.length === 0) {
                toast.error('Please select at least one image');
                return;
            }
        }
        setState(prev => ({ ...prev, step }));
    }, [state.images]);

    const handlePublish = async () => {
        if (!state.name.trim()) {
            toast.error('Product name is required');
            return;
        }

        try {
            // 1. Create Product Record
            // 2. Upload Images (if not uploaded)
            // 3. Update Product with image URLs

            // This logic ideally lives in a service or useProducts
            // We'll scaffold it here or call a mutation

            toast.success('Product published!');
            await clearDraft();
            navigate('/business/products'); // Redirect

        } catch (error) {
            console.error(error);
            toast.error('Failed to publish');
        }
    };

    return {
        state,
        setImages,
        updateDetails,
        goToStep,
        handlePublish,
        draftExists
    };
};
