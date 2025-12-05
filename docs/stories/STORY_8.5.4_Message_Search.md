# 🔍 STORY 8.5.4: Message Search

**Parent Epic:** [EPIC 8.5 - Advanced Messaging Features](../epics/EPIC_8.5_Advanced_Features.md)  
**Story Owner:** Frontend Engineering  
**Estimated Effort:** 2 days  
**Priority:** P1 - High  
**Status:** 📋 Ready for Implementation  
**Dependencies:** Epic 8.1 (Database), Epic 8.2 (Core Messaging)

---

## 🎯 **Story Goal**

Implement **powerful message search** capabilities on web browsers, iOS, and Android:

- Full-text search within conversations
- Global search across all conversations
- Search result highlighting
- Jump to message in context
- Mobile: Native search bar with keyboard integration
- Performance: < 200ms search latency

---

## 📱 **Platform Support**

| Platform    | UI                  | Keyboard                            |
| ----------- | ------------------- | ----------------------------------- |
| **Web**     | Floating search bar | Cmd/Ctrl+F shortcut                 |
| **iOS**     | Native UISearchBar  | iOS keyboard with search button     |
| **Android** | Material SearchView | Android keyboard with search action |

---

## 📖 **User Stories**

### As a user, I want to:

1. Find old messages by keyword
2. Search within a specific conversation
3. Search across all my conversations
4. See matching text highlighted
5. Jump directly to the found message
6. Use keyboard shortcuts for quick search

### Acceptance Criteria:

- ✅ Full-text search using Postgres to_tsvector
- ✅ Search within single conversation
- ✅ Global search across all user's conversations
- ✅ Result highlighting with `<mark>` tags
- ✅ Search latency < 200ms
- ✅ Results show conversation context
- ✅ Deleted messages excluded from search
- ✅ Keyboard shortcut (Cmd/Ctrl+F) on web
- ✅ Native search integration on mobile\r\n\r\n---\r\n\r\n## 🔒 **Confirmed Design Decisions**\r\n\r\n| Decision | Choice | Industry Reference |\r\n|----------|--------|--------------------|\r\n| Search scope | Text + media captions + file names | Telegram, Slack |\r\n| Fuzzy search | Stemming now, pg_trgm fuzzy in v2 | Slack |\r\n| Search context | 50 words around match with ts_headline | Google search |\r\n| Performance target | < 200ms latency | - |\r\n| Scope | 1:1 conversations only | - |

---

## 🧩 **Implementation Tasks**

### **Phase 1: Database Full-Text Search Index** (0.25 days)

#### Task 1.1: Create GIN Index for Full-Text Search

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_add_message_search_index.sql

-- Create GIN index for full-text search on message content
CREATE INDEX IF NOT EXISTS idx_messages_content_fts
ON messages
USING GIN (to_tsvector('english', content));

-- Create partial index excluding deleted messages
CREATE INDEX IF NOT EXISTS idx_messages_content_fts_active
ON messages
USING GIN (to_tsvector('english', content))
WHERE is_deleted = false;

