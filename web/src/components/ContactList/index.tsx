import React, { useState } from 'react';
import { List, Avatar, Badge, Tabs, Button, Modal, Form, Input, Select, message } from 'antd';
import { UserOutlined, TeamOutlined, PlusOutlined, UserAddOutlined, SearchOutlined } from '@ant-design/icons';
import { useAuthStore } from '@stores/authStore';
import { useChatStore } from '@stores/chatStore';
import { useContactStore } from '@stores/index';
import { friendApi, groupApi, userApi } from '@services/api';
import type { Conversation, Friendship, Group, User } from '@types/index';
import './ContactList.css';

interface ContactListProps {
  activeTab: 'chat' | 'contact';
}

const ContactList: React.FC<ContactListProps> = ({ activeTab }) => {
  const { user } = useAuthStore();
  const { conversations, setCurrentConversation, currentConversation } = useChatStore();
  const { friends, groups, friendRequests, setFriends, setFriendRequests, setGroups } = useContactStore();
  
  const [contactTab, setContactTab] = useState<'friends' | 'groups' | 'requests'>('friends');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [addFriendVisible, setAddFriendVisible] = useState(false);
  const [createGroupVisible, setCreateGroupVisible] = useState(false);
  const [createGroupLoading, setCreateGroupLoading] = useState(false);
  const [addGroupForm] = Form.useForm();

  // 搜索用户
  const handleSearch = async (value: string) => {
    if (!value.trim()) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const response: any = await userApi.search(value);
      if (response.code === 0) {
        setSearchResults(response.data.list);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  // 发送好友申请
  const handleAddFriend = async (userId: string) => {
    try {
      const response: any = await friendApi.sendRequest(userId);
      if (response.code === 0) {
        message.success('好友申请已发送');
        setAddFriendVisible(false);
        setSearchResults([]);
      }
    } catch (error: any) {
      message.error(error?.message || '发送失败');
    }
  };

  // 处理好友申请
  const handleFriendRequest = async (id: string, action: 'accept' | 'reject') => {
    try {
      const response: any = await friendApi.handleRequest(id, action);
      if (response.code === 0) {
        message.success(action === 'accept' ? '已添加好友' : '已拒绝');
        setFriendRequests(friendRequests.filter((r) => r.id !== id));
        if (action === 'accept') {
          const friendsRes: any = await friendApi.getList();
          if (friendsRes.code === 0) setFriends(friendsRes.data);
        }
      }
    } catch (error) {
      message.error('操作失败');
    }
  };

  // 创建群组
  const handleCreateGroup = async (values: { name: string; memberIds: string[] }) => {
    if (createGroupLoading) return; // 防止重复提交
    
    setCreateGroupLoading(true);
    try {
      const response: any = await groupApi.create(values.name, values.memberIds);
      if (response.code === 0) {
        message.success('群组创建成功');
        setCreateGroupVisible(false);
        addGroupForm.resetFields();
        const groupsRes: any = await groupApi.getList();
        if (groupsRes.code === 0) setGroups(groupsRes.data);
      }
    } catch (error) {
      message.error('创建失败');
    } finally {
      setCreateGroupLoading(false);
    }
  };

  // 选择会话
  const handleSelectConversation = (conv: Conversation) => {
    setCurrentConversation(conv);
  };

  if (activeTab === 'chat') {
    // 消息列表 - 微信风格
    return (
      <div className="chat-list">
        {conversations.map((conv) => (
          <div
            key={conv.id}
            className={`chat-item ${currentConversation?.id === conv.id ? 'active' : ''}`}
            onClick={() => handleSelectConversation(conv)}
          >
            <div className="chat-item-avatar">
              <Badge count={conv.unreadCount || 0} size="small" offset={[-2, -2]}>
                <Avatar
                  size={42}
                  src={conv.target.avatar}
                  icon={<UserOutlined />}
                  style={{ borderRadius: 4, backgroundColor: '#07c160' }}
                />
              </Badge>
            </div>
            <div className="chat-item-content">
              <div className="chat-item-header">
                <span className="chat-item-name">
                  {conv.remark || conv.target.nickname || conv.target.name}
                </span>
                <span className="chat-item-time">
                  {conv.lastMessage?.createdAt ? formatTime(conv.lastMessage.createdAt) : ''}
                </span>
              </div>
              <div className="chat-item-preview">
                {conv.target.signature || '暂无消息'}
              </div>
            </div>
          </div>
        ))}
        {conversations.length === 0 && (
          <div className="empty-tip">暂无会话</div>
        )}
      </div>
    );
  }

  // 联系人列表
  return (
    <div className="contact-list-wrapper">
      <Tabs
        activeKey={contactTab}
        onChange={(key) => setContactTab(key as any)}
        size="small"
        className="contact-tabs"
        tabBarExtraContent={
          contactTab === 'friends' ? (
            <Button type="text" icon={<UserAddOutlined />} onClick={() => setAddFriendVisible(true)} />
          ) : contactTab === 'groups' ? (
            <Button type="text" icon={<PlusOutlined />} onClick={() => setCreateGroupVisible(true)} />
          ) : null
        }
      >
        <Tabs.TabPane tab={`好友 (${friends.length})`} key="friends">
          <div className="contact-items">
            {friends.map((friend) => (
              <div
                key={friend.id}
                className="contact-item"
                onClick={() => {
                  // 生成正确的私聊会话 ID（两个用户 ID 排序后拼接）
                  const conversationId = `private_${[user?.id, friend.friendId].sort().join('_')}`;
                  handleSelectConversation({
                    id: conversationId,
                    type: 'private',
                    target: {
                      id: friend.friendId,
                      nickname: friend.remark || friend.nickname,
                      avatar: friend.avatar,
                      status: friend.status,
                    },
                  });
                }}
              >
                <div className="contact-item-avatar">
                  <Badge dot={friend.status === 'online'} color="#07c160" offset={[-2, 30]}>
                    <Avatar
                      size={40}
                      src={friend.avatar}
                      icon={<UserOutlined />}
                      style={{ borderRadius: 4 }}
                    />
                  </Badge>
                </div>
                <div className="contact-item-info">
                  <div className="contact-item-name">{friend.remark || friend.nickname}</div>
                  <div className="contact-item-signature">{friend.signature}</div>
                </div>
              </div>
            ))}
          </div>
        </Tabs.TabPane>

        <Tabs.TabPane tab={`群组 (${groups.length})`} key="groups">
          <div className="contact-items">
            {groups.map((group) => (
              <div
                key={group.id}
                className="contact-item"
                onClick={() => {
                  handleSelectConversation({
                    id: `group_${group.id}`,
                    type: 'group',
                    target: { id: group.id, name: group.name, avatar: group.avatar },
                  });
                }}
              >
                <div className="contact-item-avatar">
                  <Avatar
                    size={40}
                    src={group.avatar}
                    icon={<TeamOutlined />}
                    style={{ borderRadius: 4, backgroundColor: '#07c160' }}
                  />
                </div>
                <div className="contact-item-info">
                  <div className="contact-item-name">{group.name}</div>
                  <div className="contact-item-members">{group.memberCount} 人</div>
                </div>
              </div>
            ))}
          </div>
        </Tabs.TabPane>

        <Tabs.TabPane tab={<Badge count={friendRequests.length}>好友申请</Badge>} key="requests">
          <div className="contact-items">
            {friendRequests.map((request) => (
              <div key={request.id} className="contact-item">
                <div className="contact-item-avatar">
                  <Avatar
                    size={40}
                    src={request.from.avatar}
                    icon={<UserOutlined />}
                    style={{ borderRadius: 4 }}
                  />
                </div>
                <div className="contact-item-info">
                  <div className="contact-item-name">{request.from.nickname}</div>
                  <div className="contact-item-msg">{request.message || '请求添加你为好友'}</div>
                </div>
                <div className="contact-item-actions">
                  <Button
                    type="primary"
                    size="small"
                    style={{ background: '#07c160', borderColor: '#07c160' }}
                    onClick={() => handleFriendRequest(request.id, 'accept')}
                  >
                    接受
                  </Button>
                  <Button size="small" onClick={() => handleFriendRequest(request.id, 'reject')}>
                    拒绝
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Tabs.TabPane>
      </Tabs>

      {/* 添加好友弹窗 */}
      <Modal
        title="添加好友"
        open={addFriendVisible}
        onCancel={() => setAddFriendVisible(false)}
        footer={null}
        centered
      >
        <Input.Search
          placeholder="搜索用户"
          onSearch={handleSearch}
          loading={searchLoading}
          enterButton={<SearchOutlined />}
          style={{ marginBottom: 16 }}
        />
        <div className="search-results">
          {searchResults.map((user) => (
            <div key={user.id} className="search-result-item">
              <Avatar src={user.avatar} icon={<UserOutlined />} />
              <div className="search-result-info">
                <div className="name">{user.nickname}</div>
                <div className="username">@{user.username}</div>
              </div>
              <Button type="primary" size="small" onClick={() => handleAddFriend(user.id)}>
                添加
              </Button>
            </div>
          ))}
        </div>
      </Modal>

      {/* 创建群组弹窗 */}
      <Modal
        title="创建群组"
        open={createGroupVisible}
        onCancel={() => setCreateGroupVisible(false)}
        onOk={() => addGroupForm.submit()}
        okText="创建"
        cancelText="取消"
        confirmLoading={createGroupLoading}
        centered
      >
        <Form form={addGroupForm} layout="vertical" onFinish={handleCreateGroup}>
          <Form.Item name="name" label="群名称" rules={[{ required: true, message: '请输入群名称' }]}>
            <Input placeholder="请输入群名称" maxLength={50} />
          </Form.Item>
          <Form.Item name="memberIds" label="选择好友">
            <Select
              mode="multiple"
              placeholder="选择好友加入群组"
              options={friends.map((f) => ({
                label: f.remark || f.nickname,
                value: f.friendId,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

// 格式化时间
function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  } else if (days === 1) {
    return '昨天';
  } else if (days < 7) {
    return ['日', '一', '二', '三', '四', '五', '六'][date.getDay()];
  } else {
    return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
  }
}

export default ContactList;