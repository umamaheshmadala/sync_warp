const fs = require('fs');
const path = require('path');

const storePath = path.join(__dirname, 'src/store/messagingStore.ts');
if (fs.existsSync(storePath)) {
    let content = fs.readFileSync(storePath, 'utf8');

    // Interfaces
    content = content.replace(/messages:\s*Map<string,\s*Message\[\]>;/g, 'messages: Record<string, Message[]>;');
    content = content.replace(/unreadCounts:\s*Map<string,\s*number>;/g, 'unreadCounts: Record<string, number>;');
    content = content.replace(/typingUsers:\s*Map<string,\s*Set<string>>;/g, 'typingUsers: Record<string, string[]>;');

    // Initial State
    content = content.replace(/messages:\s*new Map\(\),/g, 'messages: {},');
    content = content.replace(/unreadCounts:\s*new Map\(\),/g, 'unreadCounts: {},');
    content = content.replace(/typingUsers:\s*new Map\(\),/g, 'typingUsers: {},');

    // setConversations
    content = content.replace(/const unreadCounts = new Map<string, number>\(\);/g, 'const unreadCounts: Record<string, number> = {};');
    content = content.replace(/unreadCounts\.set\(c\.conversation_id, count\);/g, 'unreadCounts[c.conversation_id] = count;');

    // addConversation
    content = content.replace(/const unreadCounts = new Map\(state\.unreadCounts\);\n\s*unreadCounts\.set\(conversation\.conversation_id, conversation\.unread_count\);/g, 'const unreadCounts = { ...state.unreadCounts, [conversation.conversation_id]: conversation.unread_count };');
    content = content.replace(/const oldCount = state\.unreadCounts\.get\(conversation\.conversation_id\) \|\| 0;/g, 'const oldCount = state.unreadCounts[conversation.conversation_id] || 0;');

    // upsertConversation
    content = content.replace(/const unreadCounts = new Map\(state\.unreadCounts\);\n\s*unreadCounts\.set\(conversation\.conversation_id, conversation\.unread_count\);/g, 'const unreadCounts = { ...state.unreadCounts, [conversation.conversation_id]: conversation.unread_count };');

    // removeConversation
    content = content.replace(/const newMessages = new Map\(state\.messages\);\n\s*newMessages\.delete\(conversationId\);\n\n\s*const newUnreadCounts = new Map\(state\.unreadCounts\);\n\s*newUnreadCounts\.delete\(conversationId\);\n\n\s*const newTypingUsers = new Map\(state\.typingUsers\);\n\s*newTypingUsers\.delete\(conversationId\);/g,
        `const { [conversationId]: _m, ...newMessages } = state.messages;
          const { [conversationId]: _u, ...newUnreadCounts } = state.unreadCounts;
          const { [conversationId]: _t, ...newTypingUsers } = state.typingUsers;`);

    // setMessages
    content = content.replace(/const newMessages = new Map\(state\.messages\);\n\s*newMessages\.set\(conversationId, messages\);/g, 'const newMessages = { ...state.messages, [conversationId]: messages };');

    // addMessage
    content = content.replace(/const newMessages = new Map\(state\.messages\);\n\s*const currentMessages = newMessages\.get\(message\.conversation_id\) \|\| \[\];\n\s*newMessages\.set\(message\.conversation_id, \[...currentMessages, message\]\);/g, 'const currentMessages = state.messages[message.conversation_id] || [];\n          const newMessages = { ...state.messages, [message.conversation_id]: [...currentMessages, message] };');

    // upsertMessages
    content = content.replace(/const newMessages = new Map\(state\.messages\);\n\s*const currentMessages = newMessages\.get\(conversationId\) \|\| \[\];/g, 'const currentMessages = state.messages[conversationId] || [];\n          const newMessages = { ...state.messages };');
    content = content.replace(/newMessages\.set\(conversationId, updatedMessages\);/g, 'newMessages[conversationId] = updatedMessages;');

    // updateMessage
    content = content.replace(/const newMessages = new Map\(state\.messages\);\n\s*const currentMessages = newMessages\.get\(conversationId\) \|\| \[\];/g, 'const currentMessages = state.messages[conversationId] || [];\n          const newMessages = { ...state.messages };');

    // removeMessage(s) -- 521 lines
    content = content.replace(/const newMessages = new Map\(state\.messages\);\n\s*const currentMessages = newMessages\.get\(conversationId\) \|\| \[\];/g, 'const currentMessages = state.messages[conversationId] || [];\n          const newMessages = { ...state.messages };');

    // prependMessages
    content = content.replace(/const newMessages = new Map\(state\.messages\);\n\s*const currentMessages = newMessages\.get\(conversationId\) \|\| \[\];/g, 'const currentMessages = state.messages[conversationId] || [];\n          const newMessages = { ...state.messages };');

    // addOptimisticMessage
    content = content.replace(/const newMessages = new Map\(state\.messages\);\n\s*const currentMessages = newMessages\.get\(conversationId\) \|\| \[\];/g, 'const currentMessages = state.messages[conversationId] || [];\n          const newMessages = { ...state.messages };');

    // replaceOptimisticMessage
    content = content.replace(/const newMessages = new Map\(state\.messages\);\n\s*const currentMessages = newMessages\.get\(conversationId\) \|\| \[\];/g, 'const currentMessages = state.messages[conversationId] || [];\n          const newMessages = { ...state.messages };');

    // markMessageFailed
    content = content.replace(/const newMessages = new Map\(state\.messages\);\n\s*const currentMessages = newMessages\.get\(conversationId\) \|\| \[\];/g, 'const currentMessages = state.messages[conversationId] || [];\n          const newMessages = { ...state.messages };');

    // updateMessageProgress
    content = content.replace(/const newMessages = new Map\(state\.messages\);\n\s*const currentMessages = newMessages\.get\(conversationId\) \|\| \[\];/g, 'const currentMessages = state.messages[conversationId] || [];\n          const newMessages = { ...state.messages };');

    // setUnreadCount
    content = content.replace(/const unreadCounts = new Map\(state\.unreadCounts\);\n\s*unreadCounts\.set\(conversationId, count\);/g, 'const unreadCounts = { ...state.unreadCounts, [conversationId]: count };');

    // incrementUnreadCount
    content = content.replace(/const oldCount = state\.unreadCounts\.get\(conversationId\) \|\| 0;/g, 'const oldCount = state.unreadCounts[conversationId] || 0;');
    content = content.replace(/const unreadCounts = new Map\(state\.unreadCounts\);\n\s*unreadCounts\.set\(conversationId, oldCount \+ 1\);/g, 'const unreadCounts = { ...state.unreadCounts, [conversationId]: oldCount + 1 };');

    // clearUnreadCount
    content = content.replace(/const unreadCounts = new Map\(state\.unreadCounts\);\n\s*unreadCounts\.set\(conversationId, 0\);/g, 'const unreadCounts = { ...state.unreadCounts, [conversationId]: 0 };');

    // addTypingUser
    content = content.replace(/const newTypingUsers = new Map\(state\.typingUsers\);\n\s*const users = newTypingUsers\.get\(conversationId\) \|\| new Set\(\);\n\s*const updatedUsers = new Set\(users\);\n\s*updatedUsers\.add\(userId\);\n\s*newTypingUsers\.set\(conversationId, updatedUsers\);/g, 'const users = state.typingUsers[conversationId] || [];\n          const newTypingUsers = { ...state.typingUsers, [conversationId]: [...users.filter(id => id !== userId), userId] };');

    // removeTypingUser
    content = content.replace(/const newTypingUsers = new Map\(state\.typingUsers\);\n\s*const users = newTypingUsers\.get\(conversationId\);\n\s*if \(users\) \{\n\s*const updatedUsers = new Set\(users\);\n\s*updatedUsers\.delete\(userId\);\n\s*if \(updatedUsers\.size === 0\) \{\n\s*newTypingUsers\.delete\(conversationId\);\n\s*\} else \{\n\s*newTypingUsers\.set\(conversationId, updatedUsers\);\n\s*\}\n\s*\}/g, `const users = state.typingUsers[conversationId] || [];
          const updatedUsers = users.filter(id => id !== userId);
          const newTypingUsers = { ...state.typingUsers };
          if (updatedUsers.length === 0) {
            delete newTypingUsers[conversationId];
          } else {
            newTypingUsers[conversationId] = updatedUsers;
          }`);

    // saveUnreadCounts
    content = content.replace(/const counts = Array\.from\(get\(\)\.unreadCounts\.entries\(\)\);/g, 'const counts = get().unreadCounts;');

    // loadUnreadCounts
    content = content.replace(/const map = new Map<string, number>\(data\.counts\);\n\s*set\(\{ unreadCounts: map \}\);/g, 'set({ unreadCounts: data.counts });');

    // calculate totalUnreadCount (in setConversations, setUnreadCount, incrementUnreadCount, clearUnreadCount, upsertConversation, addConversation)
    content = content.replace(/Array\.from\(unreadCounts\.values\(\)\)/g, 'Object.values(unreadCounts)');

    // Selectors in auth callbacks
    content = content.replace(/state\.messages\.get\(conversationId\) \|\| \[\]/g, 'state.messages[conversationId] || []');
    content = content.replace(/state\.unreadCounts\.get\(conversationId\) \|\| 0/g, 'state.unreadCounts[conversationId] || 0');
    content = content.replace(/Array\.from\(state\.typingUsers\.get\(conversationId\) \|\| new Set\(\)\)/g, 'state.typingUsers[conversationId] || []');

    fs.writeFileSync(storePath, content);
    console.log('messagingStore Map->Record converted successfully!');
}
