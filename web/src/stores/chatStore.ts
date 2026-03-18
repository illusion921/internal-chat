import { create } from 'zustand';
import type { Conversation, Message } from '../types/index';
import { clearUnread } from '@utils/notification';

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
    set((state) => {
      // 更新会话列表中的最后一条消息
      const updatedConversations = state.conversations.map((c) =>
        c.id === message.conversationId
          ? { ...c, lastMessage: message }
          : c
      );
      
      // 只有消息属于当前会话时才添加到消息列表
      const isCurrentConversation = state.currentConversation?.id === message.conversationId;
      
      return {
        messages: isCurrentConversation ? [...state.messages, message] : state.messages,
        conversations: updatedConversations,
      };
    }),

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
    set((state) => {
      // 清除标签页未读提示
      clearUnread();
      
      return {
        conversations: state.conversations.map((c) =>
          c.id === conversationId ? { ...c, unreadCount: 0 } : c
        ),
      };
    }),

  reset: () =>
    set({
      conversations: [],
      currentConversation: null,
      messages: [],
      hasMore: true,
      loading: false,
    }),
}));