-- Add function for search highlighting
CREATE OR REPLACE FUNCTION search_messages(
  p_query TEXT,
  p_conversation_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_limit INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  highlighted_content TEXT,
  conversation_id UUID,
  sender_id UUID,
  created_at TIMESTAMPTZ,
  rank FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.content,
    ts_headline('english', m.content, plainto_tsquery('english', p_query),
      'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=20'
    ) as highlighted_content,
    m.conversation_id,
    m.sender_id,
    m.created_at,
    ts_rank(to_tsvector('english', m.content), plainto_tsquery('english', p_query)) as rank
  FROM messages m
  WHERE
    m.is_deleted = false
    AND to_tsvector('english', m.content) @@ plainto_tsquery('english', p_query)
    AND (p_conversation_id IS NULL OR m.conversation_id = p_conversation_id)
    AND (p_user_id IS NULL OR m.conversation_id IN (
      SELECT cp.conversation_id
      FROM conversation_participants cp
      WHERE cp.user_id = p_user_id
    ))
  ORDER BY rank DESC, m.created_at DESC
  LIMIT p_limit;
END;
$$;
```

**🛢 MCP Integration:**

```bash
# Apply migration
warp mcp run supabase "apply_migration add_message_search_index 'CREATE INDEX IF NOT EXISTS idx_messages_content_fts ON messages USING GIN (to_tsvector(''english'', content));'"

# Test search performance
warp mcp run supabase "execute_sql EXPLAIN ANALYZE SELECT * FROM messages WHERE to_tsvector('english', content) @@ plainto_tsquery('english', 'pizza') AND is_deleted = false LIMIT 50;"
```

---

### **Phase 2: Search Service** (0.5 days)

#### Task 2.1: Create MessageSearchService

```typescript
// src/services/messageSearchService.ts
import { supabase } from "../lib/supabase";

export interface SearchResult {
  id: string;
  content: string;
  highlightedContent: string;
  conversationId: string;
  conversationName?: string;
  senderId: string;
  senderName?: string;
  senderAvatar?: string;
  createdAt: string;
  rank: number;
}

export interface SearchOptions {
  conversationId?: string;
  limit?: number;
}

class MessageSearchService {
  /**
   * Search messages within a specific conversation
   */
  async searchInConversation(
    conversationId: string,
    query: string,
    limit: number = 50
  ): Promise<SearchResult[]> {
    if (!query.trim()) return [];

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Use RPC function for optimized search
    const { data, error } = await supabase.rpc("search_messages", {
      p_query: query,
      p_conversation_id: conversationId,
      p_user_id: user.id,
      p_limit: limit,
    });

    if (error) throw error;

    // Fetch sender details
    return this.enrichResults(data || []);
  }

  /**
   * Global search across all user's conversations
   */
  async searchAllConversations(
    query: string,
    limit: number = 100
  ): Promise<SearchResult[]> {
    if (!query.trim()) return [];

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase.rpc("search_messages", {
      p_query: query,
      p_conversation_id: null, // No filter = all conversations
      p_user_id: user.id,
      p_limit: limit,
    });

    if (error) throw error;
    return this.enrichResults(data || []);
  }

  /**
   * Quick client-side search (for real-time filtering)
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
   * Highlight search query in content
   */
  highlightQuery(content: string, query: string): string {
    if (!query.trim()) return content;

    const regex = new RegExp(`(${this.escapeRegex(query)})`, "gi");
    return content.replace(regex, "<mark>$1</mark>");
  }

  /**
   * Enrich results with sender and conversation details
   */
  private async enrichResults(results: any[]): Promise<SearchResult[]> {
    if (results.length === 0) return [];

    // Get unique sender IDs
    const senderIds = [...new Set(results.map((r) => r.sender_id))];
    const convIds = [...new Set(results.map((r) => r.conversation_id))];

    // Fetch senders
    const { data: senders } = await supabase
      .from("users")
      .select("id, username, avatar_url")
      .in("id", senderIds);

    // Fetch conversations
    const { data: conversations } = await supabase
      .from("conversations")
      .select("id, name")
      .in("id", convIds);

    const senderMap = new Map(senders?.map((s) => [s.id, s]) || []);
    const convMap = new Map(conversations?.map((c) => [c.id, c]) || []);

    return results.map((r) => {
      const sender = senderMap.get(r.sender_id);
      const conv = convMap.get(r.conversation_id);

      return {
        id: r.id,
        content: r.content,
        highlightedContent: r.highlighted_content,
        conversationId: r.conversation_id,
        conversationName: conv?.name,
        senderId: r.sender_id,
        senderName: sender?.username,
        senderAvatar: sender?.avatar_url,
        createdAt: r.created_at,
        rank: r.rank,
      };
    });
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}

export const messageSearchService = new MessageSearchService();
```

---

### **Phase 3: Search UI Components** (0.75 days)

#### Task 3.1: Create SearchBar Component

```typescript
// src/components/messaging/SearchBar.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';

interface Props {
  onSearch: (query: string) => void;
  onClose: () => void;
  isLoading?: boolean;
  placeholder?: string;
}

export function SearchBar({
  onSearch,
  onClose,
  isLoading = false,
  placeholder = 'Search messages...'
}: Props) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    onSearch(debouncedQuery);
  }, [debouncedQuery, onSearch]);

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="flex items-center gap-2 p-3 bg-white border-b shadow-sm">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 animate-spin" />
        )}
        {query && !isLoading && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>
      <button
        onClick={onClose}
        className="px-3 py-2 text-gray-500 hover:text-gray-700"
      >
        Cancel
      </button>
    </div>
  );
}
```

#### Task 3.2: Create SearchResults Component

```typescript
// src/components/messaging/SearchResults.tsx
import React from 'react';
import { MessageSquare, ArrowRight } from 'lucide-react';
import type { SearchResult } from '../../services/messageSearchService';

