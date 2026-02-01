import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useForm, Controller } from 'react-hook-form';
import {
  X,
  Upload,
  Trash2,
  Star,
  Package,
  ImageIcon,
  Eye
} from 'lucide-react';
import { Product, ProductFormData } from '../../types/product';
import { useProducts } from '../../hooks/useProducts';
import { toast } from 'react-hot-toast';

interface ProductFormProps {
  businessId: string;
  product?: Product | null;
  onClose: () => void;
  onSuccess: () => void;
}

const ProductForm: React.FC<ProductFormProps> = ({
  businessId,
  product,
  onClose,
  onSuccess
}) => {
  const { createProduct, updateProduct, uploadProductImage, loading } = useProducts();
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>(product?.image_urls || []);
  const [imageUploading, setImageUploading] = useState(false);
  const [previewImages, setPreviewImages] = useState<string[]>([]);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors }
  } = useForm<ProductFormData>({
    defaultValues: {
      name: product?.name || '',
      description: product?.description || '',
      category: product?.category || '',
      price: product?.price || 0,
      currency: product?.currency || 'INR',
      is_available: product?.is_available ?? true,
      is_featured: product?.is_featured || false,
      display_order: product?.display_order || 0,
      image_urls: product?.image_urls || []
    }
  });

  const isEditing = !!product;

  // Handle image file selection
  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);

    if (files.length + imageFiles.length + imageUrls.length > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }

    // Create preview URLs
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setPreviewImages(prev => [...prev, ...newPreviews]);
    setImageFiles(prev => [...prev, ...files]);
  };

  // Remove image
  const removeImage = (index: number, isExisting: boolean = false) => {
    if (isExisting) {
      setImageUrls(prev => prev.filter((_, i) => i !== index));
    } else {
      // Remove from new files
      const previewIndex = index - imageUrls.length;
      setImageFiles(prev => prev.filter((_, i) => i !== previewIndex));
      setPreviewImages(prev => prev.filter((_, i) => i !== previewIndex));
    }
  };

  // Upload images to storage
  const uploadImages = async (): Promise<string[]> => {
    if (imageFiles.length === 0) return imageUrls;

    setImageUploading(true);
    const uploadPromises = imageFiles.map(file =>
      uploadProductImage(file, product?.id || 'temp')
    );

    try {
      const uploadedUrls = await Promise.all(uploadPromises);
      const validUrls = uploadedUrls.filter(url => url !== null) as string[];
      return [...imageUrls, ...validUrls];
    } catch (error) {
      toast.error('Failed to upload some images');
      return imageUrls;
    } finally {
      setImageUploading(false);
    }
  };

  const onSubmit = async (data: ProductFormData) => {
    try {
      // Upload new images first
      const finalImageUrls = await uploadImages();

      const productData: ProductFormData = {
        ...data,
        image_urls: finalImageUrls
      };

      let result;
      if (isEditing && product) {
        result = await updateProduct(product.id, productData);
      } else {
        result = await createProduct(productData, businessId);
      }

      if (result) {
        toast.success(`Product ${isEditing ? 'updated' : 'created'} successfully!`);
        onSuccess();
      }
    } catch (error) {
      console.error('Error submitting product:', error);
      toast.error(`Failed to ${isEditing ? 'update' : 'create'} product`);
    }
  };

  // Common product categories
  const commonCategories = [
    'Food & Beverages',
    'Electronics',
    'Clothing & Accessories',
    'Beauty & Personal Care',
    'Home & Garden',
    'Sports & Outdoors',
    'Books & Media',
    'Automotive',
    'Health & Wellness',
    'Professional Services'
  ];

  return (
    <div className="max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditing ? 'Edit Product' : 'Add New Product'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {isEditing ? 'Update product information' : 'Add a new product to your catalog'}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            Basic Information
          </h3>

          {/* Product Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product Name *
            </label>
            <input
              type="text"
              {...register('name', { required: 'Product name is required' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter product name"
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              {...register('description')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Describe your product..."
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <div className="space-y-2">
                  <select
                    {...field}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a category</option>
                    {commonCategories.map(category => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Or enter custom category"
                    value={field.value || ''}
                    onChange={field.onChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}
            />
          </div>

          {/* Price and Currency */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Currency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Currency *
              </label>
              <select
                {...register('currency', { required: 'Currency is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="INR">₹ INR</option>
              </select>
              {errors.currency && (
                <p className="text-red-500 text-sm mt-1">{errors.currency.message}</p>
              )}
            </div>

            {/* Price */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                {...register('price', {
                  required: 'Price is required',
                  min: { value: 0, message: 'Price must be 0 or greater' }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
              />
              {errors.price && (
                <p className="text-red-500 text-sm mt-1">{errors.price.message}</p>
              )}
              <p className="text-sm text-gray-500 mt-1">
                Enter the product price. Use 0 for "Price on request"
              </p>
            </div>
          </div>
        </div>


        {/* Images */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-purple-600" />
            Product Images
          </h3>

          {/* Image Upload */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
            <div className="text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-2">
                <label className="cursor-pointer">
                  <span className="mt-2 block text-sm font-medium text-gray-900">
                    Upload product images
                  </span>
                  <span className="mt-1 block text-sm text-gray-500">
                    PNG, JPG, GIF up to 10MB each (max 5 images)
                  </span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Image Preview */}
          {(imageUrls.length > 0 || previewImages.length > 0) && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Existing images */}
              {imageUrls.map((url, index) => (
                <div key={`existing-${index}`} className="relative group">
                  <img
                    src={url}
                    alt={`Product ${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index, true)}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {/* New preview images */}
              {previewImages.map((url, index) => (
                <div key={`preview-${index}`} className="relative group">
                  <img
                    src={url}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(imageUrls.length + index)}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            Settings
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Availability Toggle */}
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div>
                <div className="flex items-center space-x-2">
                  <Eye className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-gray-900">Available</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Show this product to customers
                </p>
              </div>
              <Controller
                name="is_available"
                control={control}
                render={({ field }) => (
                  <button
                    type="button"
                    onClick={() => field.onChange(!field.value)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${field.value ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${field.value ? 'translate-x-6' : 'translate-x-1'
                        }`}
                    />
                  </button>
                )}
              />
            </div>

            {/* Featured Toggle */}
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div>
                <div className="flex items-center space-x-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  <span className="font-medium text-gray-900">Featured</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Show in business storefront (max 4 products)
                </p>
              </div>
              <Controller
                name="is_featured"
                control={control}
                render={({ field }) => (
                  <button
                    type="button"
                    onClick={() => field.onChange(!field.value)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${field.value ? 'bg-yellow-500' : 'bg-gray-200'
                      }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${field.value ? 'translate-x-6' : 'translate-x-1'
                        }`}
                    />
                  </button>
                )}
              />
            </div>
          </div>

          {/* Display Order */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Display Order (for featured products)
            </label>
            <input
              type="number"
              min="0"
              {...register('display_order', { min: { value: 0, message: 'Display order must be 0 or greater' } })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0"
            />
            <p className="text-sm text-gray-500 mt-1">
              Lower numbers appear first among featured products. Only applies to featured products.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <motion.button
            type="submit"
            disabled={loading || imageUploading}
            whileHover={{ scale: loading || imageUploading ? 1 : 1.05 }}
            whileTap={{ scale: loading || imageUploading ? 1 : 0.95 }}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading || imageUploading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>{imageUploading ? 'Uploading...' : 'Saving...'}</span>
              </div>
            ) : (
              <span>{isEditing ? 'Update Product' : 'Create Product'}</span>
            )}
          </motion.button>
        </div>
      </form>
    </div>
  );
};

export default ProductForm;