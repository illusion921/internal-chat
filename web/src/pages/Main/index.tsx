import React, { useEffect, useState } from 'react';
import { Layout, Avatar, Badge, Modal, Input, message, Spin, Popover } from 'antd';
import {
  MessageOutlined,
  TeamOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  DashboardOutlined,
  ReloadOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@stores/authStore';
import { useChatStore } from '@stores/chatStore';
import { useContactStore } from '@stores/index';
import { friendApi, groupApi, messageApi } from '@services/api';
import { disconnectSocket, connectSocket } from '@services/socket';
import { initTitleNotification } from '@utils/notification';
import ContactList from '@components/ContactList';
import ChatWindow from '@components/ChatWindow';
import FriendRequests from '@components/FriendRequests';
import Settings from '@pages/Settings';
import Admin from '@pages/Admin';
import './Main.css';

const { Sider, Content } = Layout;

const Main: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { conversations, setConversations } = useChatStore();
  const { setFriends, setGroups, setFriendRequests, friendRequests } = useContactStore();
  
  const [activeTab, setActiveTab] = useState<'chat' | 'contact' | 'requests' | 'admin'>('chat');
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // 检查是否是管理员
  const isAdmin = user?.username === 'admin';
  
  // 计算总未读消息数
  const totalUnread = conversations.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);

  useEffect(() => {
    // 初始化标题通知
    initTitleNotification();
    connectSocket();
    loadData();
    return () => disconnectSocket();
  }, []);

  const loadData = async () => {
    try {
      const [convsRes, friendsRes, groupsRes, requestsRes]: any[] = await Promise.all([
        messageApi.getConversations(),
        friendApi.getList(),
        groupApi.getList(),
        friendApi.getRequests(),
      ]);
      if (convsRes.code === 0) setConversations(convsRes.data);
      if (friendsRes.code === 0) setFriends(friendsRes.data);
      if (groupsRes.code === 0) setGroups(groupsRes.data);
      if (requestsRes.code === 0) setFriendRequests(requestsRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const handleRefresh = async () => {
    if (refreshing) return;
    
    setRefreshing(true);
    try {
      await loadData();
      message.success('刷新成功');
    } catch (error) {
      message.error('刷新失败');
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = () => {
    Modal.confirm({
      title: '退出登录',
      content: '确定要退出登录吗？',
      okText: '确定',
      cancelText: '取消',
      centered: true,
      onOk: () => {
        disconnectSocket();
        logout();
      },
    });
  };

  // 用户信息卡片内容
  const userInfoCard = (
    <div className="user-info-card">
      <div className="user-info-header">
        <Avatar
          size={64}
          src={user?.avatar}
          icon={<UserOutlined />}
          style={{ backgroundColor: '#07c160' }}
        />
        <div className="user-info-name">{user?.nickname || '用户'}</div>
        <div className="user-info-username">@{user?.username}</div>
        {user?.signature && <div className="user-info-signature">{user.signature}</div>}
      </div>
      <div className="user-info-actions">
        <div 
          className="user-action-item" 
          onClick={() => {
            setSettingsVisible(true);
          }}
        >
          <SettingOutlined /> 设置
        </div>
        <div className="user-action-item logout" onClick={handleLogout}>
          <LogoutOutlined /> 退出登录
        </div>
      </div>
    </div>
  );

  return (
    <Layout className="main-layout">
      {/* 左侧导航栏 */}
      <Sider className="nav-sider">
        <Popover
          content={userInfoCard}
          trigger="hover"
          placement="rightTop"
          overlayClassName="user-info-popover"
          mouseEnterDelay={0.3}
          mouseLeaveDelay={0.1}
        >
          <div className="nav-avatar">
            <Avatar
              size={40}
              src={user?.avatar}
              icon={<UserOutlined />}
              style={{ backgroundColor: '#07c160', cursor: 'pointer' }}
            />
          </div>
        </Popover>

        <div className="nav-menu">
          <div
            className={`nav-item ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
            title="消息"
          >
            <div className="nav-icon-wrapper">
              <MessageOutlined style={{ fontSize: 22 }} />
              {totalUnread > 0 && <span className="nav-badge" />}
            </div>
          </div>
          <div
            className={`nav-item ${activeTab === 'contact' ? 'active' : ''}`}
            onClick={() => setActiveTab('contact')}
            title="联系人"
          >
            <TeamOutlined style={{ fontSize: 22 }} />
          </div>
          <div
            className={`nav-item ${activeTab === 'requests' ? 'active' : ''}`}
            onClick={() => setActiveTab('requests')}
            title="好友申请"
          >
            <div className="nav-icon-wrapper">
              <UserAddOutlined style={{ fontSize: 22 }} />
              {friendRequests.length > 0 && <span className="nav-badge" />}
            </div>
          </div>
          {isAdmin && (
            <div
              className={`nav-item ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin')}
              title="系统管理"
            >
              <DashboardOutlined style={{ fontSize: 22 }} />
            </div>
          )}
        </div>

        <div className="nav-footer">
          <div 
            className={`nav-item ${refreshing ? 'disabled' : ''}`} 
            onClick={handleRefresh}
            title="刷新数据"
          >
            <Spin spinning={refreshing} size="small">
              <ReloadOutlined style={{ fontSize: 20 }} />
            </Spin>
          </div>
          <div className="nav-item" onClick={() => setSettingsVisible(true)}>
            <SettingOutlined style={{ fontSize: 20 }} />
          </div>
        </div>
      </Sider>

      {/* 会话列表 */}
      <Sider className="list-sider" style={{ display: activeTab === 'requests' ? 'none' : undefined }}>
        <div className="list-header">
          <Input placeholder="搜索" className="search-input" />
        </div>
        <div className="list-content">
          <ContactList activeTab={activeTab === 'admin' ? 'chat' : activeTab} />
        </div>
      </Sider>

      {/* 聊天窗口或管理页面或好友申请 */}
      <Content className="chat-content">
        {activeTab === 'admin' ? (
          <Admin />
        ) : activeTab === 'requests' ? (
          <FriendRequests />
        ) : (
          <ChatWindow />
        )}
      </Content>

      <Settings visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
    </Layout>
  );
};

export default Main;