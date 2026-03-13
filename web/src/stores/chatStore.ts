import { create } from 'zustand';
import type { Conversation, Message } from '@types/index';

interface ChatState {
  // 状态
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  hasMore: boolean;
  loading: boolean;

  // 方法
  setConversations: (conversations: Conversation[]) => void;
  setCurrentConversation: (conversation: Conversation | null) => void;
  setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void;
  addMessage: (message: Message) => void;
  prependMessages: (messages: Message[]) => void;
  setHasMore: (hasMore: boolean) => void;
  setLoading: (loading: boolean) => void;
  updateUnreadCount: (conversationId: string, count: number) => void;
  clearUnreadCount: (conversationId: string) => void;
  reset: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  currentConversation: null,
  messages: [],
  hasMore: true,
  loading: false,

  setConversations: (conversations) => set({ conversations }),

  setCurrentConversation: (conversation) =>
    set({
      currentConversation: conversation,
      messages: [],
      hasMore: true,
    }),

  setMessages: (messages) =>
    set((state) => ({
      messages: typeof messages === 'function' ? messages(state.messages) : messages,
    })),

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  prependMessages: (messages) =>
    set((state) => ({
      messages: [...messages, ...state.messages],
    })),

  setHasMore: (hasMore) => set({ hasMore }),

  setLoading: (loading) => set({ loading }),

  updateUnreadCount: (conversationId, count) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, unreadCount: count } : c
      ),
    })),

  clearUnreadCount: (conversationId) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, unreadCount: 0 } : c
      ),
    })),

  reset: () =>
    set({
      conversations: [],
      currentConversation: null,
      messages: [],
      hasMore: true,
      loading: false,
    }),
}));