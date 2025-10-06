import React, { useState, useEffect } from 'react';
import { Save, Loader2, Mail, MapPin, Calendar, Globe, Twitter, Linkedin, Instagram, Facebook, X, RotateCcw, Camera, Check, AlertCircle, Github } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import CityPicker from '../location/CityPicker';
import toast from 'react-hot-toast';

interface SocialLinks {
  twitter?: string;
  linkedin?: string;
  instagram?: string;
  facebook?: string;
  github?: string;
}

const AVAILABLE_INTERESTS = [
  'Carpooling', 'Environment', 'Sustainability', 'Technology', 'Travel',
  'Community', 'Networking', 'Cost Saving', 'Music', 'Sports',
  'Photography', 'Food', 'Adventure', 'Reading', 'Fitness'
];

export const ProfileEditForm: React.FC = () => {
  const { profile, updateProfile, uploadAvatar, uploadingAvatar } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    bio: profile?.bio || '',
    email: profile?.email || '',
    website: profile?.website || '',
    location: profile?.location || '',
    date_of_birth: profile?.date_of_birth || '',
    social_links: (profile?.social_links as SocialLinks) || {
      twitter: '',
      linkedin: '',
      instagram: '',
      facebook: ''
    }
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        bio: profile.bio || '',
        email: profile.email || '',
        website: profile.website || '',
        location: profile.location || '',
        date_of_birth: profile.date_of_birth || '',
        social_links: (profile.social_links as SocialLinks) || {
          twitter: '',
          linkedin: '',
          instagram: '',
          facebook: ''
        }
      });
      // Initialize interests from profile
      if (profile.interests && Array.isArray(profile.interests)) {
        setSelectedInterests(profile.interests);
      }
    }
  }, [profile]);

  const validateField = (name: string, value: string): string => {
    switch (name) {
      case 'full_name':
        if (!value.trim()) return 'Name is required';
        if (value.length < 2) return 'Name must be at least 2 characters';
        return '';
      case 'website':
        if (value && !value.match(/^https?:\/\/.+/)) {
          return 'Website must start with http:// or https://';
        }
        return '';
      case 'bio':
        if (value.length > 500) return 'Bio must be 500 characters or less';
        return '';
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
        full_name: profile.full_name || '',
        bio: profile.bio || '',
        email: profile.email || '',
        website: profile.website || '',
        location: profile.location || '',
        date_of_birth: profile.date_of_birth || '',
        social_links: (profile.social_links as SocialLinks) || {
          twitter: '',
          linkedin: '',
          instagram: '',
          facebook: ''
        }
      });
      if (profile.interests && Array.isArray(profile.interests)) {
        setSelectedInterests(profile.interests);
      }
      setValidationErrors({});
      setHasUnsavedChanges(false);
      toast.success('Form reset to saved values', { icon: '↩️' });
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await uploadAvatar(file);
      toast.success('Profile picture updated!', { icon: '📸' });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload image';
      toast.error(errorMessage, { icon: '❌' });
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleSocialChange = (platform: keyof SocialLinks, value: string) => {
    setFormData(prev => ({
      ...prev,
      social_links: {
        ...prev.social_links,
        [platform]: value
      }
    }));
    setSuccess(false);
    setHasUnsavedChanges(true);
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
        full_name: formData.full_name,
        bio: formData.bio,
        website: formData.website,
        location: formData.location,
        date_of_birth: formData.date_of_birth || null,
        social_links: formData.social_links,
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

        {/* Profile Picture Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Profile Picture
          </h3>
          <div className="flex items-center space-x-6">
            <div className="relative">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
                  {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              )}
              <button
                type="button"
                onClick={handleAvatarClick}
                disabled={uploadingAvatar}
                className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Upload new photo"
              >
                {uploadingAvatar ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </button>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {uploadingAvatar ? 'Uploading...' : 'Upload a new profile picture'}
              </p>
              <button
                type="button"
                onClick={handleAvatarClick}
                disabled={uploadingAvatar}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
              >
                Choose file
              </button>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                JPG, PNG, WebP or GIF (max. 5MB)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
          </div>
        </div>

      {/* Basic Information */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
          Basic Information
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Full Name *
            </label>
            <div className="relative">
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                  validationErrors.full_name
                    ? 'border-red-500 dark:border-red-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="John Doe"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                {renderValidationIcon('full_name')}
              </div>
            </div>
            {validationErrors.full_name && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {validationErrors.full_name}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <Mail className="w-4 h-4 inline mr-1" />
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              disabled
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-900 text-gray-500 dark:text-gray-400 cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
          </div>

          {/* Date of Birth */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <Calendar className="w-4 h-4 inline mr-1" />
              Date of Birth
            </label>
            <input
              type="date"
              name="date_of_birth"
              value={formData.date_of_birth}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <MapPin className="w-4 h-4 inline mr-1" />
              City
            </label>
            <button
              type="button"
              onClick={() => setShowCityPicker(true)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-left hover:border-blue-400 transition-colors"
            >
              {profile?.city || 'Select your city'}
            </button>
          </div>

          {/* Website */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <Globe className="w-4 h-4 inline mr-1" />
              Website
            </label>
            <div className="relative">
              <input
                type="url"
                name="website"
                value={formData.website}
                onChange={handleChange}
                className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                  validationErrors.website
                    ? 'border-red-500 dark:border-red-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="https://example.com"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                {renderValidationIcon('website')}
              </div>
            </div>
            {validationErrors.website && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {validationErrors.website}
              </p>
            )}
          </div>

          {/* Bio - Full Width */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Bio
            </label>
            <div className="relative">
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                rows={4}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none ${
                  validationErrors.bio
                    ? 'border-red-500 dark:border-red-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="Tell us about yourself..."
                maxLength={500}
              />
            </div>
            <div className="flex justify-between mt-1">
              {validationErrors.bio && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  {validationErrors.bio}
                </p>
              )}
              <p className={`text-xs ${
                formData.bio.length > 450
                  ? 'text-orange-600 dark:text-orange-400'
                  : 'text-gray-500'
              } ml-auto`}>
                {formData.bio.length}/500
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Interests Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
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
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  isSelected
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
      </div>

      {/* Social Links */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
          Social Links
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Twitter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <Twitter className="w-4 h-4 inline mr-1 text-blue-400" />
              Twitter
            </label>
            <input
              type="text"
              value={formData.social_links.twitter}
              onChange={(e) => handleSocialChange('twitter', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="@username"
            />
          </div>

          {/* LinkedIn */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <Linkedin className="w-4 h-4 inline mr-1 text-blue-600" />
              LinkedIn
            </label>
            <input
              type="text"
              value={formData.social_links.linkedin}
              onChange={(e) => handleSocialChange('linkedin', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="linkedin.com/in/username"
            />
          </div>

          {/* Instagram */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <Instagram className="w-4 h-4 inline mr-1 text-pink-600" />
              Instagram
            </label>
            <input
              type="text"
              value={formData.social_links.instagram}
              onChange={(e) => handleSocialChange('instagram', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="@username"
            />
          </div>

          {/* Facebook */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <Facebook className="w-4 h-4 inline mr-1 text-blue-700" />
              Facebook
            </label>
            <input
              type="text"
              value={formData.social_links.facebook}
              onChange={(e) => handleSocialChange('facebook', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="facebook.com/username"
            />
          </div>

          {/* GitHub */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <Github className="w-4 h-4 inline mr-1" />
              GitHub
            </label>
            <input
              type="text"
              value={formData.social_links.github || ''}
              onChange={(e) => handleSocialChange('github' as keyof SocialLinks, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="github.com/username"
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 sticky bottom-4">
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
            {/* Reset Button */}
            <button
              type="button"
              onClick={handleReset}
              disabled={loading || !hasUnsavedChanges}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg flex items-center space-x-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset</span>
            </button>

            {/* Cancel Button */}
            <button
              type="button"
              onClick={() => window.history.back()}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg flex items-center space-x-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-4 h-4" />
              <span>Cancel</span>
            </button>

            {/* Save Button */}
            <button
              type="submit"
              disabled={loading || !hasUnsavedChanges}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center space-x-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
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
    </form>

    {/* City Picker Modal */}
    <CityPicker
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
