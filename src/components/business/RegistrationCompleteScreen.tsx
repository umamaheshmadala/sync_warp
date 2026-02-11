/**
 * Registration Complete Screen
 * Transition component shown after successful business registration
 * Prompts user to complete onboarding or skip to dashboard
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  Target,
  TrendingUp,
  Users,
  Clock,
  ArrowRight,
  Calendar
} from 'lucide-react';

interface RegistrationCompleteScreenProps {
  businessId: string;
  businessName: string;
}

export const RegistrationCompleteScreen: React.FC<RegistrationCompleteScreenProps> = ({
  businessId,
  businessName
}) => {


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl w-full"
      >
        {/* Success Animation */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4"
          >
            <CheckCircle className="w-12 h-12 text-green-600" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-bold text-gray-900 mb-2"
          >
            🎉 Registration Successful!
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-lg text-gray-600"
          >
            <span className="font-semibold text-gray-900">{businessName}</span> has been submitted for review
          </motion.p>
        </div>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden"
        >
          {/* Header Section */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  <Target className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="ml-4">
                <h2 className="text-xl font-bold text-white">
                  Enhance Your Business Profile
                </h2>
                <p className="text-blue-100 text-sm mt-1">
                  Complete your marketing profile to reach more customers
                </p>
              </div>
            </div>
          </div>

          {/* Content Section */}
          <div className="px-8 py-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Why complete your profile now?
              </h3>

              <div className="space-y-3">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Users className="w-4 h-4 text-blue-600" />
                    </div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">Better Customer Targeting</p>
                    <p className="text-sm text-gray-600">Define your ideal customer demographics for more effective campaigns</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    </div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">Smart Marketing Insights</p>
                    <p className="text-sm text-gray-600">Get data-driven recommendations based on your business metrics</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Target className="w-4 h-4 text-purple-600" />
                    </div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">Goal-Oriented Campaigns</p>
                    <p className="text-sm text-gray-600">Set clear marketing objectives and track your progress</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Time Estimate */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <Clock className="w-5 h-5 text-blue-600 mr-2" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900">
                    Takes about 15-20 minutes
                  </p>
                  <p className="text-xs text-blue-700">
                    Steps 3 & 4 are optional - you can skip them if you're in a hurry
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Link
                to={`/business/onboarding?businessId=${businessId}`}
                className="w-full flex items-center justify-center px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <span>Complete Your Profile Now</span>
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>

              <Link
                to="/business/dashboard"
                className="w-full flex items-center justify-center px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors"
              >
                <Calendar className="w-4 h-4 mr-2" />
                <span>I'll Do This Later</span>
              </Link>
            </div>

            {/* Reassurance Text */}
            <p className="text-center text-xs text-gray-500 mt-4">
              Your progress will be saved automatically. You can exit at any time and continue later.
            </p>
          </div>
        </motion.div>

        {/* Bottom Note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-center mt-6"
        >
          <p className="text-sm text-gray-600">
            You can always access profile setup from your business dashboard
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};
