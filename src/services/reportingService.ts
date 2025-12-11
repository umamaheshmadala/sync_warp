import { supabase } from '../lib/supabase';
import { useMessagingStore } from '../store/messagingStore';

export type ReportReason =
    | 'spam' | 'harassment' | 'hate_speech' | 'self_harm'
    | 'sexual_content' | 'violence' | 'scam'
    | 'impersonation' | 'copyright' | 'other';

export class ReportingService {
    /**
     * Calculate reporter's reputation based on past accuracy.
     * Currently a stub that calculates based on ratio of actioned reports.
     */
    async getReporterReputation(userId: string): Promise<number> {
        const { data } = await supabase
            .from('message_reports')
            .select('status')
            .eq('reporter_id', userId)
            .not('reviewed_at', 'is', null);

        if (!data || data.length < 5) {
            return 1.0; // Neutral limit for new reporters
        }

        const actionedReports = data.filter(r => r.status === 'actioned').length;
        const totalReviewed = data.length;

        // Score: 0.0 (all dismissed) to 1.5 (all actioned)
        return Math.min(1.5, (actionedReports / totalReviewed) * 1.5);
    }

    /**
     * Submit a report for a message.
     * Automatically triggers auto-flag check.
     */
    async reportMessage(
        messageId: string,
        conversationId: string,
        reason: ReportReason,
        description?: string
    ): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Get reporter's current reputation
        const reputation = await this.getReporterReputation(user.id);

        const { error } = await supabase.from('message_reports').insert({
            message_id: messageId,
            reporter_id: user.id,
            reason,
            description,
            reporter_reputation: reputation
        });

        if (error) {
            if (error.code === '23505') { // Unique violation
                throw new Error('You have already reported this message');
            }
            throw error;
        }

        // Optimistic update: Mark message as reported in local store
        useMessagingStore.getState().updateMessage(conversationId, messageId, {
            viewer_has_reported: true
        });

        // Check auto-flag threshold (weighted)
        await this.checkAutoFlag(messageId);
    }

    /**
     * Check if a message should be auto-flagged based on accumulated report weight.
     * Threshold: >= 4.0 weighted score.
     */
    async checkAutoFlag(messageId: string): Promise<void> {
        const { data, error } = await supabase
            .from('message_reports')
            .select('reporter_reputation')
            .eq('message_id', messageId);

        if (error || !data) return;

        // Calculate weighted score (sum of reputations)
        const totalWeight = data.reduce((sum, report) => sum + (report.reporter_reputation || 1.0), 0);

        // Auto-flag if total weight >= 4.0 (mitigates coordinated abuse)
        if (totalWeight >= 4.0) {
            await supabase
                .from('messages')
                .update({
                    is_flagged: true,
                    flag_reason: 'multiple_reports'
                })
                .eq('id', messageId);

            console.log(`🚩 Auto-flagged message ${messageId} (weight: ${totalWeight.toFixed(2)})`);
        }
    }

    /**
     * Get all reports for a specific message (Admin utility).
     */
    async getMessageReports(messageId: string): Promise<any[]> {
        const { data, error } = await supabase
            .from('message_reports')
            .select(`
        *,
        reporter:reporter_id(username, email, avatar_url)
      `)
            .eq('message_id', messageId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    }
}

export const reportingService = new ReportingService();
