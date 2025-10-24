// src/components/admin/SuspiciousActivityReviewer.tsx
// Admin panel for reviewing reported suspicious follower activity

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Eye, CheckCircle, XCircle, Ban, AlertOctagon, Search, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'react-hot-toast';

interface Report {
  id: string;
  business_id: string;
  reported_user_id: string;
  reporter_id: string;
  report_type: string;
  description: string;
  status: 'pending' | 'reviewed' | 'action_taken' | 'dismissed';
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  action_taken?: string;
  admin_notes?: string;
  business?: {
    business_name: string;
  };
  reported_user?: {
    username: string;
    email: string;
  };
  reporter?: {
    username: string;
  };
}

type FilterStatus = 'all' | 'pending' | 'reviewed' | 'action_taken' | 'dismissed';
type ActionType = 'warn' | 'suspend' | 'ban' | 'dismiss';

export const SuspiciousActivityReviewer: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState<ActionType>('warn');
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  // Load reports
  useEffect(() => {
    loadReports();
  }, [filterStatus]);

  const loadReports = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('follower_reports')
        .select(`
          *,
          businesses (business_name),
          reported_user:profiles!reported_user_id (username, email),
          reporter:profiles!reporter_id (username)
        `)
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;

      setReports(data as Report[] || []);
    } catch (err) {
      console.error('Error loading reports:', err);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  // Handle report action
  const handleTakeAction = async () => {
    if (!selectedReport) return;

    setProcessing(true);
    try {
      let action_taken = '';
      let status: Report['status'] = 'reviewed';

      switch (actionType) {
        case 'warn':
          action_taken = 'User warned';
          status = 'action_taken';
          break;
        case 'suspend':
          action_taken = 'User suspended';
          status = 'action_taken';
          // TODO: Implement actual user suspension in profiles table
          break;
        case 'ban':
          action_taken = 'User banned';
          status = 'action_taken';
          // TODO: Implement actual user ban in profiles table
          break;
        case 'dismiss':
          action_taken = 'Report dismissed';
          status = 'dismissed';
          break;
      }

      const { error } = await supabase
        .from('follower_reports')
        .update({
          status,
          reviewed_at: new Date().toISOString(),
          action_taken,
          admin_notes: adminNotes,
        })
        .eq('id', selectedReport.id);

      if (error) throw error;

      toast.success(`Action taken: ${action_taken}`);
      setActionModalOpen(false);
      setSelectedReport(null);
      setAdminNotes('');
      loadReports();
    } catch (err) {
      console.error('Error taking action:', err);
      toast.error('Failed to process action');
    } finally {
      setProcessing(false);
    }
  };

  // Filter reports by search query
  const filteredReports = reports.filter(report => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      report.business?.business_name?.toLowerCase().includes(query) ||
      report.reported_user?.username?.toLowerCase().includes(query) ||
      report.reported_user?.email?.toLowerCase().includes(query) ||
      report.report_type?.toLowerCase().includes(query)
    );
  });

  // Get status badge color
  const getStatusColor = (status: Report['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'reviewed':
        return 'bg-blue-100 text-blue-800';
      case 'action_taken':
        return 'bg-green-100 text-green-800';
      case 'dismissed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get report type icon
  const getReportTypeIcon = (type: string) => {
    switch (type) {
      case 'fake_reviews':
        return '⭐';
      case 'spam':
        return '📧';
      case 'harassment':
        return '🚨';
      case 'competitor_sabotage':
        return '⚔️';
      default:
        return '⚠️';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <AlertTriangle className="h-8 w-8 text-amber-600 mr-3" />
          Suspicious Activity Reports
        </h1>
        <p className="mt-2 text-gray-600">Review and take action on reported suspicious follower activity</p>
      </div>

      {/* Filters and Search */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        {/* Status Filter */}
        <div className="flex items-center space-x-2 overflow-x-auto">
          <Filter className="h-5 w-5 text-gray-400 flex-shrink-0" />
          {(['all', 'pending', 'reviewed', 'action_taken', 'dismissed'] as FilterStatus[]).map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
                filterStatus === status
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              {status.replace('_', ' ').charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by business, user, or report type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Reports List */}
      <div className="space-y-4">
        {filteredReports.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <AlertOctagon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No reports found</p>
          </div>
        ) : (
          filteredReports.map(report => (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Report Header */}
                  <div className="flex items-center space-x-3 mb-3">
                    <span className="text-2xl">{getReportTypeIcon(report.report_type)}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {report.report_type.replace('_', ' ').toUpperCase()}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <span className={cn('px-3 py-1 rounded-full text-xs font-medium', getStatusColor(report.status))}>
                      {report.status.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Report Details */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-500">Business</p>
                      <p className="text-sm font-medium text-gray-900">{report.business?.business_name || 'Unknown'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Reported User</p>
                      <p className="text-sm font-medium text-gray-900">
                        {report.reported_user?.username || 'Unknown'} ({report.reported_user?.email})
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Reported By</p>
                      <p className="text-sm font-medium text-gray-900">{report.reporter?.username || 'Unknown'}</p>
                    </div>
                    {report.action_taken && (
                      <div>
                        <p className="text-xs text-gray-500">Action Taken</p>
                        <p className="text-sm font-medium text-green-600">{report.action_taken}</p>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div className="bg-gray-50 rounded p-3 mb-4">
                    <p className="text-sm text-gray-700">{report.description}</p>
                  </div>

                  {/* Admin Notes */}
                  {report.admin_notes && (
                    <div className="bg-blue-50 border-l-4 border-blue-400 p-3">
                      <p className="text-xs text-blue-600 font-medium mb-1">Admin Notes:</p>
                      <p className="text-sm text-blue-900">{report.admin_notes}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                {report.status === 'pending' && (
                  <div className="ml-4">
                    <button
                      onClick={() => {
                        setSelectedReport(report);
                        setActionModalOpen(true);
                      }}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
                    >
                      <Eye className="h-4 w-4" />
                      <span>Review</span>
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Action Modal */}
      <AnimatePresence>
        {actionModalOpen && selectedReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white">Take Action on Report</h3>
                <button
                  onClick={() => setActionModalOpen(false)}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6">
                {/* Report Summary */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Report Summary</h4>
                  <p className="text-sm text-gray-700 mb-2">{selectedReport.description}</p>
                  <p className="text-xs text-gray-500">
                    Reported user: {selectedReport.reported_user?.username} ({selectedReport.reported_user?.email})
                  </p>
                </div>

                {/* Action Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Select Action</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setActionType('warn')}
                      className={cn(
                        'p-4 rounded-lg border-2 transition-all',
                        actionType === 'warn'
                          ? 'border-amber-500 bg-amber-50'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <AlertOctagon className="h-6 w-6 text-amber-600 mx-auto mb-2" />
                      <p className="text-sm font-medium">Warn User</p>
                    </button>

                    <button
                      onClick={() => setActionType('suspend')}
                      className={cn(
                        'p-4 rounded-lg border-2 transition-all',
                        actionType === 'suspend'
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <AlertTriangle className="h-6 w-6 text-orange-600 mx-auto mb-2" />
                      <p className="text-sm font-medium">Suspend User</p>
                    </button>

                    <button
                      onClick={() => setActionType('ban')}
                      className={cn(
                        'p-4 rounded-lg border-2 transition-all',
                        actionType === 'ban'
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <Ban className="h-6 w-6 text-red-600 mx-auto mb-2" />
                      <p className="text-sm font-medium">Ban User</p>
                    </button>

                    <button
                      onClick={() => setActionType('dismiss')}
                      className={cn(
                        'p-4 rounded-lg border-2 transition-all',
                        actionType === 'dismiss'
                          ? 'border-gray-500 bg-gray-50'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <XCircle className="h-6 w-6 text-gray-600 mx-auto mb-2" />
                      <p className="text-sm font-medium">Dismiss Report</p>
                    </button>
                  </div>
                </div>

                {/* Admin Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Admin Notes (Optional)</label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={4}
                    placeholder="Add notes about why you took this action..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-gray-50 px-6 py-4 flex items-center justify-end space-x-3">
                <button
                  onClick={() => setActionModalOpen(false)}
                  disabled={processing}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTakeAction}
                  disabled={processing}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                >
                  {processing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      <span>Confirm Action</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SuspiciousActivityReviewer;
