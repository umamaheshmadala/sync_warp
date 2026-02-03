import { Preferences } from '@capacitor/preferences';
import { useCallback, useEffect, useState } from 'react';
import { ProductImage } from '../../../components/products/images/ProductImageManager';

const DRAFT_KEY = 'product_draft';

// Define draft structure - serialized version of form state
export interface ProductDraft {
    images: {
        id: string; // Internal ID
        blobUrl?: string; // We can't persist blobs easily, so we might need to rely on re-selection or just persist metadata if blobs are too large.
        // Ideally for native mobile, we store file paths. For web, blob URLs revoke on reload.
        // For this implementation effectively, we'll try to persist what we can, but images might be tricky without native file paths.
        // Strategy: Only persist metadata for now or simplified version.
        // Actually, for a robust mobile draft, we should save images to filesystem.
        // But for MVP, let's persist steps 2 details primarily, and warn about images loss if app killed.
        // Or better: Use base64 for small thumbnails if critical?
        // Let's stick to persisting details for now to avoid complexity of FS.
    }[];
    name: string;
    description: string;
    tags: string[];
    notifications_enabled: boolean;
    step: 'images' | 'details';
    updated_at: string;
}

export interface UseProductDraft {
    saveDraft: (data: Partial<ProductDraft>) => Promise<void>;
    loadDraft: () => Promise<ProductDraft | null>;
    clearDraft: () => Promise<void>;
    draftExists: boolean;
}

export const useProductDraft = (): UseProductDraft => {
    const [draftExists, setDraftExists] = useState(false);

    useEffect(() => {
        checkDraft();
    }, []);

    const checkDraft = async () => {
        const { value } = await Preferences.get({ key: DRAFT_KEY });
        setDraftExists(!!value);
    };

    const saveDraft = useCallback(async (data: Partial<ProductDraft>) => {
        // Merge with existing? Or overwrite? Usually overwrite for current session.
        // We'll trust the caller to pass full state or we implement merge here.
        // Let's implementing merging with existing draft
        const { value } = await Preferences.get({ key: DRAFT_KEY });
        const existing = value ? JSON.parse(value) : {};

        const updated = {
            ...existing,
            ...data,
            updated_at: new Date().toISOString(),
        };

        await Preferences.set({
            key: DRAFT_KEY,
            value: JSON.stringify(updated),
        });
        setDraftExists(true);
    }, []);

    const loadDraft = useCallback(async () => {
        const { value } = await Preferences.get({ key: DRAFT_KEY });
        return value ? JSON.parse(value) : null;
    }, []);

    const clearDraft = useCallback(async () => {
        await Preferences.remove({ key: DRAFT_KEY });
        setDraftExists(false);
    }, []);

    return { saveDraft, loadDraft, clearDraft, draftExists };
};
