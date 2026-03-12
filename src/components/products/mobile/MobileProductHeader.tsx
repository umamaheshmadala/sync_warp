import React, { useState } from 'react';
import { ArrowLeft, MoreVertical, Share, Flag, Edit, Trash, Archive, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { Menu } from '@headlessui/react';
import { Product } from '../../../types/product';
import { useAuthStore } from '../../../store/authStore';
import { ProductTagDisplay } from '../tags/ProductTagDisplay';
import { ShareFriendPickerModal } from '../../Sharing/ShareFriendPickerModal';

interface MobileProductHeaderProps {
    product: Product;
    onClose: () => void;
    businessName?: string;
    onEdit?: () => void;
    onDelete?: () => void;
    onArchive?: () => void;
}

export const MobileProductHeader: React.FC<MobileProductHeaderProps> = ({
    product,
    onClose,
    businessName,
    onEdit,
    onDelete,
    onArchive
}) => {
    const user = useAuthStore((state) => state.user);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);

    // Assuming product.business_id availability or we check ownership via props parent passes
    const isOwner = user?.id && product.business_id; // Simpler check needed or pass isOwner prop

    let businessNameStr = 'Business';
    if (businessName) {
        businessNameStr = businessName;
    } else if (product.businesses) {
        if (Array.isArray(product.businesses)) {
            businessNameStr = product.businesses[0]?.business_name || 'Business';
        } else {
            // Cast to expected object structure if not array
            businessNameStr = (product.businesses as any).business_name || 'Business';
        }
    }

    const displayName = businessNameStr;

    return (
        <div
            className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 pb-3 bg-white/95 backdrop-blur-md border-b border-gray-100"
            style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}
        >
            <button
                onClick={onClose}
                className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Back"
            >
                <ArrowLeft className="w-6 h-6 text-gray-900" />
            </button>

            <div className="flex-1 px-3 text-center">
                <h3 className="text-sm font-semibold text-gray-900 truncate">
                    {displayName}
                </h3>
                <div className="flex justify-center mt-1">
                    <ProductTagDisplay product={product} size="sm" limit={2} />
                </div>
            </div>

            <Menu as="div" className="relative">
                <Menu.Button
                    className="p-2 -mr-2 rounded-full hover:bg-gray-100 transition-colors"
                    aria-label="Options"
                >
                    <MoreVertical className="w-6 h-6 text-gray-900" />
                </Menu.Button>

                <Menu.Items className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-100 focus:outline-none overflow-hidden">
                    <Menu.Item>
                        {({ active }) => (
                            <button
                                onClick={() => setIsShareModalOpen(true)}
                                className={`${active ? 'bg-gray-50' : ''} flex items-center w-full px-4 py-3 text-sm text-gray-700`}
                            >
                                <Share className="w-4 h-4 mr-3" />
                                Share
                            </button>
                        )}
                    </Menu.Item>

                    {onEdit && (
                        <Menu.Item>
                            {({ active }) => (
                                <button onClick={onEdit} className={`${active ? 'bg-blue-50' : ''} flex items-center w-full px-4 py-3 text-sm font-medium text-gray-900`}>
                                    <Edit className="w-4 h-4 mr-3 text-blue-600" />
                                    Edit Product
                                </button>
                            )}
                        </Menu.Item>
                    )}

                    {onArchive && (
                        <Menu.Item>
                            {({ active }) => (
                                <button onClick={onArchive} className={`${active ? 'bg-amber-50' : ''} flex items-center w-full px-4 py-3 text-sm font-medium text-gray-900`}>
                                    {product.status === 'archived' ? (
                                        <>
                                            <RotateCcw className="w-4 h-4 mr-3 text-blue-600" />
                                            Unarchive
                                        </>
                                    ) : (
                                        <>
                                            <Archive className="w-4 h-4 mr-3 text-amber-600" />
                                            Archive
                                        </>
                                    )}
                                </button>
                            )}
                        </Menu.Item>
                    )}

                    {onDelete && (
                        <Menu.Item>
                            {({ active }) => (
                                <button onClick={onDelete} className={`${active ? 'bg-red-50' : ''} flex items-center w-full px-4 py-3 text-sm font-medium text-red-600`}>
                                    <Trash className="w-4 h-4 mr-3 text-red-600" />
                                    Delete
                                </button>
                            )}
                        </Menu.Item>
                    )}

                    {/* Report for non-owners */}
                    {!onEdit && (
                        <Menu.Item>
                            {({ active }) => (
                                <button 
                                    onClick={() => toast('Reporting system coming soon', { icon: '🛡️' })}
                                    className={`${active ? 'bg-gray-50' : ''} flex items-center w-full px-4 py-3 text-sm font-medium text-gray-900 border-t border-gray-50`}
                                >
                                    <Flag className="w-4 h-4 mr-3 text-red-500" />
                                    Report Product
                                </button>
                            )}
                        </Menu.Item>
                    )}
                </Menu.Items>
            </Menu>

            <ShareFriendPickerModal
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
                entityType="product"
                entityId={product.id}
                entityData={{
                    title: product.name,
                    description: product.description?.slice(0, 100) || undefined,
                    imageUrl: product.image_urls?.[0] || product.image_url,
                    url: `${window.location.origin}/product/${product.id}`
                }}
            />
        </div>
    );
};
