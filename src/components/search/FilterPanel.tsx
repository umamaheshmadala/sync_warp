// FilterPanel.tsx
// Mobile-friendly search filter panel with simple filter options
// Redesigned for responsive layout

import React, { useState, useEffect, useRef } from 'react';
import { X, Filter, ChevronDown, ChevronUp, Tag, Percent, Check } from 'lucide-react';
import { SearchFilters } from '../../services/searchService';
import { CouponType } from '../../types/coupon';

interface FilterPanelProps {
  filters: SearchFilters;
  onFiltersChange: (filters: Partial<SearchFilters>) => void;
  onClearFilters: () => void;
  isOpen: boolean;
  onToggle: () => void;
  activeFiltersCount: number;
}

// Filter button component (to be placed in the scrollable row)
export const FilterButton: React.FC<{ isOpen: boolean, onToggle: () => void, activeFiltersCount: number }> = ({
  isOpen, onToggle, activeFiltersCount
}) => {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-2 px-2.5 py-1.5 border rounded-lg transition-colors text-sm ${isOpen
        ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
        }`}
    >
      <Filter className="w-4 h-4" />
      <span className="hidden sm:inline">Filters</span>
      {activeFiltersCount > 0 && (
        <span className="bg-indigo-600 text-white text-xs rounded-full min-w-[1.25rem] h-5 flex items-center justify-center px-1">
          {activeFiltersCount}
        </span>
      )}
    </button>
  );
};

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onFiltersChange,
  onClearFilters,
  isOpen,
  onToggle,
  activeFiltersCount
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        if (isOpen) onToggle();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onToggle]);

  // Coupon type options - simplified
  const couponTypeOptions: { value: CouponType; label: string }[] = [
    { value: 'percentage', label: 'Percentage Off' },
    { value: 'fixed_amount', label: 'Fixed Amount Off' },
    { value: 'buy_x_get_y', label: 'Buy X Get Y' },
    { value: 'free_item', label: 'Free Item' },
    { value: 'free_shipping', label: 'Free Delivery' },
  ];

  // Discount range options
  const discountRanges = [
    { min: 0, max: 10, label: 'Up to 10%' },
    { min: 10, max: 25, label: '10% - 25%' },
    { min: 25, max: 50, label: '25% - 50%' },
    { min: 50, max: 100, label: '50%+' },
  ];

  // Update coupon types filter
  const toggleCouponType = (type: CouponType) => {
    const currentTypes = filters.couponTypes || [];
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter(t => t !== type)
      : [...currentTypes, type];
    onFiltersChange({ couponTypes: newTypes.length > 0 ? newTypes : undefined });
  };

  // Set discount range
  const setDiscountRange = (min: number, max: number) => {
    const isCurrentlySelected = filters.minDiscountValue === min && filters.maxDiscountValue === max;
    if (isCurrentlySelected) {
      onFiltersChange({ minDiscountValue: undefined, maxDiscountValue: undefined });
    } else {
      onFiltersChange({ minDiscountValue: min, maxDiscountValue: max });
    }
  };

  if (!isOpen) return null;

  // Filter dropdown panel - compact dropdown
  return (
    <div
      ref={panelRef}
      className="absolute left-0 top-full mt-2 w-[280px] bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-[60vh] overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-600" />
          <span className="font-medium text-gray-900 text-sm">Filters</span>
          {activeFiltersCount > 0 && (
            <span className="bg-indigo-100 text-indigo-700 text-xs rounded-full px-1.5 py-0.5">
              {activeFiltersCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeFiltersCount > 0 && (
            <button
              onClick={onClearFilters}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Clear
            </button>
          )}
          <button onClick={onToggle} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Filter content */}
      <div className="max-h-64 overflow-y-auto px-3 py-2 space-y-3">
        {/* Coupon Type */}
        <div>
          <h4 className="text-xs font-medium text-gray-700 mb-1.5">Coupon Type</h4>
          <div className="flex flex-wrap gap-1.5">
            {couponTypeOptions.map((option) => {
              const isSelected = filters.couponTypes?.includes(option.value);
              return (
                <button
                  key={option.value}
                  onClick={() => toggleCouponType(option.value)}
                  className={`px-2 py-1 text-xs rounded-full border transition-colors ${isSelected
                    ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Discount Amount */}
        <div>
          <h4 className="text-xs font-medium text-gray-700 mb-1.5">Discount Range</h4>
          <div className="flex flex-wrap gap-1.5">
            {discountRanges.map((range, index) => {
              const isSelected = filters.minDiscountValue === range.min && filters.maxDiscountValue === range.max;
              return (
                <button
                  key={index}
                  onClick={() => setDiscountRange(range.min, range.max)}
                  className={`px-2 py-1 text-xs rounded-full border transition-colors ${isSelected
                    ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                >
                  {range.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Toggles */}
        <div>
          <h4 className="text-xs font-medium text-gray-700 mb-1.5">Quick Filters</h4>
          <div className="flex flex-wrap gap-1.5">
            <label className="flex items-center gap-1.5 cursor-pointer px-2 py-1 rounded-full border border-gray-200 hover:bg-gray-50">
              <input
                type="checkbox"
                checked={filters.validOnly || false}
                onChange={(e) => onFiltersChange({ validOnly: e.target.checked || undefined })}
                className="w-3 h-3 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs text-gray-600">Valid</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer px-2 py-1 rounded-full border border-gray-200 hover:bg-gray-50">
              <input
                type="checkbox"
                checked={filters.availableOnly || false}
                onChange={(e) => onFiltersChange({ availableOnly: e.target.checked || undefined })}
                className="w-3 h-3 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs text-gray-600">Available</span>
            </label>
          </div>
        </div>
      </div>

      {/* Apply button */}
      <div className="px-3 py-2 border-t border-gray-100">
        <button
          onClick={onToggle}
          className="w-full py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          Apply Filters
        </button>
      </div>
    </div>
  );
};

export default FilterPanel;
