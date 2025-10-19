// src/components/business/SuspiciousActivityReporter.tsx
// Modal for reporting suspicious follower activity to admins

import React, { useState } from 'react';
import { X, Flag, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

interface SuspiciousActivityReporterProps {
  isOpen: boolean;
  onClose: () => void;
  followerId: string;
  followerUsername: string;
  businessId: string;
}

type ReportType = 
  | 'fake_reviews' 
  | 'spam_bot' 
  | 'harassment' 
  | 'competitor_sabotage' 
  | 'other';

interface ReportOption {
  type: ReportType;
  label: string;
  description: string;
}

const reportOptions: ReportOption[] = [
  {
    type: 'fake_reviews',
    label: 'Fake Reviews',
    description: 'User is posting fake or paid reviews'
  },
  {
    type: 'spam_bot',
    label: 'Spam/Bot Behavior',
    description: 'Automated or spam-like activity'
  },
  {
    type: 'harassment',
    label: 'Harassment',
    description: 'Harassing or abusive behavior'
  },
  {
    type: 'competitor_sabotage',
    label: 'Competitor Sabotage',
    description: 'Attempting to damage business reputation'
  },
  {
    type: 'other',
    label: 'Other',
    description: 'Other suspicious activity'
  }
];

const SuspiciousActivityReporter: React.FC<SuspiciousActivityReporterProps> = ({
  isOpen,
  onClose,
  followerId,
  followerUsername,
  businessId
}) => {
  const [selectedType, setSelectedType] = useState<ReportType | null>(null);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedType) {
      setErrorMessage('Please select a report type');
      return;
    }

    if (!description.trim()) {
      setErrorMessage('Please provide a description');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Insert report into database
      const { error } = await supabase
        .from('follower_reports')
        .insert({
          reporter_id: user.id,
          business_id: businessId,
          reported_user_id: followerId,
          report_type: selectedType,
          description: description.trim(),
          status: 'pending'
        });

      if (error) throw error;

      setSubmitStatus('success');
      
      // Auto-close after 2 seconds
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err: any) {
      console.error('Error submitting report:', err);
      setErrorMessage(err.message || 'Failed to submit report. Please try again.');
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedType(null);
    setDescription('');
    setSubmitStatus('idle');
    setErrorMessage('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <Flag className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      Report Suspicious Activity
                    </h2>
                    <p className="text-sm text-gray-600">
                      Reporting: <span className="font-semibold">{followerUsername}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  disabled={isSubmitting}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content */}
              <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                {submitStatus === 'success' ? (
                  // Success State
                  <div className="text-center py-8">
                    <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Report Submitted</h3>
                    <p className="text-gray-600">
                      Thank you for helping keep SynC safe. Our team will review this report shortly.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Report Type Selection */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        What type of suspicious activity are you reporting? *
                      </label>
                      <div className="space-y-2">
                        {reportOptions.map((option) => (
                          <button
                            key={option.type}
                            type="button"
                            onClick={() => setSelectedType(option.type)}
                            className={cn(
                              "w-full text-left p-4 border-2 rounded-lg transition-all",
                              selectedType === option.type
                                ? "border-red-500 bg-red-50"
                                : "border-gray-200 hover:border-gray-300 bg-white"
                            )}
                          >
                            <div className="flex items-start space-x-3">
                              <div className={cn(
                                "mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center",
                                selectedType === option.type
                                  ? "border-red-500 bg-red-500"
                                  : "border-gray-300"
                              )}>
                                {selectedType === option.type && (
                                  <div className="w-2 h-2 bg-white rounded-full" />
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">{option.label}</div>
                                <div className="text-sm text-gray-600">{option.description}</div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Description */}
                    <div className="mb-6">
                      <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                        Please describe the suspicious activity *
                      </label>
                      <textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={5}
                        placeholder="Provide details about what you observed..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                        disabled={isSubmitting}
                      />
                      <p className="mt-1 text-sm text-gray-500">
                        {description.length}/500 characters
                      </p>
                    </div>

                    {/* Warning Notice */}
                    <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start space-x-3">
                      <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-yellow-800">
                        <p className="font-medium mb-1">Important Notice</p>
                        <p>
                          False reports may result in action against your account. 
                          Please only report genuine concerns about suspicious activity.
                        </p>
                      </div>
                    </div>

                    {/* Error Message */}
                    {errorMessage && (
                      <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-800">{errorMessage}</p>
                      </div>
                    )}
                  </>
                )}
              </form>

              {/* Footer */}
              {submitStatus !== 'success' && (
                <div className="flex items-center justify-end space-x-3 px-6 py-4 bg-gray-50 border-t">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !selectedType || !description.trim()}
                    className={cn(
                      "px-6 py-2 rounded-lg font-medium transition-all flex items-center space-x-2",
                      isSubmitting || !selectedType || !description.trim()
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-red-600 text-white hover:bg-red-700"
                    )}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <Flag className="h-4 w-4" />
                        <span>Submit Report</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SuspiciousActivityReporter;
