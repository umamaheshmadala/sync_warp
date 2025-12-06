// src/services/messageSearchService.ts
// Message search service for full-text search with highlighting
// Story: 8.5.4 - Message Search

import { supabase } from '../lib/supabase';

/**
 * Search result from the database
 */
export interface SearchResult {
  id: string;
  content: string;
  highlightedContent: string;
  conversationId: string;
  senderId: string;
  senderName?: string;
  senderAvatar?: string;
  createdAt: string;
  rank: number;
}

/**
 * Message Search Service
 * 
 * Features:
 * - Full-text search within a conversation
 * - Global search across all conversations
 * - Highlighted search results
 * - Client-side search for real-time filtering
 */
class MessageSearchService {
  /**
   * Search messages within a specific conversation
   * 
   * @param conversationId - Conversation UUID
   * @param query - Search query
   * @param limit - Max results (default 50)
   * @returns Array of search results with highlights
   */
  async searchInConversation(
    conversationId: string,
    query: string,
    limit: number = 50
  ): Promise<SearchResult[]> {
    if (!query.trim()) return [];

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    console.log(`🔍 Searching in conversation ${conversationId} for: "${query}"`);

    const { data, error } = await supabase.rpc('search_messages', {
      p_query: query,
      p_conversation_id: conversationId,
      p_user_id: user.id,
      p_limit: limit
    });

    if (error) {
      console.error('❌ Search error:', error);
      throw error;
    }

    console.log(`✅ Found ${data?.length || 0} results`);
    return this.mapResults(data || []);
  }

  /**
   * Search messages across all user's conversations
   * 
   * @param query - Search query
   * @param limit - Max results (default 100)
   * @returns Array of search results with highlights
   */
  async searchAllConversations(
    query: string,
    limit: number = 100
  ): Promise<SearchResult[]> {
    if (!query.trim()) return [];

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    console.log(`🔍 Global search for: "${query}"`);

    const { data, error } = await supabase.rpc('search_messages', {
      p_query: query,
      p_conversation_id: null, // No filter = all conversations
      p_user_id: user.id,
      p_limit: limit
    });

    if (error) {
      console.error('❌ Global search error:', error);
      throw error;
    }

    console.log(`✅ Found ${data?.length || 0} results across conversations`);
    return this.mapResults(data || []);
  }

  /**
   * Client-side search for real-time filtering (no DB call)
   * 
   * @param messages - Array of messages to filter
   * @param query - Search query
   * @returns Filtered messages matching query
   */
  searchLocal(messages: any[], query: string): any[] {
    if (!query.trim()) return messages;

    const lowerQuery = query.toLowerCase();
    return messages.filter(
      (msg) =>
        msg.content?.toLowerCase().includes(lowerQuery) && !msg.is_deleted
    );
  }

  /**
   * Highlight search query in content (client-side)
   * 
   * @param content - Original content
   * @param query - Search query to highlight
   * @returns Content with <mark> tags around matches
   */
  highlightQuery(content: string, query: string): string {
    if (!query.trim() || !content) return content;

    const regex = new RegExp(`(${this.escapeRegex(query)})`, 'gi');
    return content.replace(regex, '<mark>$1</mark>');
  }

  /**
   * Map database results to SearchResult interface
   */
  private mapResults(data: any[]): SearchResult[] {
    return data.map((row) => ({
      id: row.id,
      content: row.content,
      highlightedContent: row.highlighted_content,
      conversationId: row.conversation_id,
      senderId: row.sender_id,
      senderName: row.sender_name,
      senderAvatar: row.sender_avatar,
      createdAt: row.created_at,
      rank: row.rank
    }));
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

// Export singleton instance
export const messageSearchService = new MessageSearchService();
