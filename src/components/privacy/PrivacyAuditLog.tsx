import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { Shield, Clock, ArrowRight } from 'lucide-react';

interface AuditLogEntry {
    id: string;
    setting_key: string;
    old_value: string;
    new_value: string;
    changed_at: string;
}

export const PrivacyAuditLog: React.FC = () => {
    const [logs, setLogs] = useState<AuditLogEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAuditLog();
    }, []);

    const fetchAuditLog = async () => {
        try {
            const { data, error } = await supabase
                .from('privacy_audit_log')
                .select('*')
                .order('changed_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            setLogs(data || []);
        } catch (error) {
            console.error('Error fetching audit log:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatSettingName = (key: string) => {
        return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    const formatValue = (value: string) => {
        try {
            // Handle JSON strings if any
            const parsed = JSON.parse(value);
            return typeof parsed === 'object' ? JSON.stringify(parsed) : parsed;
        } catch {
            return value?.replace(/_/g, ' ') || 'None';
        }
    };

    if (loading) {
        return <div className="p-4 text-center text-gray-400">Loading history...</div>;
    }

    if (logs.length === 0) {
        return (
            <div className="text-center p-8 bg-gray-800/50 rounded-lg border border-gray-700">
                <Shield className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No privacy changes recorded yet.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-400" />
                Privacy Change History
            </h3>
            <div className="space-y-2">
                {logs.map((entry) => (
                    <div
                        key={entry.id}
                        className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
                    >
                        <div className="flex justify-between items-start mb-2">
                            <span className="font-medium text-blue-300">
                                {formatSettingName(entry.setting_key)}
                            </span>
                            <span className="text-xs text-gray-500">
                                {format(new Date(entry.changed_at), 'MMM d, yyyy HH:mm')}
                            </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <span className="text-gray-400 bg-gray-900/50 px-2 py-1 rounded">
                                {formatValue(entry.old_value)}
                            </span>
                            <ArrowRight className="w-4 h-4 text-gray-600" />
                            <span className="text-green-400 bg-green-900/20 px-2 py-1 rounded border border-green-900/30">
                                {formatValue(entry.new_value)}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