interface Props {
  results: SearchResult[];
  onResultClick: (result: SearchResult) => void;
  showConversationName?: boolean;
}

export function SearchResults({
  results,
  onResultClick,
  showConversationName = false
}: Props) {
  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <MessageSquare className="w-12 h-12 mb-3 opacity-50" />
        <p>No messages found</p>
        <p className="text-sm">Try different keywords</p>
      </div>
    );
  }

  const formatTime = (isoDate: string) => {
    const date = new Date(isoDate);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
      {results.map((result) => (
        <button
          key={result.id}
          onClick={() => onResultClick(result)}
          className="w-full p-4 hover:bg-gray-50 text-left flex items-start gap-3"
        >
          {/* Avatar */}
          <img
            src={result.senderAvatar || '/default-avatar.png'}
            alt={result.senderName}
            className="w-10 h-10 rounded-full"
          />

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-gray-900 truncate">
                {result.senderName}
              </span>
              <span className="text-xs text-gray-400">
                {formatTime(result.createdAt)}
              </span>
            </div>

            {/* Highlighted content */}
            <p
              className="text-sm text-gray-600 line-clamp-2"
              dangerouslySetInnerHTML={{ __html: result.highlightedContent }}
            />

            {/* Conversation name for global search */}
            {showConversationName && result.conversationName && (
              <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                <MessageSquare className="w-3 h-3" />
                <span>{result.conversationName}</span>
              </div>
            )}
          </div>

          {/* Arrow */}
          <ArrowRight className="w-4 h-4 text-gray-300 mt-3" />
        </button>
      ))}
    </div>
  );
}
```

---

### **Phase 4: Search Hook** (0.25 days)

#### Task 4.1: Create useMessageSearch Hook

```typescript
// src/hooks/useMessageSearch.ts
import { useState, useCallback } from "react";
import {
  messageSearchService,
  SearchResult,
} from "../services/messageSearchService";

export function useMessageSearch(conversationId?: string) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const search = useCallback(
    async (searchQuery: string) => {
      setQuery(searchQuery);

      if (!searchQuery.trim()) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      setError(null);

      try {
        const searchResults = conversationId
          ? await messageSearchService.searchInConversation(
              conversationId,
              searchQuery
            )
          : await messageSearchService.searchAllConversations(searchQuery);

        setResults(searchResults);
      } catch (err) {
        setError("Search failed. Please try again.");
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [conversationId]
  );

  const clearSearch = useCallback(() => {
    setQuery("");
    setResults([]);
    setError(null);
  }, []);

  return {
    query,
    results,
    isSearching,
    error,
    search,
    clearSearch,
  };
}
```

---

### **Phase 5: Integration with ChatScreen** (0.25 days)

#### Task 5.1: Add Search to ChatScreen Header

```typescript
// src/components/messaging/ChatScreen.tsx (additions)
import { SearchBar } from './SearchBar';
import { SearchResults } from './SearchResults';
import { useMessageSearch } from '../../hooks/useMessageSearch';
import { Search } from 'lucide-react';

// Inside ChatScreen component
const [showSearch, setShowSearch] = useState(false);
const { results, isSearching, search, clearSearch } = useMessageSearch(conversationId);
const messageListRef = useRef<HTMLDivElement>(null);

// Keyboard shortcut
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
      e.preventDefault();
      setShowSearch(true);
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);

