import React, { useEffect, useState } from 'react';
import { Layout, Dropdown, Avatar, Badge, Modal, Input, Menu, message, Spin } from 'antd';
import {
  MessageOutlined,
  TeamOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  DashboardOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@stores/authStore';
import { useChatStore } from '@stores/chatStore';
import { useContactStore } from '@stores/index';
import { friendApi, groupApi, messageApi } from '@services/api';
import { disconnectSocket, connectSocket } from '@services/socket';
import ContactList from '@components/ContactList';
import ChatWindow from '@components/ChatWindow';
import Settings from '@pages/Settings';
import Admin from '@pages/Admin';
import './Main.css';

const { Sider, Content } = Layout;

const Main: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { setConversations } = useChatStore();
  const { setFriends, setGroups, setFriendRequests, friendRequests } = useContactStore();
  
  const [activeTab, setActiveTab] = useState<'chat' | 'contact' | 'admin'>('chat');
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // 检查是否是管理员
  const isAdmin = user?.username === 'admin';

  useEffect(() => {
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

  const userMenu = (
    <Menu className="user-dropdown-menu">
      <Menu.Item key="settings" icon={<SettingOutlined />} onClick={() => setSettingsVisible(true)}>
        设置
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="logout" icon={<LogoutOutlined />} danger onClick={handleLogout}>
        退出登录
      </Menu.Item>
    </Menu>
  );

  return (
    <Layout className="main-layout">
      {/* 左侧导航栏 */}
      <Sider className="nav-sider">
        <Dropdown overlay={userMenu} trigger={['click']} placement="bottomLeft">
          <div className="nav-avatar">
            <Avatar
              size={40}
              src={user?.avatar}
              icon={<UserOutlined />}
              style={{ backgroundColor: '#07c160', cursor: 'pointer' }}
            />
          </div>
        </Dropdown>

        <div className="nav-menu">
          <div
            className={`nav-item ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            <MessageOutlined style={{ fontSize: 22 }} />
          </div>
          <div
            className={`nav-item ${activeTab === 'contact' ? 'active' : ''}`}
            onClick={() => setActiveTab('contact')}
          >
            <Badge count={friendRequests.length} size="small" offset={[-2, -2]}>
              <TeamOutlined style={{ fontSize: 22 }} />
            </Badge>
          </div>
          {isAdmin && (
            <div
              className={`nav-item ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin')}
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
      <Sider className="list-sider">
        <div className="list-header">
          <Input placeholder="搜索" className="search-input" />
        </div>
        <div className="list-content">
          <ContactList activeTab={activeTab} />
        </div>
      </Sider>

      {/* 聊天窗口或管理页面 */}
      <Content className="chat-content">
        {activeTab === 'admin' ? <Admin /> : <ChatWindow />}
      </Content>

      <Settings visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
    </Layout>
  );
};

export default Main;