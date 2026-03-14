import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@stores/authStore';
import { useChatStore } from '@stores/chatStore';
import type { Message } from '../types/index';
import { incrementUnread, sendBrowserNotification, requestNotificationPermission } from '@utils/notification';

let socket: Socket | null = null;

export function connectSocket() {
  const { accessToken, logout } = useAuthStore.getState();
  const { addMessage, updateUnreadCount } = useChatStore.getState();

  if (!accessToken) {
    console.error('No access token, cannot connect socket');
    return;
  }

  // 如果已经连接，不再重复连接
  if (socket?.connected) {
    console.log('Socket already connected');
    return;
  }
  
  // 如果有旧的连接，先断开
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  // 请求浏览器通知权限
  requestNotificationPermission();

  // Web 端使用当前页面的 origin
  const wsUrl = window.location.origin;
  
  socket = io(wsUrl, {
    auth: { token: accessToken },
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
    if (error.message.includes('Authentication')) {
      logout();
    }
  });

  // 会话被踢出
  socket.on('session:kicked', (data: { reason: string }) => {
    console.log('Session kicked:', data.reason);
    // 清除登录状态
    logout();
    // 刷新页面跳转到登录页
    window.location.reload();
  });

  // 接收新消息
  socket.on('message:new', (message: Message) => {
    console.log('New message:', message);
    addMessage(message);
    
    // 更新未读数
    const currentConversation = useChatStore.getState().currentConversation;
    if (currentConversation?.id !== message.conversationId) {
      const currentCount = useChatStore.getState().conversations.find(
        (c) => c.id === message.conversationId
      )?.unreadCount || 0;
      updateUnreadCount(message.conversationId, currentCount + 1);
      
      // 更新标签页未读提示
      incrementUnread(1);
      
      // 发送浏览器通知（当页面不可见时）
      if (document.visibilityState === 'hidden') {
        const senderName = message.sender?.nickname || '用户';
        let content = '发来一条消息';
        if (message.msgType === 'text') {
          content = message.content || content;
        } else if (message.msgType === 'image') {
          content = '[图片]';
        } else if (message.msgType === 'file') {
          content = '[文件]';
        }
        sendBrowserNotification(senderName, content);
      }
    }
  });

  // 接收离线消息
  socket.on('message:offline', (message: Message) => {
    console.log('Offline message:', message);
    addMessage(message);
  });

  // 消息发送成功
  socket.on('message:sent', (data: { tempId: string; messageId: string; createdAt: string }) => {
    console.log('Message sent:', data);
    // 更新本地消息状态
    const { messages, setMessages } = useChatStore.getState();
    const updatedMessages = messages.map((m) =>
      (m as any).tempId === data.tempId
        ? { ...m, id: data.messageId, createdAt: data.createdAt }
        : m
    );
    setMessages(updatedMessages);
  });

  // 消息发送失败
  socket.on('message:error', (data: { tempId: string; error: string }) => {
    console.error('Message error:', data);
    // 移除乐观更新的消息
    const { messages, setMessages } = useChatStore.getState();
    const filteredMessages = messages.filter((m) => (m as any).tempId !== data.tempId);
    setMessages(filteredMessages);
    // 显示错误提示
    import('antd').then(({ message }) => {
      message.error(data.error);
    });
  });

  // 对方正在输入
  socket.on('typing:start', (data: { conversationId: string; userId: string }) => {
    console.log('User typing:', data);
    // 可以在 UI 中显示 "对方正在输入..."
  });

  socket.on('typing:stop', (data: { conversationId: string; userId: string }) => {
    console.log('User stopped typing:', data);
  });

  // 消息已读
  socket.on('message:read', (data: { conversationId: string; userId: string; lastMessageId: string }) => {
    console.log('Message read:', data);
  });

  // 错误
  socket.on('error', (error: { message: string }) => {
    console.error('Socket error:', error);
  });
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function sendMessage(data: {
  conversationId: string;
  conversationType: 'private' | 'group';
  msgType: 'text' | 'image' | 'file';
  content?: string;
  fileId?: string;
  tempId?: string;
  mentionIds?: string[];
}) {
  if (!socket?.connected) {
    console.error('Socket not connected');
    return false;
  }

  socket.emit('message:send', {
    ...data,
    tempId: data.tempId || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  });

  return true;
}

// 监听消息撤回事件
export function onMessageRecall(callback: (data: { messageId: string; conversationId: string; recalledAt: string }) => void) {
  if (!socket) {
    console.error('Socket not initialized');
    return null;
  }

  socket.on('message:recall', callback);
  
  return () => {
    socket?.off('message:recall', callback);
  };
}

export function sendTypingStart(conversationId: string, conversationType: 'private' | 'group') {
  if (socket?.connected) {
    socket.emit('typing:start', { conversationId, conversationType });
  }
}

export function sendTypingStop(conversationId: string, conversationType: 'private' | 'group') {
  if (socket?.connected) {
    socket.emit('typing:stop', { conversationId, conversationType });
  }
}

export function markAsRead(conversationId: string, lastMessageId: string) {
  if (socket?.connected) {
    socket.emit('message:read', { conversationId, lastMessageId });
  }
}

export function joinGroupRoom(groupId: string) {
  if (socket?.connected) {
    socket.emit('group:join', groupId);
  }
}

export function leaveGroupRoom(groupId: string) {
  if (socket?.connected) {
    socket.emit('group:leave', groupId);
  }
}

export { socket };