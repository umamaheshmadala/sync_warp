import { useEffect, useState, useRef, useCallback } from 'react';
import { useProductWizardStore } from '../../stores/useProductWizardStore';
import { productService } from '../../services/productService';
import { useDebounce } from '../useDebounce'; // Assuming we have this or I'll implement a simple one locally
import toast from 'react-hot-toast';

export const useProductDraft = (options: { enableAutoSave?: boolean } = { enableAutoSave: true }) => {
    const {
        isOpen,
        editMode,
        businessId,
        draftId,
        step,
        images,
        name,
        description,
        tags,
        notificationsEnabled,
        updateDetails
    } = useProductWizardStore();

    const [saving, setSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    // We want to debounce the save trigger
    // But we need to track WHAT triggered it.
    // Actually, we can just watch the relevant state variables.

    // Debounce the entire state that needs saving
    const draftState = {
        name,
        description,
        tags,
        notificationsEnabled,
        images // We'll handle images carefully
    };

    // Custom debounce logic: 
    // We want to save 2 seconds after the LAST change.
    // We only save if:
    // 1. Wizard is Open
    // 2. Not in Edit Mode (unless we want draft for edits? Story 12.17 implies creation drafts. "Create a product")
    //    Story says "As a Business Owner, I want my work to be automatically saved as I CREATE a product"
    //    Edit drafts are out of scope or implicit? Let's stick to Creation for now. 
    //    But if I edit a draft, `editMode` is false?
    //    Wait, `openWizard` sets `editMode: false` for Start New and Resume Draft.
    //    `editMode: true` is ONLY for "Edit Existing Published Product".
    //    So `!editMode` is correct for Drafts.

    const shouldSave = isOpen && !editMode && businessId;

    // Ref to track if we have unsaved changes
    const previousStateString = useRef(JSON.stringify(draftState));

    // Ref to track saving state synchronously to prevent race conditions
    const isSavingRef = useRef(false);

    // Helper to perform the actual save
    const saveToDb = useCallback(async (currentDraftId: string | null, state: typeof draftState) => {
        if (!businessId) return;
        if (isSavingRef.current) return; // Block concurrent saves

        try {
            isSavingRef.current = true;
            setSaving(true);

            // Double check store ID in case it updated while we were waiting/debouncing
            let activeDraftId = currentDraftId || useProductWizardStore.getState().draftId;

            // 1. If no draft ID, create initial record to get ID
            //    (Only if we have at least something to save, usually images at step 2)
            if (!activeDraftId) {
                // Determine step for 'last_step'
                // If we are saving, we at least have images usually.
                // But user might type name first? No, step 1 is Media.
                const initialPayload = {
                    business_id: businessId,
                    name: state.name || 'Untitled Draft',
                    status: 'draft',
                    last_step: step
                };

                const newDraft = await productService.saveDraft(initialPayload);
                if (newDraft) {
                    activeDraftId = newDraft.id;
                    useProductWizardStore.setState({ draftId: activeDraftId });
                } else {
                    // Self-healing: If saveDraft returned null (due to RLS or network), 
                    // try to find the draft we just created to avoid infinite duplication loop.
                    console.warn("saveDraft returned null, attempting recovery...");
                    try {
                        // Allow a small delay for DB propagation if needed
                        await new Promise(resolve => setTimeout(resolve, 500));

                        const drafts = await productService.getDrafts(businessId);
                        // Find a draft with same name created in last 10 seconds
                        const recentDraft = drafts.find(d =>
                            d.name === initialPayload.name &&
                            Math.abs(new Date(d.created_at || '').getTime() - Date.now()) < 10000
                        );

                        if (recentDraft) {
                            console.log("Recovered draft ID:", recentDraft.id);
                            activeDraftId = recentDraft.id;
                            useProductWizardStore.setState({ draftId: activeDraftId });
                        } else {
                            throw new Error("Could not create draft (ID missing)");
                        }
                    } catch (recoveryError) {
                        console.error("Draft recovery failed", recoveryError);
                        // Don't set error state yet, let next retry handle it or user retry
                        // But we must stop execution here to prevent image upload attempts on null ID
                        setSaving(false);
                        return;
                    }
                }
            }

            // 2. Handle Image Uploads
            // Filter images that are Files (not yet uploaded, have blob URL)
            const imagesToUpload = state.images.filter(img => img.file);
            let updatedImages = [...state.images];
            let imagesChanged = false;

            if (imagesToUpload.length > 0) {
                // Upload each
                const uploadPromises = imagesToUpload.map(async (img) => {
                    if (!img.file) return img; // Should not happen
                    try {
                        // Upload to drafts folder
                        // Path: {businessId}/drafts/{draftId}/{filename}
                        // productService upload takes (file, businessId, productId)
                        // We can pass `drafts/${activeDraftId}` as the "productId" segment to hack/use the structure?
                        // Or update productService to handle paths better.
                        // productService stores as: `${businessId}/${productId}/${fileName}`
                        // So if we pass `drafts/${activeDraftId}`, it stores at `${businessId}/drafts/${activeDraftId}/${fileName}`.
                        // This works perfectly for our plan.

                        const publicUrl = await productService.uploadProductImage(
                            img.file,
                            businessId,
                            `drafts/${activeDraftId}`
                        );

                        return { ...img, url: publicUrl, file: undefined }; // Mark as uploaded
                    } catch (err) {
                        console.error("Failed to upload image", img, err);
                        return img; // Keep original state (retry later?)
                    }
                });

                const uploadedResults = await Promise.all(uploadPromises);

                // Merge back into updatedImages list (preserving order)
                updatedImages = state.images.map(img => {
                    const uploaded = uploadedResults.find(u => u.id === img.id);
                    return uploaded || img;
                });

                // Update store with new URLs so we don't re-upload
                // (This might cause a re-render/re-run of effect, need to be careful)
                // Actually, if we update store, `draftState` changes, triggering another save?
                // We should update store carefully.
                imagesChanged = true;
            }

            // 3. Update Draft Record
            const serializedImages = updatedImages.map(img => ({
                url: img.url,
                order: img.order,
                crop: img.crop
                // We don't save 'file' or 'preview' (blobs) to DB
            }));

            await productService.saveDraft({
                id: activeDraftId,
                business_id: businessId,
                name: state.name,
                description: state.description,
                tags: state.tags,
                notifications_enabled: state.notificationsEnabled,
                images: serializedImages,
                last_step: step
            });

            setLastSaved(new Date());

            if (imagesChanged) {
                useProductWizardStore.setState({ images: updatedImages });
            }

        } catch (error) {
            console.error("Auto-save failed", error);
            // toast.error("Failed to save draft"); 
            // Silent error for auto-save, maybe specific indicator?
        } finally {
            setSaving(false);
            isSavingRef.current = false;
        }
    }, [businessId, step]);

    // Effect: Debounce save
    useEffect(() => {
        if (!shouldSave || !options.enableAutoSave) return;

        // Don't save if empty (Step 1 with no images?)
        // Story says "WHEN I navigate from Step 1 to Step 2".
        // But also "Debounced Save on Text Changes".
        // Let's implement debounce on Change.

        const currentStateString = JSON.stringify(draftState);
        if (currentStateString === previousStateString.current) return;

        const timer = setTimeout(() => {
            saveToDb(draftId, draftState);
            previousStateString.current = currentStateString;
        }, 2000); // 2 seconds debounce

        return () => clearTimeout(timer);
    }, [draftState, shouldSave, draftId, saveToDb]);

    // Explicit Save Function (for "Save as Draft" button or Navigation)
    const saveDraftNow = async (overrideState?: Partial<typeof draftState>) => {
        // Use override state merged with current, or just current
        const stateToSave = overrideState ? { ...draftState, ...overrideState } : draftState;

        if (shouldSave || overrideState) { // Allow forced save if override provided
            await saveToDb(draftId, stateToSave);
            return true;
        }
        return false;
    };

    return {
        saving,
        lastSaved,
        saveDraft: saveDraftNow
    };
};
