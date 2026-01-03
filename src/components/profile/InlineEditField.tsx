import React, { useState } from 'react';
import { Edit3, Check, X, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface InlineEditFieldProps {
  label?: string;
  value: string | null;
  icon?: React.ReactNode;
  type?: 'text' | 'email' | 'tel' | 'url' | 'date' | 'select';
  placeholder?: string;
  editable?: boolean;
  onSave: (value: string) => Promise<void>;
  validate?: (value: string) => string | null;
  multiline?: boolean;
  maxLength?: number;
  helperText?: string;
  className?: string;
  options?: { label: string; value: string }[];
  // Global edit mode props
  globalEditMode?: boolean;
  externalValue?: string;
  onValueChange?: (value: string) => void;
  hideIconOnMobile?: boolean;
}

export function InlineEditField({
  label,
  value,
  icon,
  type = 'text',
  placeholder,
  editable = true,
  onSave,
  validate,
  multiline = false,
  maxLength,
  helperText,
  className = '',
  options = [],
  globalEditMode = false,
  externalValue,
  onValueChange,
  hideIconOnMobile = false,
}: InlineEditFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');

  // Get display value for select type
  const getDisplayValue = () => {
    if (type === 'select' && options.length > 0) {
      const selectedOption = options.find(opt => opt.value === value);
      return selectedOption ? selectedOption.label : value;
    }
    return value;
  };
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use global edit mode if provided
  const effectiveIsEditing = globalEditMode || isEditing;
  const effectiveEditValue = globalEditMode && externalValue !== undefined ? externalValue : editValue;

  const handleValueChange = (newValue: string) => {
    if (globalEditMode && onValueChange) {
      onValueChange(newValue);
    } else {
      setEditValue(newValue);
    }
  };

  const handleEdit = () => {
    setEditValue(value || '');
    setIsEditing(true);
    setError(null);
  };

  const handleSave = async () => {
    // Validation
    if (validate) {
      const validationError = validate(editValue);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      await onSave(editValue.trim());
      setIsEditing(false);
      toast.success(`${label || 'Field'} updated successfully!`, { icon: '✅' });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update';
      setError(errorMessage);
      toast.error(`Failed to update ${label || 'field'}`, { icon: '❌' });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value || '');
    setIsEditing(false);
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    } else if (e.key === 'Enter' && !multiline && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <div className="space-y-0.5">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}

      {!effectiveIsEditing ? (
        <div className="relative group hover:bg-gray-50 rounded-lg px-0 py-0 md:px-1 md:py-0.5 transition-colors">
          <div className={`flex items-center justify-center md:justify-start min-w-0 ${editable && !globalEditMode ? 'pr-9' : ''}`}>
            {icon && (
              <span className={`flex-shrink-0 mr-1.5 md:mr-2 text-gray-400 ${hideIconOnMobile ? 'hidden md:block' : ''}`}>
                {icon}
              </span>
            )}
            <span className={`${className} ${multiline ? 'line-clamp-2 whitespace-normal break-all' : 'truncate'}`}>
              {getDisplayValue() || (
                <span className="text-gray-400 italic">
                  {placeholder || 'Not provided'}
                </span>
              )}
            </span>
          </div>
          {editable && !globalEditMode && (
            <button
              onClick={handleEdit}
              className="absolute right-0 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-blue-600 transition-all hover:bg-blue-50 rounded"
              title={label ? `Edit ${label}` : 'Edit'}
            >
              <Edit3 className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="relative">
            {multiline ? (
              <textarea
                value={effectiveEditValue}
                onChange={(e) => handleValueChange(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full px-3 py-2 pb-10 border border-blue-500 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder={placeholder}
                rows={4}
                maxLength={maxLength}
                autoFocus
              />
            ) : type === 'select' ? (
              <select
                value={effectiveEditValue}
                onChange={(e) => handleValueChange(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full px-3 py-2 pr-20 border border-blue-500 rounded-lg focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                autoFocus
              >
                <option value="" disabled>Select option</option>
                {options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={type}
                value={effectiveEditValue}
                onChange={(e) => handleValueChange(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full px-3 py-2 pr-20 border border-blue-500 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder={placeholder}
                maxLength={maxLength}
                autoFocus
              />
            )}

            {/* Inline action buttons - hide in global edit mode */}
            {!globalEditMode && (
              <div className={`absolute flex gap-1 ${multiline
                ? 'right-2 bottom-2'
                : 'right-2 top-1/2 -translate-y-1/2'
                }`}>
                <button
                  onClick={handleCancel}
                  disabled={loading}
                  className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-50"
                  title="Cancel (Esc)"
                >
                  <X className="h-4 w-4" />
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading || !editValue.trim()}
                  className="p-1.5 text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors disabled:opacity-50"
                  title="Save (Enter)"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                </button>
              </div>
            )}
          </div>

          {maxLength && multiline && (
            <div className="flex justify-end">
              <span className={`text-xs ${effectiveEditValue.length > maxLength * 0.9
                ? 'text-orange-600 dark:text-orange-400'
                : 'text-gray-500'
                }`}>
                {effectiveEditValue.length}/{maxLength}
              </span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          {helperText && !error && (
            <p className="text-xs text-gray-500">
              {helperText}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
