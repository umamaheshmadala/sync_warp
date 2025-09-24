// FilterPanel.tsx
// Advanced search filter panel with multiple filter options
// Includes discount ranges, business types, location, and date filters

import React, { useState, useEffect } from 'react';
import { X, Filter, ChevronDown, ChevronUp, MapPin, Calendar, Percent, Tag } from 'lucide-react';
import { SearchFilters } from '../../services/searchService';
import { CouponType, DiscountType, CouponStatus, TargetAudience } from '../../types/coupon';

interface FilterPanelProps {
  filters: SearchFilters;
  onFiltersChange: (filters: Partial<SearchFilters>) => void;
  onClearFilters: () => void;
  isOpen: boolean;
  onToggle: () => void;
  activeFiltersCount: number;
}

interface FilterSection {
  key: string;
  title: string;
  icon: React.ReactNode;
  isExpanded: boolean;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onFiltersChange,
  onClearFilters,
  isOpen,
  onToggle,
  activeFiltersCount
}) => {
  // Track which filter sections are expanded
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['couponType', 'discountValue'])
  );

  // Filter section configuration
  const filterSections: FilterSection[] = [
    {
      key: 'couponType',
      title: 'Coupon Type',
      icon: <Tag className="w-4 h-4" />,
      isExpanded: expandedSections.has('couponType')
    },
    {
      key: 'discountValue',
      title: 'Discount Amount',
      icon: <Percent className="w-4 h-4" />,
      isExpanded: expandedSections.has('discountValue')
    },
    {
      key: 'location',
      title: 'Location & Distance',
      icon: <MapPin className="w-4 h-4" />,
      isExpanded: expandedSections.has('location')
    },
    {
      key: 'validity',
      title: 'Validity Period',
      icon: <Calendar className="w-4 h-4" />,
      isExpanded: expandedSections.has('validity')
    }
  ];

  // Toggle section expansion
  const toggleSection = (sectionKey: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionKey)) {
      newExpanded.delete(sectionKey);
    } else {
      newExpanded.add(sectionKey);
    }
    setExpandedSections(newExpanded);
  };

  // Update coupon types filter
  const updateCouponTypes = (type: CouponType, checked: boolean) => {
    const currentTypes = filters.couponTypes || [];
    const newTypes = checked
      ? [...currentTypes, type]
      : currentTypes.filter(t => t !== type);
    
    onFiltersChange({ couponTypes: newTypes });
  };

  // Update discount types filter
  const updateDiscountTypes = (type: DiscountType, checked: boolean) => {
    const currentTypes = filters.discountTypes || [];
    const newTypes = checked
      ? [...currentTypes, type]
      : currentTypes.filter(t => t !== type);
    
    onFiltersChange({ discountTypes: newTypes });
  };

  // Coupon type options
  const couponTypeOptions: { value: CouponType; label: string; description: string }[] = [
    { value: 'percentage', label: 'Percentage Off', description: 'Get a % discount' },
    { value: 'fixed_amount', label: 'Fixed Amount Off', description: 'Get ₹ off' },
    { value: 'buy_x_get_y', label: 'Buy X Get Y', description: 'BOGO deals' },
    { value: 'free_item', label: 'Free Item', description: 'Get something free' },
    { value: 'free_shipping', label: 'Free Delivery', description: 'Free shipping/delivery' },
    { value: 'bundle_deal', label: 'Bundle Deal', description: 'Special combo pricing' }
  ];

  // Discount range options
  const discountRanges = [
    { min: 0, max: 10, label: 'Up to 10%' },
    { min: 10, max: 25, label: '10% - 25%' },
    { min: 25, max: 50, label: '25% - 50%' },
    { min: 50, max: 100, label: '50% or more' }
  ];

  // Fixed amount ranges
  const fixedAmountRanges = [
    { min: 0, max: 100, label: 'Up to ₹100' },
    { min: 100, max: 500, label: '₹100 - ₹500' },
    { min: 500, max: 1000, label: '₹500 - ₹1000' },
    { min: 1000, max: 10000, label: '₹1000+' }
  ];

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <Filter className="w-4 h-4" />
        <span>Filters</span>
        {activeFiltersCount > 0 && (
          <div className="bg-indigo-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {activeFiltersCount}
          </div>
        )}
      </button>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
          {activeFiltersCount > 0 && (
            <div className="bg-indigo-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {activeFiltersCount}
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {activeFiltersCount > 0 && (
            <button
              onClick={onClearFilters}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Clear All
            </button>
          )}
          <button
            onClick={onToggle}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Filter Sections */}
      <div className="max-h-96 overflow-y-auto">
        {/* Coupon Type Section */}
        <div className="border-b border-gray-100">
          <button
            onClick={() => toggleSection('couponType')}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
          >
            <div className="flex items-center space-x-2">
              <Tag className="w-4 h-4 text-gray-600" />
              <span className="font-medium text-gray-900">Coupon Type</span>
            </div>
            {expandedSections.has('couponType') ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </button>

          {expandedSections.has('couponType') && (
            <div className="px-4 pb-4">
              <div className="space-y-3">
                {couponTypeOptions.map((option) => (
                  <label key={option.value} className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.couponTypes?.includes(option.value) || false}
                      onChange={(e) => updateCouponTypes(option.value, e.target.checked)}
                      className="mt-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900">{option.label}</div>
                      <div className="text-xs text-gray-500">{option.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Discount Value Section */}
        <div className="border-b border-gray-100">
          <button
            onClick={() => toggleSection('discountValue')}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
          >
            <div className="flex items-center space-x-2">
              <Percent className="w-4 h-4 text-gray-600" />
              <span className="font-medium text-gray-900">Discount Amount</span>
            </div>
            {expandedSections.has('discountValue') ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </button>

          {expandedSections.has('discountValue') && (
            <div className="px-4 pb-4">
              <div className="space-y-4">
                {/* Percentage Discounts */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Percentage Discounts</h4>
                  <div className="space-y-2">
                    {discountRanges.map((range, index) => (
                      <label key={index} className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name="discountRange"
                          checked={
                            filters.minDiscountValue === range.min && 
                            filters.maxDiscountValue === range.max
                          }
                          onChange={() => onFiltersChange({
                            minDiscountValue: range.min,
                            maxDiscountValue: range.max
                          })}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm text-gray-700">{range.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Fixed Amount Discounts */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Fixed Amount Off</h4>
                  <div className="space-y-2">
                    {fixedAmountRanges.map((range, index) => (
                      <label key={index} className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name="discountRange"
                          checked={
                            filters.minDiscountValue === range.min && 
                            filters.maxDiscountValue === range.max
                          }
                          onChange={() => onFiltersChange({
                            minDiscountValue: range.min,
                            maxDiscountValue: range.max
                          })}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm text-gray-700">{range.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Clear discount filter */}
                {(filters.minDiscountValue !== undefined || filters.maxDiscountValue !== undefined) && (
                  <button
                    onClick={() => onFiltersChange({
                      minDiscountValue: undefined,
                      maxDiscountValue: undefined
                    })}
                    className="text-xs text-indigo-600 hover:text-indigo-700"
                  >
                    Clear discount filter
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Location Section */}
        <div className="border-b border-gray-100">
          <button
            onClick={() => toggleSection('location')}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
          >
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-gray-600" />
              <span className="font-medium text-gray-900">Location</span>
            </div>
            {expandedSections.has('location') ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </button>

          {expandedSections.has('location') && (
            <div className="px-4 pb-4">
              <div className="space-y-4">
                {/* Business Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Business Name
                  </label>
                  <input
                    type="text"
                    value={filters.businessName || ''}
                    onChange={(e) => onFiltersChange({ businessName: e.target.value || undefined })}
                    placeholder="Enter business name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                {/* Distance Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Distance
                  </label>
                  <div className="space-y-2">
                    {[1, 5, 10, 25, 50].map((distance) => (
                      <label key={distance} className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name="distance"
                          checked={filters.distance === distance}
                          onChange={() => onFiltersChange({ distance })}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm text-gray-700">Within {distance}km</span>
                      </label>
                    ))}
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="distance"
                        checked={!filters.distance}
                        onChange={() => onFiltersChange({ distance: undefined })}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700">Any distance</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Validity Section */}
        <div>
          <button
            onClick={() => toggleSection('validity')}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
          >
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-600" />
              <span className="font-medium text-gray-900">Validity</span>
            </div>
            {expandedSections.has('validity') ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </button>

          {expandedSections.has('validity') && (
            <div className="px-4 pb-4">
              <div className="space-y-4">
                {/* Valid Only Toggle */}
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.validOnly || false}
                    onChange={(e) => onFiltersChange({ validOnly: e.target.checked })}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">Show valid coupons only</div>
                    <div className="text-xs text-gray-500">Exclude expired coupons</div>
                  </div>
                </label>

                {/* Available Only Toggle */}
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.availableOnly || false}
                    onChange={(e) => onFiltersChange({ availableOnly: e.target.checked })}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">Show available coupons only</div>
                    <div className="text-xs text-gray-500">Exclude exhausted coupons</div>
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FilterPanel;