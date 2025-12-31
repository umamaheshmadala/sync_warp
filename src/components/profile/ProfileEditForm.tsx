import React, { useState, useEffect } from 'react';
import { Save, Loader2, Mail, MapPin, Calendar, RotateCcw, Check, AlertCircle, X } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import CityPicker from '../location/CityPicker';
import toast from 'react-hot-toast';
import { INTEREST_CATEGORIES } from '../../constants/interests';

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
        const validInterests = profile.interests.filter(i => INTEREST_CATEGORIES.some(c => c.id === i));
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
          <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <span className="text-sm text-yellow-800">
              You have unsaved changes
            </span>
          </div>
        )}






        <div className="space-y-4">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 border-b border-gray-200 pb-2">
            Interests
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Select your interests to help us personalize your experience
          </p>
          <div className="flex flex-col gap-2">
            {/* Feedback messages - integrated above */}
            {(success || error) && (
              <div className="flex items-center gap-2 mb-2">
                {success && (
                  <div className="flex items-center space-x-2 text-green-600 text-sm bg-green-50 px-3 py-1 rounded-full">
                    <Check className="w-4 h-4" />
                    <span className="font-medium">Saved!</span>
                  </div>
                )}
                {error && (
                  <div className="flex items-center space-x-2 text-red-600 text-sm bg-red-50 px-3 py-1 rounded-full">
                    <AlertCircle className="w-4 h-4" />
                    <span>{error}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-2 md:gap-3 items-center">
              {INTEREST_CATEGORIES.map((category) => {
                const isSelected = selectedInterests.includes(category.id);
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => handleInterestToggle(category.id)}
                    className={`px-2 py-0.5 text-[10px] md:px-4 md:py-2 md:text-sm rounded-full font-medium transition-all flex items-center gap-1 md:gap-1.5 ${isSelected
                      ? 'bg-blue-600 text-white shadow-md transform scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    {isSelected && <Check className="w-2.5 h-2.5 md:w-4 md:h-4" />}
                    <span>{category.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Action Buttons - Moved to next line */}
            <div className="flex items-center justify-end gap-2 mt-[5px]">
              <button
                type="button"
                onClick={handleReset}
                disabled={loading || !hasUnsavedChanges}
                className="px-3 py-1 text-[10px] md:px-4 md:py-1.5 md:text-sm border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-lg flex items-center space-x-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                <X className="w-3 h-3 md:w-3.5 md:h-3.5" />
                <span>Cancel</span>
              </button>

              <button
                type="submit"
                disabled={loading || !hasUnsavedChanges}
                className="px-4 py-1 text-[10px] md:px-5 md:py-1.5 md:text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center space-x-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm font-medium"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3 h-3 md:w-3.5 md:h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3 h-3 md:w-3.5 md:h-3.5" />
                    <span>Save</span>
                  </>
                )}
              </button>
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
