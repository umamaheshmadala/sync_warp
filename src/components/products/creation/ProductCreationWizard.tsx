import React, { useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import { useProductWizardStore } from '../../../stores/useProductWizardStore';
import { MediaSelectionStep } from './steps/MediaSelectionStep';
import { EditArrangeStep } from './steps/EditArrangeStep';
import { ProductDetailsStep } from './steps/ProductDetailsStep';
import { X } from 'lucide-react';
import { useProductDraft } from '../../../hooks/products/useProductDraft';
import { DiscardDialog } from './DiscardDialog';

export const ProductCreationWizard: React.FC = () => {
    const { isOpen, step, closeWizard, images, reset, editMode, isDirty } = useProductWizardStore();
    const { saveDraft, saving, lastSaved } = useProductDraft({ enableAutoSave: false }); // We'll use this for "Save Draft" prompt later
    const [showDiscardDialog, setShowDiscardDialog] = React.useState(false);

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

    if (!isOpen) return null;

    const handleClose = () => {
        if (isDirty) {
            setShowDiscardDialog(true);
            return;
        }
        closeWizard();
        reset();
    };

    const handleConfirmDiscard = () => {
        setShowDiscardDialog(false);
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
                        className="bg-white w-full h-full md:rounded-2xl overflow-hidden flex flex-col shadow-2xl relative"
                    >
                        <Dialog.Title className="sr-only">Product Creation Wizard</Dialog.Title>

                        {/* Mobile Close Button (Absolute) - Visible on Step 1 only? Or header handles it */}
                        {/* We'll let steps handle their own headers for maximum flexibility/Instagram-likeness */}

                        <div className="flex-1 overflow-hidden flex flex-col relative">
                            {step === 'media' && <MediaSelectionStep />}
                            {step === 'edit' && <EditArrangeStep />}
                            {step === 'details' && <ProductDetailsStep />}


                            {/* Saving Indicator */}
                            {saving && (
                                <div className="absolute top-4 right-16 bg-white/80 dark:bg-black/50 backdrop-blur px-3 py-1 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300 pointer-events-none flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                                    Saving...
                                </div>
                            )}
                            {!saving && lastSaved && (
                                <div className="absolute top-4 right-16 px-3 py-1 text-xs text-gray-400 pointer-events-none transition-opacity duration-1000 opacity-50">
                                    Saved
                                </div>
                            )}
                        </div>

                    </motion.div>

                    <DiscardDialog
                        open={showDiscardDialog}
                        onOpenChange={setShowDiscardDialog}
                        onConfirm={handleConfirmDiscard}
                        title={editMode ? "Discard unsaved changes?" : "Discard changes?"}
                        description={editMode ? "Your changes will be lost." : "You can save as draft before discarding."}
                    />
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};
