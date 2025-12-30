import React, { useState, useEffect } from 'react';
import { Save, Loader2, Mail, MapPin, Calendar, RotateCcw, Check, AlertCircle, X } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import CityPicker from '../location/CityPicker';
import toast from 'react-hot-toast';

const AVAILABLE_INTERESTS = [
  'Carpooling', 'Environment', 'Sustainability', 'Technology', 'Travel',
  'Community', 'Networking', 'Cost Saving', 'Music', 'Sports',
  'Photography', 'Food', 'Adventure', 'Reading', 'Fitness',
  'Coffee', 'Home', 'Entertainment', 'Premium', 'Basic'
];

export const ProfileEditForm: React.FC = () => {
  const { profile, updateProfile } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    location: profile?.location || '',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        location: profile.location || '',
      });
      // Initialize interests from profile
      if (profile.interests && Array.isArray(profile.interests)) {
        // Only include interests that are in the available list to avoid count mismatch
        const validInterests = profile.interests.filter(i => AVAILABLE_INTERESTS.includes(i));
        setSelectedInterests(validInterests);
      }
    }
  }, [profile]);

  const validateField = (name: string, value: string): string => {
    switch (name) {
      default:
        return '';
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setSuccess(false);
    setHasUnsavedChanges(true);

    // Real-time validation
    const error = validateField(name, value);
    setValidationErrors(prev => ({
      ...prev,
      [name]: error
    }));
  };

  const handleInterestToggle = (interest: string) => {
    setSelectedInterests(prev => {
      if (prev.includes(interest)) {
        return prev.filter(i => i !== interest);
      }
      return [...prev, interest];
    });
    setHasUnsavedChanges(true);
  };

  const handleReset = () => {
    if (profile) {
      setFormData({
        location: profile.location || '',
      });
      if (profile.interests && Array.isArray(profile.interests)) {
        setSelectedInterests(profile.interests);
      }
      setValidationErrors({});
      setHasUnsavedChanges(false);
      toast.success('Form reset to saved values', { icon: '↩️' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check for validation errors
    const hasErrors = Object.values(validationErrors).some(err => err !== '');
    if (hasErrors) {
      toast.error('Please fix validation errors before saving', { icon: '⚠️' });
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await updateProfile({
        location: formData.location,
        interests: selectedInterests
      });
      setSuccess(true);
      setHasUnsavedChanges(false);
      toast.success('Profile updated successfully!', {
        duration: 3000,
        icon: '✅',
      });
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile';
      setError(errorMessage);
      toast.error(errorMessage, {
        duration: 4000,
        icon: '❌',
      });
    } finally {
      setLoading(false);
    }
  };

  const renderValidationIcon = (fieldName: string) => {
    const error = validationErrors[fieldName];
    if (!error && formData[fieldName as keyof typeof formData]) {
      return <Check className="w-5 h-5 text-green-500" />;
    }
    if (error) {
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
    return null;
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Unsaved Changes Warning */}
        {hasUnsavedChanges && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg p-4 flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            <span className="text-sm text-yellow-800 dark:text-yellow-300">
              You have unsaved changes
            </span>
          </div>
        )}






        {/* Interests Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
            Interests
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Select your interests to help us personalize your experience
          </p>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_INTERESTS.map((interest) => {
              const isSelected = selectedInterests.includes(interest);
              return (
                <button
                  key={interest}
                  type="button"
                  onClick={() => handleInterestToggle(interest)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${isSelected
                    ? 'bg-blue-600 text-white shadow-md transform scale-105'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                >
                  {isSelected && <Check className="w-4 h-4 inline mr-1" />}
                  {interest}
                </button>
              );
            })}
          </div>
          {selectedInterests.length > 0 && (
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              Selected: <span className="font-semibold text-blue-600 dark:text-blue-400">
                {selectedInterests.length} interest{selectedInterests.length !== 1 ? 's' : ''}
              </span>
            </p>
          )}
          <div className="mt-8 border-t border-gray-100 dark:border-gray-700 pt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex-1">
                {success && (
                  <div className="flex items-center space-x-2 text-green-600 dark:text-green-400 text-sm">
                    <Check className="w-5 h-5" />
                    <span className="font-medium">Profile updated successfully!</span>
                  </div>
                )}
                {error && (
                  <div className="flex items-center space-x-2 text-red-600 dark:text-red-400 text-sm">
                    <AlertCircle className="w-5 h-5" />
                    <span>{error}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-3">
                {/* Cancel Button - Discards unsaved changes */}
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={loading || !hasUnsavedChanges}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg flex items-center space-x-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  <X className="w-4 h-4" />
                  <span>Cancel</span>
                </button>

                {/* Save Button */}
                <button
                  type="submit"
                  disabled={loading || !hasUnsavedChanges}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center space-x-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md text-sm font-medium"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>




      </form >

      {/* City Picker Modal */}
      < CityPicker
        isOpen={showCityPicker}
        onClose={() => setShowCityPicker(false)}
        onCitySelect={(city) => {
          setFormData(prev => ({ ...prev, location: city.name }));
          setShowCityPicker(false);
        }}
      />
    </>
  );
};
