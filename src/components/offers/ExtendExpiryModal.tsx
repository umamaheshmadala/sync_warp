// src/components/offers/ExtendExpiryModal.tsx
import { useState } from 'react';
import { X, Calendar, AlertCircle } from 'lucide-react';
import type { Offer } from '../../types/offers';

interface ExtendExpiryModalProps {
  offer: Offer;
  onExtend: (days: number) => Promise<void>;
  onClose: () => void;
}

export function ExtendExpiryModal({ offer, onExtend, onClose }: ExtendExpiryModalProps) {
  const [days, setDays] = useState(7);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const newExpiryDate = new Date(offer.valid_until);
  newExpiryDate.setDate(newExpiryDate.getDate() + days);

  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 90);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (newExpiryDate > maxDate) {
      setError('Cannot extend beyond 90 days from today');
      return;
    }

    setIsSubmitting(true);
    try {
      await onExtend(days);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to extend expiry');
    } finally {
      setIsSubmitting(false);
    }
  };

  const presetOptions = [7, 14, 30, 60, 90];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Extend Offer Expiry</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Offer Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">{offer.title}</h4>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>Current expiry: {new Date(offer.valid_until).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Preset Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Extend by:
            </label>
            <div className="grid grid-cols-5 gap-2">
              {presetOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setDays(option)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    days === option
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {option}d
                </button>
              ))}
            </div>
          </div>

          {/* Custom Days Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Or enter custom days:
            </label>
            <input
              type="number"
              min="1"
              max="90"
              value={days}
              onChange={(e) => setDays(Math.max(1, Math.min(90, Number(e.target.value))))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* New Expiry Date */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Calendar className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-900">New expiry date</p>
                <p className="text-sm text-blue-700 mt-1">
                  {newExpiryDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Extending...' : 'Extend Expiry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
