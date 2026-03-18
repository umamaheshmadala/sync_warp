import React, { useState, useEffect } from 'react';
import { Tag, Loader, AlertCircle, Save } from 'lucide-react';
import { BusinessCategoryService } from '../../../services/businessCategoryService';
import { ProductCategory } from '../../../types/product';
import { toast } from 'react-hot-toast';

interface BusinessCategoryEditorProps {
  businessId: string;
  onUpdate?: () => void;
}

export const BusinessCategoryEditor: React.FC<BusinessCategoryEditorProps> = ({
  businessId,
  onUpdate
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<ProductCategory[]>([]);
  const [error, setError] = useState<string | null>(null);

  // For category selection UI (similar to ProductCategoryStep)
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, [businessId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load all available categories (only Major/Main for business level)
      const allCategories = await BusinessCategoryService.getAvailableCategories();
      setCategories(allCategories);
      
      // Load currently selected categories for this business
      const currentCategories = await BusinessCategoryService.getBusinessCategories(businessId);
      setSelectedCategories(currentCategories);
    } catch (err: any) {
      console.error('Error loading business categories:', err);
      setError(err.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (selectedCategories.length === 0) {
      toast.error('Please select at least one category');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      
      const categoryIds = selectedCategories.map(c => c.id);
      await BusinessCategoryService.updateBusinessCategories(businessId, categoryIds);
      
      toast.success('Business categories updated successfully');
      if (onUpdate) onUpdate();
    } catch (err: any) {
      console.error('Error updating business categories:', err);
      setError(err.message || 'Failed to update categories');
      toast.error('Failed to update categories');
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = (category: ProductCategory) => {
    const isSelected = selectedCategories.some(c => c.id === category.id);
    if (isSelected) {
      // Don't allow removing the last category
      if (selectedCategories.length === 1) {
        toast.error('You must have at least one business category');
        return;
      }
      setSelectedCategories(prev => prev.filter(c => c.id !== category.id));
    } else {
      setSelectedCategories(prev => [...prev, category]);
    }
  };

  const removeCategory = (categoryId: string) => {
    if (selectedCategories.length <= 1) {
      toast.error('You must have at least one business category');
      return;
    }
    setSelectedCategories(prev => prev.filter(c => c.id !== categoryId));
  };

  const filteredCategories = categories.filter(cat => 
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 mt-6">
      <div className="flex items-center space-x-2 mb-4">
        <Tag className="w-5 h-5 text-indigo-600" />
        <h3 className="text-lg font-semibold text-gray-900">Product Categories</h3>
      </div>
      
      <p className="text-sm text-gray-600 mb-6">
        Select the types of products your business offers. This helps customers find your store.
      </p>

      {error && (
        <div className="mb-6 p-4 bg-red-50 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Selected Categories Display */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Selected Categories
        </label>
        {selectedCategories.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {selectedCategories.map(cat => (
              <span 
                key={cat.id} 
                className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800"
              >
                {cat.name}
                <button
                  onClick={() => removeCategory(cat.id)}
                  className="ml-1.5 text-indigo-600 hover:text-indigo-900 focus:outline-none"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">No categories selected.</p>
        )}
      </div>

      {/* Category Lookup */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Add Categories
        </label>
        <div className="relative">
          <input
            type="text"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
          />

          {showDropdown && (
            <>
              <div 
                className="fixed inset-0 z-10"
                onClick={() => setShowDropdown(false)}
              ></div>
              <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredCategories.length > 0 ? (
                  filteredCategories.map(category => (
                    <button
                      key={category.id}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center justify-between"
                      onClick={() => {
                        toggleCategory(category);
                        setSearchQuery('');
                        setShowDropdown(false);
                      }}
                    >
                      <span className="text-sm text-gray-900">{category.name}</span>
                      {selectedCategories.some(c => c.id === category.id) && (
                        <span className="text-xs text-indigo-600 font-medium bg-indigo-50 px-2 py-1 rounded">
                          Added
                        </span>
                      )}
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-sm text-gray-500 text-center">
                    No categories found
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex justify-end mt-4 pt-4 border-t border-gray-100">
        <button
          onClick={handleSave}
          disabled={saving || selectedCategories.length === 0}
          className="flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {saving ? (
            <Loader className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {saving ? 'Saving...' : 'Save Categories'}
        </button>
      </div>
    </div>
  );
};
