import React, { useState, useEffect } from 'react';
import { Avatar, Badge, Tabs, Button, Modal, Form, Input, Select, message, Dropdown, Collapse } from 'antd';
import { UserOutlined, TeamOutlined, PlusOutlined, UserAddOutlined, SearchOutlined, FolderAddOutlined, EditOutlined, DeleteOutlined, DownOutlined, RightOutlined, SettingOutlined } from '@ant-design/icons';
import { useAuthStore } from '@stores/authStore';
import { useChatStore } from '@stores/chatStore';
import { useContactStore } from '@stores/index';
import { friendApi, groupApi, userApi } from '@services/api';
import type { Conversation, Friendship, Group, User } from '@types/index';
import './ContactList.css';

interface FriendGroup {
  id: string;
  name: string;
  order: number;
  friends: Friendship[];
}

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
  
  // 好友分组状态
  const [friendGroups, setFriendGroups] = useState<FriendGroup[]>([]);
  const [ungroupedFriends, setUngroupedFriends] = useState<Friendship[]>([]);
  const [createGroupModalVisible, setCreateGroupModalVisible] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [createFriendGroupLoading, setCreateFriendGroupLoading] = useState(false);
  const [editGroupId, setEditGroupId] = useState<string | null>(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupLoading, setEditGroupLoading] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // 加载好友分组
  useEffect(() => {
    if (contactTab === 'friends') {
      loadFriendGroups();
    }
  }, [contactTab]);

  const loadFriendGroups = async () => {
    try {
      const response: any = await friendApi.getGroups();
      if (response.code === 0) {
        setFriendGroups(response.data.groups || []);
        setUngroupedFriends(response.data.ungrouped || []);
      }
    } catch (error) {
      console.error('Failed to load friend groups:', error);
    }
  };

  // 创建好友分组
  const handleCreateFriendGroup = async () => {
    if (!newGroupName.trim()) {
      message.warning('请输入分组名称');
      return;
    }
    if (createFriendGroupLoading) return; // 防止重复提交
    
    // 检查是否已存在同名分组
    const exists = friendGroups.some(g => g.name === newGroupName.trim());
    if (exists) {
      message.warning('分组名称已存在');
      return;
    }
    
    setCreateFriendGroupLoading(true);
    try {
      const response: any = await friendApi.createGroup(newGroupName.trim());
      if (response.code === 0) {
        message.success('分组创建成功');
        setCreateGroupModalVisible(false);
        setNewGroupName('');
        loadFriendGroups();
      } else if (response.code === 40001) {
        message.warning(response.message || '分组名称已存在');
      } else {
        message.error(response.message || '创建失败');
      }
    } catch (error) {
      message.error('创建失败');
    } finally {
      setCreateFriendGroupLoading(false);
    }
  };

  // 重命名分组
  const handleRenameGroup = async (groupId: string) => {
    if (!editGroupName.trim()) {
      message.warning('请输入分组名称');
      return;
    }
    if (editGroupLoading) return; // 防止重复提交
    
    setEditGroupLoading(true);
    try {
      const response: any = await friendApi.updateGroup(groupId, editGroupName.trim());
      if (response.code === 0) {
        message.success('分组重命名成功');
        setEditGroupId(null);
        setEditGroupName('');
        loadFriendGroups();
      }
    } catch (error) {
      message.error('重命名失败');
    } finally {
      setEditGroupLoading(false);
    }
  };

  // 删除分组
  const handleDeleteGroup = async (groupId: string) => {
    Modal.confirm({
      title: '删除分组',
      content: '删除分组后，分组内的好友将移至未分组，确定删除？',
      onOk: async () => {
        try {
          const response: any = await friendApi.deleteGroup(groupId);
          if (response.code === 0) {
            message.success('分组已删除');
            loadFriendGroups();
          }
        } catch (error) {
          message.error('删除失败');
        }
      },
    });
  };

  // 切换分组折叠状态
  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  // 全部展开/折叠
  const toggleAllGroups = () => {
    if (collapsedGroups.size === friendGroups.length) {
      setCollapsedGroups(new Set());
    } else {
      setCollapsedGroups(new Set(friendGroups.map(g => g.id)));
    }
  };

  // 移动好友到分组
  const handleMoveFriend = async (friendshipId: string, groupId: string | null) => {
    try {
      const response: any = await friendApi.moveFriend(friendshipId, groupId);
      if (response.code === 0) {
        message.success('已移动到指定分组');
        loadFriendGroups();
      }
    } catch (error) {
      message.error('移动失败');
    }
  };

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
          loadFriendGroups();
        }
      }
    } catch (error) {
      message.error('操作失败');
    }
  };

  // 创建群组
  const handleCreateGroup = async (values: { name: string; memberIds: string[] }) => {
    if (createGroupLoading) return;
    
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

  // 渲染好友项
  const renderFriendItem = (friend: Friendship) => {
    const allGroups = [
      { id: null, name: '未分组' },
      ...friendGroups.map(g => ({ id: g.id, name: g.name }))
    ];
    
    return (
      <div
        key={friend.id}
        className="contact-item"
        onClick={() => {
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
          <div className="contact-item-signature">{friend.signature || '暂无签名'}</div>
        </div>
        <Dropdown
          menu={{
            items: [
              {
                key: 'move',
                label: '移动到',
                children: allGroups.map(g => ({
                  key: g.id || 'ungrouped',
                  label: g.name,
                  onClick: () => handleMoveFriend(friend.id, g.id),
                })),
              },
              {
                type: 'divider',
              },
              {
                key: 'delete',
                label: '删除好友',
                danger: true,
                onClick: () => {
                  Modal.confirm({
                    title: '删除好友',
                    content: `确定删除好友 ${friend.remark || friend.nickname}？`,
                    onOk: async () => {
                      try {
                        const response: any = await friendApi.delete(friend.id);
                        if (response.code === 0) {
                          message.success('已删除好友');
                          loadFriendGroups();
                        }
                      } catch (error) {
                        message.error('删除失败');
                      }
                    },
                  });
                },
              },
            ],
          }}
          trigger={['contextMenu']}
        >
          <Button type="text" size="small" className="friend-more-btn" onClick={e => e.stopPropagation()}>
            ···
          </Button>
        </Dropdown>
      </div>
    );
  };

  if (activeTab === 'chat') {
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

  return (
    <div className="contact-list-wrapper">
      <Tabs
        activeKey={contactTab}
        onChange={(key) => setContactTab(key as any)}
        size="small"
        className="contact-tabs"
        tabBarExtraContent={
          contactTab === 'friends' ? (
            <div style={{ display: 'flex', gap: 4 }}>
              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'create',
                      label: '新建分组',
                      icon: <FolderAddOutlined />,
                      onClick: () => setCreateGroupModalVisible(true),
                    },
                    {
                      key: 'toggle',
                      label: collapsedGroups.size === friendGroups.length ? '全部展开' : '全部折叠',
                      icon: collapsedGroups.size === friendGroups.length ? <DownOutlined /> : <RightOutlined />,
                      onClick: toggleAllGroups,
                      disabled: friendGroups.length === 0,
                    },
                  ],
                }}
              >
                <Button type="text" size="small" icon={<FolderAddOutlined />} title="分组管理" />
              </Dropdown>
              <Button type="text" size="small" icon={<UserAddOutlined />} onClick={() => setAddFriendVisible(true)} title="添加好友" />
            </div>
          ) : contactTab === 'groups' ? (
            <Button type="text" size="small" icon={<PlusOutlined />} onClick={() => setCreateGroupVisible(true)} title="创建群组" />
          ) : null
        }
      >
        <Tabs.TabPane tab={`好友 (${friends.length})`} key="friends">
          <div className="contact-items with-groups">
            {/* 未分组好友 */}
            {ungroupedFriends.length > 0 && (
              <div className="friend-group-section">
                <div className="friend-group-header ungrouped">
                  <div className="group-header-left">
                    <DownOutlined />
                    <span className="group-name">未分组</span>
                    <span className="group-count">({ungroupedFriends.length})</span>
                  </div>
                </div>
                {ungroupedFriends.map(renderFriendItem)}
              </div>
            )}
            
            {/* 分组好友 */}
            {friendGroups.map((group) => {
              const isCollapsed = collapsedGroups.has(group.id);
              const friends = group.friends || [];
              return (
                <div key={group.id} className="friend-group-section">
                  <div className="friend-group-header">
                    <div className="group-header-left" onClick={() => toggleGroupCollapse(group.id)}>
                      {isCollapsed ? <RightOutlined /> : <DownOutlined />}
                      <span className="group-name">{group.name}</span>
                      <span className="group-count">({friends.length})</span>
                    </div>
                    <div className="group-header-actions">
                      <Dropdown
                        menu={{
                          items: [
                            {
                              key: 'rename',
                              label: '重命名',
                              icon: <EditOutlined />,
                              onClick: () => {
                                setEditGroupId(group.id);
                                setEditGroupName(group.name);
                              },
                            },
                            {
                              key: 'delete',
                              label: '删除分组',
                              icon: <DeleteOutlined />,
                              danger: true,
                              onClick: () => handleDeleteGroup(group.id),
                            },
                          ],
                        }}
                        trigger={['click']}
                      >
                        <Button type="text" size="small" icon={<SettingOutlined />} className="group-setting-btn" />
                      </Dropdown>
                    </div>
                  </div>
                  {!isCollapsed && (
                    friends.length > 0 ? (
                      friends.map(renderFriendItem)
                    ) : (
                      <div className="empty-group-tip">暂无好友，右键好友可移动到此分组</div>
                    )
                  )}
                </div>
              );
            })}
            
            {friendGroups.length === 0 && ungroupedFriends.length === 0 && (
              <div className="empty-tip">暂无好友</div>
            )}
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

      {/* 创建分组弹窗 */}
      <Modal
        title="创建分组"
        open={createGroupModalVisible}
        onCancel={() => {
          if (!createFriendGroupLoading) {
            setCreateGroupModalVisible(false);
            setNewGroupName('');
          }
        }}
        onOk={handleCreateFriendGroup}
        okText="创建"
        cancelText="取消"
        confirmLoading={createFriendGroupLoading}
        centered
      >
        <Input
          placeholder="请输入分组名称"
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          maxLength={20}
          autoFocus
          disabled={createFriendGroupLoading}
        />
      </Modal>

      {/* 重命名分组弹窗 */}
      <Modal
        title="重命名分组"
        open={!!editGroupId}
        onCancel={() => {
          if (!editGroupLoading) {
            setEditGroupId(null);
            setEditGroupName('');
          }
        }}
        onOk={() => editGroupId && handleRenameGroup(editGroupId)}
        okText="确定"
        cancelText="取消"
        confirmLoading={editGroupLoading}
        centered
      >
        <Input
          placeholder="请输入分组名称"
          value={editGroupName}
          onChange={(e) => setEditGroupName(e.target.value)}
          maxLength={20}
          autoFocus
          disabled={editGroupLoading}
        />
      </Modal>

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
          {searchResults.map((searchUser) => (
            <div key={searchUser.id} className="search-result-item">
              <Avatar src={searchUser.avatar} icon={<UserOutlined />} />
              <div className="search-result-info">
                <div className="name">{searchUser.nickname}</div>
                <div className="username">@{searchUser.username}</div>
              </div>
              <Button type="primary" size="small" onClick={() => handleAddFriend(searchUser.id)}>
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