import React, { useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import { useProductWizardStore } from '../../../stores/useProductWizardStore';
import { MediaSelectionStep } from './steps/MediaSelectionStep';
import { EditArrangeStep } from './steps/EditArrangeStep';
import { ProductDetailsStep } from './steps/ProductDetailsStep';
import { X } from 'lucide-react';
import { useProductDraft } from '../../../hooks/useProductDraft';

export const ProductCreationWizard: React.FC = () => {
    const { isOpen, step, closeWizard, images, reset, editMode, isDirty } = useProductWizardStore();
    const { saveDraft } = useProductDraft(); // We'll use this for "Save Draft" prompt later

    // Prevent scrolling when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleClose = () => {
        if (isDirty) {
            const message = editMode
                ? "Discard unsaved changes? Your changes will be lost."
                : "Discard changes? You can save as draft.";

            const confirmClose = window.confirm(message);
            if (!confirmClose) return;
        }
        closeWizard();
        reset();
    };

    return (
        <Dialog.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm" />
                <Dialog.Content className="fixed z-50 left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-full h-full md:w-[800px] md:h-[80vh] md:max-h-[900px] outline-none">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white dark:bg-gray-900 w-full h-full md:rounded-2xl overflow-hidden flex flex-col shadow-2xl relative"
                    >
                        {/* Mobile Close Button (Absolute) - Visible on Step 1 only? Or header handles it */}
                        {/* We'll let steps handle their own headers for maximum flexibility/Instagram-likeness */}

                        <div className="flex-1 overflow-hidden flex flex-col relative">
                            {step === 'media' && <MediaSelectionStep />}
                            {step === 'edit' && <EditArrangeStep />}
                            {step === 'details' && <ProductDetailsStep />}
                        </div>

                    </motion.div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};
