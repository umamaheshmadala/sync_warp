import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useProductCreation } from '../../../hooks/products/creation/useProductCreation';
import { ImageSelectionStep } from './ImageSelectionStep';
import { ProductDetailsStep } from './ProductDetailsStep';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export const MobileProductCreation: React.FC = () => {
    const {
        state,
        setImages,
        updateDetails,
        goToStep,
        handlePublish,
        draftExists
    } = useProductCreation();

    const navigate = useNavigate();

    // Warn before leaving if changes made
    useEffect(() => {
        // Implement block navigation logic if using react-router v6 prompts or similar
        // For now simple browser unload
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (state.name || state.images.length > 0) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [state]);

    const handleCancel = () => {
        if (state.images.length > 0 || state.name) {
            if (window.confirm('Discard changes and exit? Draft will be saved locally.')) {
                navigate(-1);
            }
        } else {
            navigate(-1);
        }
    };

    if (!state.isDraftLoaded) {
        return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }

    const modalContent = (
        <div className="fixed inset-0 z-[100] bg-white dark:bg-gray-900 overflow-hidden flex flex-col">
            {state.step === 'images' ? (
                <ImageSelectionStep
                    images={state.images}
                    onChange={setImages}
                    onNext={() => goToStep('details')}
                    onCancel={handleCancel}
                />
            ) : (
                <ProductDetailsStep
                    images={state.images}
                    name={state.name}
                    description={state.description}
                    tags={state.tags}
                    notificationsEnabled={state.notifications_enabled}
                    onUpdate={updateDetails}
                    onBack={() => goToStep('images')}
                    onPublish={handlePublish}
                    onSaveDraft={() => {
                        toast.success('Draft saved', { id: 'draft-saved' });
                        navigate(-1);
                    }}
                />
            )}
        </div>
    );

    // Use portal to break out of stacking contexts (e.g. layouts with transforms)
    return createPortal(modalContent, document.body);
};
