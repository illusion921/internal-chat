// 用户相关类型
export interface User {
  id: string;
  username: string;
  nickname: string;
  avatar?: string;
  signature?: string;
  status: 'online' | 'offline';
  lastSeenAt?: string;
  createdAt?: string;
}

// 好友相关类型
export interface Friendship {
  id: string;
  friendId: string;
  nickname: string;
  avatar?: string;
  signature?: string;
  status: 'online' | 'offline';
  remark?: string;
}

export interface FriendRequest {
  id: string;
  from: User;
  message?: string;
  createdAt: string;
}

// 群组相关类型
export interface Group {
  id: string;
  name: string;
  avatar?: string;
  announcement?: string;
  ownerId: string;
  owner?: User;
  memberCount: number;
  createdAt: string;
}

export interface GroupMember {
  userId: string;
  role: 'owner' | 'admin' | 'member';
  nickname?: string;
  user: User;
  joinedAt: string;
}

// 消息相关类型
export type ConversationType = 'private' | 'group';
export type MsgType = 'text' | 'image' | 'file';

export interface Message {
  id: string;
  conversationId: string;
  conversationType: ConversationType;
  senderId: string;
  sender: {
    id: string;
    nickname: string;
    avatar?: string;
  };
  content?: string;
  msgType: MsgType;
  file?: {
    id: string;
    filename: string;
    filesize: number;
    mimeType?: string;
  };
  mentionIds?: string[];
  recalledAt?: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  target: {
    id: string;
    nickname?: string;
    name?: string;
    avatar?: string;
    status?: 'online' | 'offline';
  };
  remark?: string;
  lastMessage?: Message;
  unreadCount?: number;
}

// 文件相关类型
export interface File {
  id: string;
  filename: string;
  filesize: number;
  mimeType?: string;
  url: string;
  expiresAt: string;
}

// API 响应类型
export interface ApiResponse<T = any> {
  code: number;
  data?: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}