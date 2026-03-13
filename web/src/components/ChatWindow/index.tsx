import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Input, Button, Avatar, message, Upload, Empty, Progress, Tag } from 'antd';
import {
  SendOutlined,
  PictureOutlined,
  FileOutlined,
  UserOutlined,
  TeamOutlined,
  MoreOutlined,
  InfoCircleOutlined,
  SearchOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@stores/authStore';
import { useChatStore } from '@stores/chatStore';
import { messageApi, fileApi, groupApi } from '@services/api';
import { sendMessage, markAsRead, joinGroupRoom, leaveGroupRoom, onMessageRecall } from '@services/socket';
import { formatTime } from '@utils/format';
import type { Message } from '../../types';
import GroupInfo from '@components/GroupInfo';
import EmojiPicker from '@components/EmojiPicker';
import MentionSelector from '@components/MentionSelector';
import MessageItem from '@components/MessageItem';
import './ChatWindow.css';

const { TextArea } = Input;

const ChatWindow: React.FC = () => {
  const { user } = useAuthStore();
  const {
    currentConversation,
    messages,
    setMessages,
    addMessage,
    prependMessages,
    hasMore,
    setHasMore,
    loading,
    setLoading,
    clearUnreadCount,
  } = useChatStore();

  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const [groupInfoVisible, setGroupInfoVisible] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: { progress: number; filename: string } }>({});
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [mentionVisible, setMentionVisible] = useState(false);
  const [mentionIds, setMentionIds] = useState<string[]>([]);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<any>(null);

  // 加载消息
  useEffect(() => {
    if (currentConversation) {
      loadMessages(1);
      
      // 加入群组房间
      if (currentConversation.type === 'group') {
        joinGroupRoom(currentConversation.target.id);
      }
    }

    return () => {
      if (currentConversation?.type === 'group') {
        leaveGroupRoom(currentConversation.target.id);
      }
    };
  }, [currentConversation?.id]);

  // 加载群成员
  useEffect(() => {
    if (currentConversation?.type === 'group') {
      loadGroupMembers();
    } else {
      setGroupMembers([]);
    }
    // 切换会话时清空输入框和@列表
    setInputValue('');
    setMentionIds([]);
  }, [currentConversation?.id, currentConversation?.type]);

  // 监听消息撤回事件
  useEffect(() => {
    const unsubscribe = onMessageRecall((data) => {
      // 使用函数式更新，避免依赖 messages
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === data.messageId
            ? { ...msg, recalledAt: data.recalledAt }
            : msg
        )
      );
    });

    return () => {
      unsubscribe?.();
    };
  }, [setMessages]); // 只依赖 setMessages（稳定的）

  const loadGroupMembers = async () => {
    if (!currentConversation || currentConversation.type !== 'group') return;
    try {
      const response: any = await groupApi.getDetail(currentConversation.target.id);
      if (response.code === 0) {
        setGroupMembers(response.data.members || []);
      }
    } catch (error) {
      console.error('Failed to load group members:', error);
    }
  };

  // 表情选择
  const handleEmojiSelect = (emoji: string) => {
    setInputValue((prev) => prev + emoji);
    textAreaRef.current?.focus();
  };

  // @成员选择
  const handleMentionSelect = (member: any) => {
    const name = member.nickname || member.user?.nickname || '未知用户';
    setInputValue((prev) => prev + `@${name} `);
    setMentionIds((prev) => [...prev, member.userId]);
    setMentionVisible(false);
    textAreaRef.current?.focus();
  };

  // 撤回消息
  const handleRecallMessage = useCallback(async (messageId: string) => {
    try {
      const response: any = await messageApi.recallMessage(messageId);
      if (response.code === 0) {
        message.success('消息已撤回');
        // 使用函数式更新，避免依赖 messages
        const now = new Date().toISOString();
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === messageId
              ? { ...msg, recalledAt: now }
              : msg
          )
        );
      } else {
        message.error(response.message || '撤回失败');
      }
    } catch (error) {
      message.error('撤回消息失败');
    }
  }, [setMessages]);

  // 搜索消息
  const handleSearchMessages = async () => {
    if (!searchKeyword.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const response: any = await messageApi.search(
        searchKeyword.trim(),
        currentConversation?.id
      );
      if (response.code === 0) {
        setSearchResults(response.data.list);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  // 跳转到消息
  const handleJumpToMessage = (msg: Message) => {
    // 关闭搜索，滚动到消息
    setSearchVisible(false);
    setSearchKeyword('');
    setSearchResults([]);
    
    // 如果消息在当前列表中，滚动到该消息
    const msgElement = document.getElementById(`msg-${msg.id}`);
    if (msgElement) {
      msgElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      msgElement.classList.add('message-highlight');
      setTimeout(() => {
        msgElement.classList.remove('message-highlight');
      }, 2000);
    } else {
      // 消息不在当前列表，需要加载
      message.info('消息不在当前页面，请向上加载更多');
    }
  };

  const loadMessages = async (page: number) => {
    if (!currentConversation) return;

    setLoading(true);
    try {
      const response: any = await messageApi.getMessages(currentConversation.id, page, 50);
      if (response.code === 0) {
        if (page === 1) {
          setMessages(response.data.list);
          scrollToBottom();
        } else {
          prependMessages(response.data.list);
        }
        setHasMore(response.data.list.length === 50);
        
        // 标记已读
        if (response.data.list.length > 0) {
          const lastMessage = response.data.list[response.data.list.length - 1];
          markAsRead(currentConversation.id, lastMessage.id);
          clearUnreadCount(currentConversation.id);
        }
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  // 加载更多消息
  const handleLoadMore = () => {
    if (hasMore && !loading) {
      loadMessages(Math.ceil(messages.length / 50) + 1);
    }
  };

  // 滚动到底部
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // 发送文本消息
  const handleSendText = async () => {
    if (!inputValue.trim() || !currentConversation || sending) return;

    setSending(true);
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const messageData = {
      conversationId: currentConversation.id,
      conversationType: currentConversation.type,
      msgType: 'text' as const,
      content: inputValue.trim(),
      tempId,
      mentionIds: currentConversation.type === 'group' ? mentionIds : undefined,
    };

    // 先添加到本地
    const optimisticMessage: any = {
      id: tempId,
      ...messageData,
      senderId: user?.id,
      sender: {
        id: user?.id,
        nickname: user?.nickname,
        avatar: user?.avatar,
      },
      createdAt: new Date().toISOString(),
      tempId,
    };
    addMessage(optimisticMessage);
    scrollToBottom();
    setInputValue('');
    setMentionIds([]);

    // 发送到服务器
    sendMessage(messageData);
    setSending(false);
  };

  // 发送图片
  const handleSendImage = async (file: File) => {
    if (!currentConversation) return false;

    try {
      const response: any = await fileApi.upload(file, 'image');
      if (response.code === 0) {
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const messageData = {
          conversationId: currentConversation.id,
          conversationType: currentConversation.type,
          msgType: 'image' as const,
          fileId: response.data.id,
          tempId,
        };
        
        // 先添加到本地（乐观更新）
        const optimisticMessage: any = {
          id: tempId,
          ...messageData,
          senderId: user?.id,
          sender: {
            id: user?.id,
            nickname: user?.nickname,
            avatar: user?.avatar,
          },
          file: {
            id: response.data.id,
            filename: response.data.filename,
            filesize: response.data.filesize,
            mimeType: response.data.mimeType,
          },
          createdAt: new Date().toISOString(),
        };
        addMessage(optimisticMessage);
        scrollToBottom();
        
        // 发送到服务器
        sendMessage(messageData);
      }
    } catch (error) {
      message.error('图片发送失败');
    }
    return false;
  };

  // 发送文件
  const handleSendFile = async (file: File) => {
    if (!currentConversation) return false;

    const uploadId = `upload_${Date.now()}`;
    
    // 先添加进度条到消息列表
    setUploadProgress(prev => ({
      ...prev,
      [uploadId]: { progress: 0, filename: file.name }
    }));

    try {
      const response: any = await fileApi.upload(file, 'file', (progress) => {
        setUploadProgress(prev => ({
          ...prev,
          [uploadId]: { progress, filename: file.name }
        }));
      });
      
      if (response.code === 0) {
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const messageData = {
          conversationId: currentConversation.id,
          conversationType: currentConversation.type,
          msgType: 'file' as const,
          fileId: response.data.id,
          tempId,
        };
        
        // 先添加到本地（乐观更新）
        const optimisticMessage: any = {
          id: tempId,
          ...messageData,
          senderId: user?.id,
          sender: {
            id: user?.id,
            nickname: user?.nickname,
            avatar: user?.avatar,
          },
          file: {
            id: response.data.id,
            filename: response.data.filename,
            filesize: response.data.filesize,
            mimeType: response.data.mimeType,
          },
          createdAt: new Date().toISOString(),
        };
        addMessage(optimisticMessage);
        scrollToBottom();
        
        // 发送到服务器
        sendMessage(messageData);
      }
    } catch (error) {
      message.error('文件发送失败');
    } finally {
      // 移除进度条
      setUploadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[uploadId];
        return newProgress;
      });
    }
    return false;
  };

if (!currentConversation) {
    return (
      <div className="chat-empty">
        <Empty description="选择一个会话开始聊天" />
      </div>
    );
  }

  return (
    <div className="chat-window-wrapper">
      <div className="chat-main">
        {/* 聊天头部 */}
        <div className="chat-header">
          <div className="chat-header-info">
            <Avatar
              src={currentConversation.target.avatar}
              icon={currentConversation.type === 'group' ? <TeamOutlined /> : <UserOutlined />}
            />
            <div className="chat-header-title">
              <div className="name">
                {currentConversation.remark ||
                  currentConversation.target.nickname ||
                  currentConversation.target.name}
              </div>
              {currentConversation.type === 'private' && (
                <div className="status">
                  {currentConversation.target.status === 'online' ? '在线' : '离线'}
                </div>
              )}
            </div>
          </div>
          <Button type="text" icon={<MoreOutlined />} />
          <Button
            type="text"
            icon={<SearchOutlined />}
            onClick={() => setSearchVisible(!searchVisible)}
          />
          {currentConversation.type === 'group' && (
            <Button
              type="text"
              icon={<InfoCircleOutlined />}
              onClick={() => setGroupInfoVisible(true)}
            />
          )}
        </div>

        {/* 搜索栏 */}
        {searchVisible && (
          <div className="search-bar">
            <Input
              placeholder="搜索消息..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onPressEnter={handleSearchMessages}
              prefix={<SearchOutlined />}
              suffix={
                searchKeyword && (
                  <CloseOutlined
                    onClick={() => {
                      setSearchKeyword('');
                      setSearchResults([]);
                    }}
                    style={{ cursor: 'pointer' }}
                  />
                )
              }
              style={{ width: '100%' }}
            />
            <Button type="primary" onClick={handleSearchMessages} loading={searchLoading}>
              搜索
            </Button>
            <Button type="text" onClick={() => {
              setSearchVisible(false);
              setSearchKeyword('');
              setSearchResults([]);
            }}>
              <CloseOutlined />
            </Button>
          </div>
        )}

        {/* 搜索结果 */}
        {searchVisible && searchResults.length > 0 && (
          <div className="search-results-panel">
            <div className="search-results-header">
              搜索结果 ({searchResults.length})
            </div>
            <div className="search-results-list">
              {searchResults.map((msg) => (
                <div
                  key={msg.id}
                  className="search-result-item"
                  onClick={() => handleJumpToMessage(msg)}
                >
                  <div className="search-result-sender">
                    {msg.sender.nickname}
                  </div>
                  <div className="search-result-content">
                    {msg.content?.substring(0, 100)}
                    {msg.content && msg.content.length > 100 && '...'}
                  </div>
                  <div className="search-result-time">
                    {formatTime(msg.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      {/* 消息列表 */}
      <div className="messages-container" ref={messagesContainerRef}>
        {hasMore && (
          <div className="load-more">
            <Button type="link" onClick={handleLoadMore} loading={loading}>
              加载更多
            </Button>
          </div>
        )}
        
        {messages.map((msg) => (
          <MessageItem
            key={msg.id}
            msg={msg}
            isGroup={currentConversation?.type === 'group'}
            onRecall={handleRecallMessage}
          />
        ))}
        
        {/* 文件上传进度条 */}
        {Object.entries(uploadProgress).map(([id, { progress, filename }]) => (
          <div key={id} className="message-item self">
            <div className="message-content">
              <div className="upload-progress-wrapper">
                <div className="upload-progress-file">
                  <FileOutlined style={{ fontSize: 24, marginRight: 8, color: '#07c160' }} />
                  <div className="upload-progress-info">
                    <div className="filename">{filename}</div>
                    <div className="upload-progress-bar">
                      <Progress percent={progress} size="small" strokeColor="#07c160" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <Avatar
              size={36}
              src={user?.avatar}
              icon={<UserOutlined />}
            />
          </div>
        ))}
        
        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div className="input-area">
        <div className="input-toolbar">
          <EmojiPicker onEmojiSelect={handleEmojiSelect} />
          <Upload
            beforeUpload={handleSendImage}
            accept="image/*"
            showUploadList={false}
          >
            <Button type="text" icon={<PictureOutlined />} />
          </Upload>
          <Upload
            beforeUpload={handleSendFile}
            showUploadList={false}
          >
            <Button type="text" icon={<FileOutlined />} />
          </Upload>
          {currentConversation?.type === 'group' && (
            <Button
              type="text"
              icon={<UserOutlined />}
              onClick={() => setMentionVisible(!mentionVisible)}
            />
          )}
        </div>
        <div className="input-main" style={{ position: 'relative' }}>
          <TextArea
            ref={textAreaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={currentConversation?.type === 'group' ? '输入消息，@ 提及成员...' : '输入消息...'}
            style={{ flex: 1, resize: 'none' }}
            onPressEnter={(e) => {
              if (!e.shiftKey) {
                e.preventDefault();
                handleSendText();
              }
            }}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSendText}
            loading={sending}
          >
            发送
          </Button>
          
          {/* @成员选择器 */}
          {currentConversation?.type === 'group' && (
            <MentionSelector
              members={groupMembers}
              visible={mentionVisible}
              position={{ top: -200, left: 0 }}
              onSelect={handleMentionSelect}
              onClose={() => setMentionVisible(false)}
            />
          )}
        </div>
      </div>
      </div>

      {/* 群成员列表 - 右侧边栏 */}
      {currentConversation.type === 'group' && (
        <div className="chat-sidebar">
          <div className="sidebar-header">
            <span>群成员 ({groupMembers.length})</span>
          </div>
          <div className="sidebar-members">
            {groupMembers.map((member) => (
              <div key={member.id} className="member-item">
                <Avatar
                  size={32}
                  src={member.user?.avatar}
                  icon={<UserOutlined />}
                />
                <div className="member-info">
                  <span className="member-name">
                    {member.nickname || member.user?.nickname || '未知用户'}
                  </span>
                  {member.role === 'owner' && <Tag color="gold">群主</Tag>}
                  {member.role === 'admin' && <Tag color="blue">管理员</Tag>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 群组信息弹窗 */}
      <GroupInfo
        visible={groupInfoVisible}
        groupId={currentConversation?.type === 'group' ? currentConversation.target.id : null}
        currentUserId={user?.id || ''}
        onClose={() => setGroupInfoVisible(false)}
      />
    </div>
  );
};

export default ChatWindow;