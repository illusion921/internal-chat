import api from './api.base';

// Message API
export const messageApi = {
  getConversations: () => api.get('/conversations'),

  getMessages: (conversationId: string, page = 1, pageSize = 50) =>
    api.get(`/conversations/${conversationId}/messages`, {
      params: { page, pageSize },
    }),

  markAsRead: (conversationId: string) =>
    api.post(`/conversations/${conversationId}/read`),

  getUnreadCount: (conversationId: string) =>
    api.get(`/conversations/${conversationId}/unread-count`),

  // 撤回消息
  recallMessage: (messageId: string) =>
    api.post(`/conversations/messages/${messageId}/recall`),

  // 搜索消息
  search: (keyword: string, conversationId?: string, page = 1, pageSize = 20) =>
    api.get('/conversations/search', {
      params: { keyword, conversationId, page, pageSize },
    }),
};
