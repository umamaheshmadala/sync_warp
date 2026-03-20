/**
 * StickyCommentInput — a self-contained comment input for use as a sticky footer
 * in MobileProductModal. Internally hooks into useProductComments so callers
 * don't need to thread postComment as a prop.
 */
import React from 'react';
import { useProductComments } from '../../../hooks/useProductComments';
import { ProductCommentInput } from '../social/ProductCommentInput';

interface StickyCommentInputProps {
    productId: string;
}

export const StickyCommentInput: React.FC<StickyCommentInputProps> = ({ productId }) => {
    const { postComment } = useProductComments(productId, 0);

    return (
        <div className="px-4 pt-2 pb-1">
            <ProductCommentInput
                onPost={postComment}
                id="mobile-sticky-comment-input"
            />
        </div>
    );
};
