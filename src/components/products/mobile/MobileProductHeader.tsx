import React from 'react';
import { ArrowLeft, MoreVertical, Share, Flag, Edit, Trash, Archive, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Menu } from '@headlessui/react';
import { Product } from '../../../types/product';
import { useAuthStore } from '../../../store/authStore';
import { ProductTagDisplay } from '../tags/ProductTagDisplay';

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
    const { user } = useAuthStore();
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
        <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
            <button
                onClick={onClose}
                className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Back"
            >
                <ArrowLeft className="w-6 h-6 text-gray-900 dark:text-white" />
            </button>

            <div className="flex-1 px-3 text-center">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {displayName}
                </h3>
                <div className="flex justify-center mt-1">
                    <ProductTagDisplay product={product} size="sm" limit={2} />
                </div>
            </div>

            <Menu as="div" className="relative">
                <Menu.Button
                    className="p-2 -mr-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    aria-label="Options"
                >
                    <MoreVertical className="w-6 h-6 text-gray-900 dark:text-white" />
                </Menu.Button>

                <Menu.Items className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 focus:outline-none overflow-hidden">
                    <Menu.Item>
                        {({ active }) => (
                            <button className={`${active ? 'bg-gray-50 dark:bg-gray-700' : ''} flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-200`}>
                                <Share className="w-4 h-4 mr-3" />
                                Share
                            </button>
                        )}
                    </Menu.Item>

                    {/* Owner Options */}
                    {onEdit && (
                        <Menu.Item>
                            {({ active }) => (
                                <button onClick={onEdit} className={`${active ? 'bg-gray-50 dark:bg-gray-700' : ''} flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-200`}>
                                    <Edit className="w-4 h-4 mr-3" />
                                    Edit Product
                                </button>
                            )}
                        </Menu.Item>
                    )}

                    {onArchive && (
                        <Menu.Item>
                            {({ active }) => (
                                <button onClick={onArchive} className={`${active ? 'bg-gray-50 dark:bg-gray-700' : ''} flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-200`}>
                                    {product.status === 'archived' ? (
                                        <>
                                            <RotateCcw className="w-4 h-4 mr-3" />
                                            Unarchive
                                        </>
                                    ) : (
                                        <>
                                            <Archive className="w-4 h-4 mr-3" />
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
                                <button onClick={onDelete} className={`${active ? 'bg-red-50 dark:bg-red-900/20' : ''} flex items-center w-full px-4 py-3 text-sm text-red-600 dark:text-red-400`}>
                                    <Trash className="w-4 h-4 mr-3" />
                                    Delete
                                </button>
                            )}
                        </Menu.Item>
                    )}

                    {/* Report for non-owners */}
                    {!onEdit && (
                        <Menu.Item>
                            {({ active }) => (
                                <button className={`${active ? 'bg-gray-50 dark:bg-gray-700' : ''} flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-200`}>
                                    <Flag className="w-4 h-4 mr-3" />
                                    Report
                                </button>
                            )}
                        </Menu.Item>
                    )}
                </Menu.Items>
            </Menu>
        </div>
    );
};
