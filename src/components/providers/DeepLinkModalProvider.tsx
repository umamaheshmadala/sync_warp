/**
 * DeepLinkModalProvider
 * 
 * Global modal provider that listens to the deep link store
 * and renders the appropriate modals (Offer, Profile, Product)
 * 
 * This component should be rendered once at the app root level.
 * (Story 10.1.8 AC-18)
 */

import React, { useEffect, useState } from 'react';
import { useDeepLinkStore } from '../../store/deepLinkStore';
import { FriendProfileModal } from '../friends/FriendProfileModal';
import ProductView from '../business/ProductView';
import { supabase } from '../../lib/supabase';
import { X } from 'lucide-react';
import { OfferShareButton } from '../Sharing/OfferShareButton';
import type { Offer } from '../../types/offers';

export function DeepLinkModalProvider() {
    const {
        offerModalOpen,
        offerId,
        profileModalOpen,
        profileUserId,
        productModalOpen,
        productId,
        productBusinessId,
        productPreviewImage,
        closeAll,
    } = useDeepLinkStore();

    // Offer data state
    const [offer, setOffer] = useState<Offer | null>(null);
    const [offerLoading, setOfferLoading] = useState(false);
    const [offerBusiness, setOfferBusiness] = useState<{ id: string; business_name: string } | null>(null);

    // Product data state
    const [product, setProduct] = useState<any>(null);
    const [productLoading, setProductLoading] = useState(false);

    // Fetch offer when modal opens
    useEffect(() => {
        if (offerModalOpen && offerId) {
            setOfferLoading(true);

            const fetchOffer = async () => {
                try {
                    const { data, error } = await supabase
                        .from('offers')
                        .select(`
              *,
              businesses:business_id (id, business_name)
            `)
                        .eq('id', offerId)
                        .single();

                    if (error) throw error;

                    setOffer(data);
                    setOfferBusiness(data.businesses);
                } catch (error) {
                    console.error('Failed to fetch offer:', error);
                    setOffer(null);
                } finally {
                    setOfferLoading(false);
                }
            };

            fetchOffer();
        } else {
            setOffer(null);
            setOfferBusiness(null);
        }
    }, [offerModalOpen, offerId]);

    // Fetch product when modal opens
    // Fetch product when modal opens
    useEffect(() => {
        if (productModalOpen && productId) {
            setProductLoading(true);

            const fetchProduct = async () => {
                try {
                    const { data, error } = await supabase
                        .from('products')
                        .select('*')
                        .eq('id', productId)
                        .single();

                    if (error) throw error;

                    // Adapt DB schema (image_url) to Component Prop (image_urls)
                    // Fallback to preview image from store if both are missing
                    const finalImageUrls = data.image_urls || (data.image_url ? [data.image_url] : []);

                    if (finalImageUrls.length === 0 && productPreviewImage) {
                        finalImageUrls.push(productPreviewImage);
                    }

                    const adaptedProduct = {
                        ...data,
                        image_urls: finalImageUrls
                    };

                    setProduct(adaptedProduct);
                } catch (error) {
                    console.error('Failed to fetch product:', error);
                    setProduct(null);
                } finally {
                    setProductLoading(false);
                }
            };

            fetchProduct();
        } else {
            setProduct(null);
        }
    }, [productModalOpen, productId, productPreviewImage]);

    return (
        <>
            {/* Friend Profile Modal */}
            <FriendProfileModal
                friendId={profileUserId}
                isOpen={profileModalOpen}
                onClose={closeAll}
            />

            {/* Offer Details Modal */}
            {offerModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-gray-900">Offer Details</h2>
                            <button
                                onClick={closeAll}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="h-5 w-5 text-gray-600" />
                            </button>
                        </div>

                        {offerLoading ? (
                            <div className="p-6 flex items-center justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
                            </div>
                        ) : offer ? (
                            <div className="p-6 space-y-6">
                                {/* Title and Code */}
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-900">{offer.title}</h3>
                                    <p className="text-sm text-gray-500 mt-2">
                                        Code: <span className="font-mono font-semibold text-purple-600">{offer.offer_code}</span>
                                    </p>
                                </div>

                                {/* Description */}
                                {offer.description && (
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Description</h4>
                                        <p className="text-gray-600">{offer.description}</p>
                                    </div>
                                )}

                                {/* Terms & Conditions */}
                                {offer.terms_conditions && (
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Terms & Conditions</h4>
                                        <p className="text-gray-600 whitespace-pre-wrap">{offer.terms_conditions}</p>
                                    </div>
                                )}

                                {/* Validity */}
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Validity Period</h4>
                                    <p className="text-gray-600">
                                        From: {new Date(offer.valid_from).toLocaleDateString()}<br />
                                        Until: {new Date(offer.valid_until).toLocaleDateString()}
                                    </p>
                                </div>

                                {/* Share Section */}
                                <div className="pt-4 border-t border-gray-100">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Share this Offer</h4>
                                    <OfferShareButton
                                        offerId={offer.id}
                                        offerTitle={offer.title}
                                        offerDescription={offer.description}
                                        validUntil={offer.valid_until}
                                        offerImage={offer.icon_image_url}
                                        businessId={offer.business_id}
                                        businessName={offerBusiness?.business_name || 'Business'}
                                        variant="default"
                                        size="default"
                                        showLabel={true}
                                        label="Share"
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                    />
                                </div>

                                {/* Stats */}
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Performance</h4>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                                            <p className="text-2xl font-bold text-blue-600">{offer.view_count || 0}</p>
                                            <p className="text-xs text-gray-600 mt-1">Views</p>
                                        </div>
                                        <div className="text-center p-4 bg-purple-50 rounded-lg">
                                            <p className="text-2xl font-bold text-purple-600">{offer.share_count || 0}</p>
                                            <p className="text-xs text-gray-600 mt-1">Shares</p>
                                        </div>
                                        <div className="text-center p-4 bg-green-50 rounded-lg">
                                            <p className="text-2xl font-bold text-green-600">{offer.click_count || 0}</p>
                                            <p className="text-xs text-gray-600 mt-1">Clicks</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-6 text-center text-gray-500">
                                Offer not found
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Product View Modal */}
            {productModalOpen && (
                productLoading ? (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-lg p-6">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
                        </div>
                    </div>
                ) : product ? (
                    <ProductView
                        product={product}
                        isModal={true}
                        onClose={closeAll}
                    />
                ) : null
            )}
        </>
    );
}

export default DeepLinkModalProvider;
