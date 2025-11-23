import React, { useState } from 'react';
import { Edit3, Check, X, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface InlineEditFieldProps {
  label: string;
  value: string | null;
  icon?: React.ReactNode;
  type?: 'text' | 'email' | 'tel' | 'url' | 'date';
  placeholder?: string;
  editable?: boolean;
  onSave: (value: string) => Promise<void>;
  validate?: (value: string) => string | null;
  multiline?: boolean;
  maxLength?: number;
  helperText?: string;
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
  helperText
}: InlineEditFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      toast.success(`${label} updated successfully!`, { icon: '✅' });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update';
      setError(errorMessage);
      toast.error(`Failed to update ${label}`, { icon: '❌' });
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
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>

      {!isEditing ? (
        <div className="flex items-center justify-between group hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg px-3 py-2 transition-colors">
          <div className="flex items-center flex-1 min-w-0">
            {icon && (
              <span className="flex-shrink-0 mr-3 text-gray-400">
                {icon}
              </span>
            )}
            <span className="text-gray-900 dark:text-white truncate">
              {value || (
                <span className="text-gray-400 italic">
                  {placeholder || 'Not provided'}
                </span>
              )}
            </span>
          </div>
          {editable && (
            <button
              onClick={handleEdit}
              className="flex-shrink-0 ml-4 p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
              title={`Edit ${label}`}
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
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full px-3 py-2 pr-20 border border-blue-500 dark:border-blue-400 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none"
                placeholder={placeholder}
                rows={4}
                maxLength={maxLength}
                autoFocus
              />
            ) : (
              <input
                type={type}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full px-3 py-2 pr-20 border border-blue-500 dark:border-blue-400 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder={placeholder}
                maxLength={maxLength}
                autoFocus
              />
            )}

            {/* Inline action buttons */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
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
          </div>

          {maxLength && multiline && (
            <div className="flex justify-end">
              <span className={`text-xs ${editValue.length > maxLength * 0.9
                  ? 'text-orange-600 dark:text-orange-400'
                  : 'text-gray-500'
                }`}>
                {editValue.length}/{maxLength}
              </span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          {helperText && !error && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {helperText}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