// Scroll to message
const scrollToMessage = (messageId: string) => {
  const element = document.getElementById(`message-${messageId}`);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    element.classList.add('highlight-flash');
    setTimeout(() => element.classList.remove('highlight-flash'), 2000);
  }
  setShowSearch(false);
  clearSearch();
};

// Render
return (
  <div className="flex flex-col h-full">
    {/* Header with search button */}
    <header className="flex items-center p-4 border-b">
      <h2>{conversationName}</h2>
      <button
        onClick={() => setShowSearch(true)}
        className="ml-auto p-2 hover:bg-gray-100 rounded-full"
        title="Search (Ctrl+F)"
      >
        <Search className="w-5 h-5" />
      </button>
    </header>

    {/* Search UI */}
    {showSearch && (
      <div className="border-b">
        <SearchBar
          onSearch={search}
          onClose={() => {
            setShowSearch(false);
            clearSearch();
          }}
          isLoading={isSearching}
        />
        {results.length > 0 && (
          <SearchResults
            results={results}
            onResultClick={(result) => scrollToMessage(result.id)}
          />
        )}
      </div>
    )}

    {/* Messages */}
    <div ref={messageListRef} className="flex-1 overflow-y-auto">
      {/* ... message list ... */}
    </div>
  </div>
);
```

#### Task 5.2: Add Highlight Flash CSS

```css
/* src/index.css (additions) */
@keyframes highlight-flash {
  0% {
    background-color: rgba(59, 130, 246, 0.3);
  }
  100% {
    background-color: transparent;
  }
}

.highlight-flash {
  animation: highlight-flash 2s ease-out;
}

mark {
  background-color: #fef08a;
  padding: 0 2px;
  border-radius: 2px;
}
```

---

## 🧪 **Testing Plan**

### **MCP Integration Tests**

```bash
# Test search index performance
warp mcp run supabase "execute_sql EXPLAIN ANALYZE SELECT * FROM search_messages('coffee', NULL, 'USER_ID', 50);"

# Verify deleted messages excluded
warp mcp run supabase "execute_sql SELECT COUNT(*) FROM search_messages('test', NULL, 'USER_ID', 100) WHERE id IN (SELECT id FROM messages WHERE is_deleted = true);"

# Test browser search UI
warp mcp run puppeteer "e2e test: open chat, press Ctrl+F, type search query, verify results appear, click result, verify scroll to message"
```

### **Performance Tests**

```bash
# Profile search performance
warp mcp run chrome-devtools "open Network tab, perform search, verify response time < 200ms"
```

---

## 📊 **Performance Metrics**

| Metric            | Target  | Implementation            |
| ----------------- | ------- | ------------------------- |
| Search latency    | < 200ms | GIN index + RPC function  |
| Results rendering | < 16ms  | Virtual list (if needed)  |
| Debounce delay    | 300ms   | Prevent excessive queries |

---

## ✅ **Definition of Done**

- [ ] GIN index for full-text search created
- [ ] search_messages RPC function implemented
- [ ] MessageSearchService with all methods
- [ ] SearchBar component
- [ ] SearchResults component with highlighting
- [ ] useMessageSearch hook
- [ ] Keyboard shortcut (Ctrl/Cmd+F)
- [ ] Scroll-to-message with highlight
- [ ] Global search across conversations
- [ ] Performance < 200ms verified
- [ ] Tests passing

---

**Next Story:** [STORY_8.5.5_Message_Reactions.md](./STORY_8.5.5_Message_Reactions.md)
