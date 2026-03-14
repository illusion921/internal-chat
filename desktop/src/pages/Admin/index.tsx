import React, { useState, useEffect } from 'react';
import { Tabs, Card, Table, Button, Input, Space, Tag, Modal, message, Popconfirm, Statistic, Row, Col, Avatar, Form } from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  MessageOutlined,
  FileOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import { useAuthStore } from '@stores/authStore';
import './Admin.css';

const { Search } = Input;

interface Stats {
  userCount: number;
  groupCount: number;
  messageCount: number;
  fileCount: number;
  onlineCount: number;
}

interface User {
  id: string;
  username: string;
  nickname: string;
  avatar: string | null;
  status: string;
  createdAt: string;
  lastSeenAt: string | null;
  _count: {
    sentMessages: number;
    groupMemberships: number;
  };
}

interface Group {
  id: string;
  name: string;
  avatar: string | null;
  announcement: string | null;
  createdAt: string;
  owner: {
    id: string;
    nickname: string;
  };
  _count: {
    members: number;
  };
}

const Admin: React.FC = () => {
  const { accessToken } = useAuthStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [userKeyword, setUserKeyword] = useState('');
  const [groupKeyword, setGroupKeyword] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [groupPage, setGroupPage] = useState(1);
  const [userTotal, setUserTotal] = useState(0);
  const [groupTotal, setGroupTotal] = useState(0);
  const [pageSize] = useState(10);
  
  // 添加用户相关状态
  const [addUserModalVisible, setAddUserModalVisible] = useState(false);
  const [addUserLoading, setAddUserLoading] = useState(false);
  const [addUserForm] = Form.useForm();

  useEffect(() => {
    loadStats();
    loadUsers();
    loadGroups();
  }, []);

  const loadStats = async () => {
    try {
      const response = await axios.get('/api/admin/stats', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (response.data.code === 0) {
        setStats(response.data.data);
      }
    } catch (error: any) {
      if (error.response?.status === 403) {
        message.error('需要管理员权限');
      }
    }
  };

  const loadUsers = async (page = 1, keyword = '') => {
    setLoading(true);
    try {
      const response = await axios.get('/api/admin/users', {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { page, pageSize, keyword },
      });
      if (response.data.code === 0) {
        setUsers(response.data.data.list);
        setUserTotal(response.data.data.total);
        setUserPage(page);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGroups = async (page = 1, keyword = '') => {
    setLoading(true);
    try {
      const response = await axios.get('/api/admin/groups', {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { page, pageSize, keyword },
      });
      if (response.data.code === 0) {
        setGroups(response.data.data.list);
        setGroupTotal(response.data.data.total);
        setGroupPage(page);
      }
    } catch (error) {
      console.error('Failed to load groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const response = await axios.delete(`/api/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (response.data.code === 0) {
        message.success('删除成功');
        loadUsers(userPage, userKeyword);
        loadStats();
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '删除失败');
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      const response = await axios.delete(`/api/admin/groups/${groupId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (response.data.code === 0) {
        message.success('删除成功');
        loadGroups(groupPage, groupKeyword);
        loadStats();
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '删除失败');
    }
  };

  // 添加用户
  const handleAddUser = async (values: { username: string; password: string; nickname?: string }) => {
    setAddUserLoading(true);
    try {
      const response = await axios.post('/api/admin/users', values, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (response.data.code === 0) {
        message.success('用户创建成功');
        setAddUserModalVisible(false);
        addUserForm.resetFields();
        loadUsers(1, userKeyword);
        loadStats();
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '创建失败');
    } finally {
      setAddUserLoading(false);
    }
  };

  const userColumns = [
    {
      title: '头像',
      dataIndex: 'avatar',
      key: 'avatar',
      width: 60,
      render: (avatar: string | null) => (
        <Avatar src={avatar} icon={<UserOutlined />} />
      ),
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: '昵称',
      dataIndex: 'nickname',
      key: 'nickname',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'online' ? 'green' : 'default'}>
          {status === 'online' ? '在线' : '离线'}
        </Tag>
      ),
    },
    {
      title: '消息数',
      dataIndex: ['_count', 'sentMessages'],
      key: 'messages',
    },
    {
      title: '群组数',
      dataIndex: ['_count', 'groupMemberships'],
      key: 'groups',
    },
    {
      title: '注册时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: User) => (
        <Popconfirm
          title="确定要删除该用户吗？"
          onConfirm={() => handleDeleteUser(record.id)}
          okText="确定"
          cancelText="取消"
        >
          <Button type="link" danger icon={<DeleteOutlined />}>
            删除
          </Button>
        </Popconfirm>
      ),
    },
  ];

  const groupColumns = [
    {
      title: '头像',
      dataIndex: 'avatar',
      key: 'avatar',
      width: 60,
      render: (avatar: string | null) => (
        <Avatar src={avatar} icon={<TeamOutlined />} style={{ backgroundColor: '#1890ff' }} />
      ),
    },
    {
      title: '群名',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '群主',
      dataIndex: ['owner', 'nickname'],
      key: 'owner',
    },
    {
      title: '成员数',
      dataIndex: ['_count', 'members'],
      key: 'members',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Group) => (
        <Popconfirm
          title="确定要删除该群组吗？"
          onConfirm={() => handleDeleteGroup(record.id)}
          okText="确定"
          cancelText="取消"
        >
          <Button type="link" danger icon={<DeleteOutlined />}>
            解散
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div className="admin-container">
      <h2>系统管理</h2>
      
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={4}>
          <Card>
            <Statistic
              title="用户总数"
              value={stats?.userCount || 0}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="在线用户"
              value={stats?.onlineCount || 0}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="群组总数"
              value={stats?.groupCount || 0}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="消息总数"
              value={stats?.messageCount || 0}
              prefix={<MessageOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="文件总数"
              value={stats?.fileCount || 0}
              prefix={<FileOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 用户和群组管理 */}
      <Tabs
        items={[
          {
            key: 'users',
            label: '用户管理',
            children: (
              <Card>
                <div style={{ marginBottom: 16 }}>
                  <Space>
                    <Button
                      type="primary"
                      icon={<UserAddOutlined />}
                      onClick={() => setAddUserModalVisible(true)}
                    >
                      添加用户
                    </Button>
                    <Search
                      placeholder="搜索用户名或昵称"
                      allowClear
                      style={{ width: 300 }}
                      onSearch={(value) => loadUsers(1, value)}
                      onChange={(e) => setUserKeyword(e.target.value)}
                    />
                    <Button icon={<ReloadOutlined />} onClick={() => loadUsers(userPage, userKeyword)}>
                      刷新
                    </Button>
                  </Space>
                </div>
                <Table
                  columns={userColumns}
                  dataSource={users}
                  rowKey="id"
                  loading={loading}
                  pagination={{
                    current: userPage,
                    pageSize,
                    total: userTotal,
                    onChange: (page) => loadUsers(page, userKeyword),
                  }}
                />
              </Card>
            ),
          },
          {
            key: 'groups',
            label: '群组管理',
            children: (
              <Card>
                <div style={{ marginBottom: 16 }}>
                  <Space>
                    <Search
                      placeholder="搜索群名"
                      allowClear
                      style={{ width: 300 }}
                      onSearch={(value) => loadGroups(1, value)}
                      onChange={(e) => setGroupKeyword(e.target.value)}
                    />
                    <Button icon={<ReloadOutlined />} onClick={() => loadGroups(groupPage, groupKeyword)}>
                      刷新
                    </Button>
                  </Space>
                </div>
                <Table
                  columns={groupColumns}
                  dataSource={groups}
                  rowKey="id"
                  loading={loading}
                  pagination={{
                    current: groupPage,
                    pageSize,
                    total: groupTotal,
                    onChange: (page) => loadGroups(page, groupKeyword),
                  }}
                />
              </Card>
            ),
          },
        ]}
      />

      {/* 添加用户弹窗 */}
      <Modal
        title="添加用户"
        open={addUserModalVisible}
        onCancel={() => {
          if (!addUserLoading) {
            setAddUserModalVisible(false);
            addUserForm.resetFields();
          }
        }}
        onOk={() => addUserForm.submit()}
        okText="创建"
        cancelText="取消"
        confirmLoading={addUserLoading}
        centered
      >
        <Form
          form={addUserForm}
          layout="vertical"
          onFinish={handleAddUser}
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 3, max: 20, message: '用户名长度 3-20 个字符' },
              { pattern: /^[a-zA-Z0-9_]+$/, message: '只能包含字母、数字和下划线' },
            ]}
          >
            <Input placeholder="请输入用户名" maxLength={20} autoFocus disabled={addUserLoading} />
          </Form.Item>
          <Form.Item
            name="password"
            label="密码"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, max: 50, message: '密码长度 6-50 个字符' },
            ]}
          >
            <Input.Password placeholder="请输入密码" maxLength={50} disabled={addUserLoading} />
          </Form.Item>
          <Form.Item
            name="nickname"
            label="昵称"
            rules={[{ max: 50, message: '昵称最多 50 个字符' }]}
          >
            <Input placeholder="不填则使用用户名" maxLength={50} disabled={addUserLoading} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Admin;