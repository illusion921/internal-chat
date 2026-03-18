import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@stores/authStore';
import { useChatStore } from '@stores/chatStore';
import { config } from '@src/config';
import type { Message } from '@types/index';
import { incrementUnread, sendBrowserNotification, requestNotificationPermission } from '@utils/notification';

let socket: Socket | null = null;

/**
 * 初始化 Socket 连接
 */
export function connectSocket() {
  const { accessToken, logout } = useAuthStore.getState();

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

  const wsUrl = config.wsUrl;

  socket = io(wsUrl, {
    auth: { token: accessToken },
    transports: ['websocket', 'polling'],
  });

  setupSocketListeners(socket, logout);
}

/**
 * 设置 Socket 事件监听器
 */
function setupSocketListeners(socketInstance: Socket, logout: () => void) {
  socketInstance.on('connect', () => {
    console.log('Socket connected:', socketInstance.id);
  });

  socketInstance.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });

  socketInstance.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
    if (error.message.includes('Authentication')) {
      logout();
    }
  });

  // 会话被踢出
  socketInstance.on('session:kicked', (data: { reason: string }) => {
    console.log('Session kicked:', data.reason);
    logout();
    window.location.reload();
  });

  // 接收新消息
  socketInstance.on('message:new', handleNewMessage);

  // 接收离线消息
  socketInstance.on('message:offline', handleOfflineMessage);

  // 消息发送成功
  socketInstance.on('message:sent', handleMessageSent);

  // 消息发送失败
  socketInstance.on('message:error', handleMessageError);

  // 对方正在输入
  socketInstance.on('typing:start', handleTypingStart);
  socketInstance.on('typing:stop', handleTypingStop);

  // 消息已读
  socketInstance.on('message:read', handleMessageRead);

  // 错误
  socketInstance.on('error', (error: { message: string }) => {
    console.error('Socket error:', error);
  });
}

/**
 * 处理新消息
 */
function handleNewMessage(message: Message) {
  console.log('New message:', message);

  const { addMessage, conversations, currentConversation, updateUnreadCount } = useChatStore.getState();
  addMessage(message);

  // 如果当前不是这个会话，更新未读数
  if (currentConversation?.id !== message.conversationId) {
    const conv = conversations.find((c) => c.id === message.conversationId);
    const currentCount = conv?.unreadCount || 0;
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
}

/**
 * 处理离线消息
 */
function handleOfflineMessage(message: Message) {
  console.log('Offline message:', message);
  useChatStore.getState().addMessage(message);
}

/**
 * 处理消息发送成功
 */
function handleMessageSent(data: { tempId: string; messageId: string; createdAt: string }) {
  console.log('Message sent:', data);

  const { messages, setMessages } = useChatStore.getState();
  const updatedMessages = messages.map((m) =>
    (m as any).tempId === data.tempId
      ? { ...m, id: data.messageId, createdAt: data.createdAt }
      : m
  );
  setMessages(updatedMessages);
}

/**
 * 处理消息发送失败
 */
async function handleMessageError(data: { tempId: string; error: string }) {
  console.error('Message error:', data);

  const { messages, setMessages } = useChatStore.getState();
  const filteredMessages = messages.filter((m) => (m as any).tempId !== data.tempId);
  setMessages(filteredMessages);

  // 显示错误提示
  const { message } = await import('antd');
  message.error(data.error);
}

/**
 * 处理对方正在输入
 */
function handleTypingStart(data: { conversationId: string; userId: string }) {
  console.log('User typing:', data);
  // TODO: 在 UI 中显示 "对方正在输入..."
}

/**
 * 处理对方停止输入
 */
function handleTypingStop(data: { conversationId: string; userId: string }) {
  console.log('User stopped typing:', data);
}

/**
 * 处理消息已读
 */
function handleMessageRead(data: { conversationId: string; userId: string; lastMessageId: string }) {
  console.log('Message read:', data);
  // TODO: 更新消息已读状态
}

/**
 * 断开 Socket 连接
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * 发送消息
 */
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

/**
 * 监听消息撤回事件
 */
export function onMessageRecall(
  callback: (data: { messageId: string; conversationId: string; recalledAt: string }) => void
) {
  if (!socket) {
    console.error('Socket not initialized');
    return null;
  }

  socket.on('message:recall', callback);

  return () => {
    socket?.off('message:recall', callback);
  };
}

/**
 * 发送正在输入事件
 */
export function sendTypingStart(conversationId: string, conversationType: 'private' | 'group') {
  if (socket?.connected) {
    socket.emit('typing:start', { conversationId, conversationType });
  }
}

/**
 * 发送停止输入事件
 */
export function sendTypingStop(conversationId: string, conversationType: 'private' | 'group') {
  if (socket?.connected) {
    socket.emit('typing:stop', { conversationId, conversationType });
  }
}

/**
 * 标记消息已读
 */
export function markAsRead(conversationId: string, lastMessageId: string) {
  if (socket?.connected) {
    socket.emit('message:read', { conversationId, lastMessageId });
  }
}

/**
 * 加入群组房间
 */
export function joinGroupRoom(groupId: string) {
  if (socket?.connected) {
    socket.emit('group:join', groupId);
  }
}

/**
 * 离开群组房间
 */
export function leaveGroupRoom(groupId: string) {
  if (socket?.connected) {
    socket.emit('group:leave', groupId);
  }
}

export { socket };
