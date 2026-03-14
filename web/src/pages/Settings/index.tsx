import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Avatar, Button, Upload, message, List, Tag, Popconfirm, Empty, Spin } from 'antd';
import { UserOutlined, UploadOutlined, DesktopOutlined, MobileOutlined, TabletOutlined, DeleteOutlined } from '@ant-design/icons';
import { useAuthStore } from '@stores/authStore';
import { authApi, userApi } from '@services/api';
import axios from 'axios';

interface SettingsProps {
  visible: boolean;
  onClose: () => void;
}

interface Session {
  sessionId: string;
  userId: string;
  deviceInfo: string;
  ipAddress: string;
  createdAt: number;
  lastActivityAt: number;
}

// 设备图标
const getDeviceIcon = (deviceInfo: string) => {
  if (deviceInfo.includes('桌面') || deviceInfo.includes('Electron')) {
    return <DesktopOutlined />;
  }
  if (deviceInfo.includes('手机') || deviceInfo.includes('Mobile')) {
    return <MobileOutlined />;
  }
  if (deviceInfo.includes('平板') || deviceInfo.includes('Tablet')) {
    return <TabletOutlined />;
  }
  return <DesktopOutlined />;
};

// 格式化时间
const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const Settings: React.FC<SettingsProps> = ({ visible, onClose }) => {
  const { user, updateUser, logout, accessToken } = useAuthStore();
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'devices'>('profile');

  // 加载会话列表
  const loadSessions = async () => {
    setSessionsLoading(true);
    try {
      const response = await axios.get('/api/auth/sessions', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (response.data.code === 0) {
        setSessions(response.data.data || []);
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setSessionsLoading(false);
    }
  };

  // 踢出会话
  const handleKickSession = async (sessionId: string) => {
    try {
      const response = await axios.delete(`/api/auth/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (response.data.code === 0) {
        message.success('已踢出该设备');
        loadSessions();
      }
    } catch (error) {
      message.error('操作失败');
    }
  };

  // 踢出所有其他设备
  const handleKickOthers = async () => {
    try {
      const response = await axios.post('/api/auth/sessions/kick-others', {}, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (response.data.code === 0) {
        message.success('已踢出所有其他设备');
        loadSessions();
      }
    } catch (error) {
      message.error('操作失败');
    }
  };

  useEffect(() => {
    if (visible && activeTab === 'devices') {
      loadSessions();
    }
  }, [visible, activeTab]);

  const handleUpdateProfile = async (values: any) => {
    try {
      const response: any = await userApi.updateProfile(values);
      if (response.code === 0) {
        updateUser(response.data);
        message.success('更新成功');
      }
    } catch (error) {
      message.error('更新失败');
    }
  };

  const handleChangePassword = async (values: any) => {
    try {
      const response: any = await authApi.changePassword(values.oldPassword, values.newPassword);
      if (response.code === 0) {
        message.success('密码修改成功，请重新登录');
        passwordForm.resetFields();
        logout();
        onClose();
      }
    } catch (error: any) {
      message.error(error?.message || '密码修改失败');
    }
  };

  const handleUploadAvatar = async (file: File) => {
    try {
      const response: any = await userApi.uploadAvatar(file);
      if (response.code === 0) {
        updateUser({ avatar: response.data.avatar });
        message.success('头像更新成功');
      }
    } catch (error) {
      message.error('头像上传失败');
    }
    return false;
  };

  return (
    <Modal
      title="设置"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={550}
    >
      {/* 标签页切换 */}
      <div style={{ display: 'flex', borderBottom: '1px solid #f0f0f0', marginBottom: 20 }}>
        <div
          onClick={() => setActiveTab('profile')}
          style={{
            padding: '12px 20px',
            cursor: 'pointer',
            borderBottom: activeTab === 'profile' ? '2px solid #07c160' : 'none',
            color: activeTab === 'profile' ? '#07c160' : '#666',
            fontWeight: activeTab === 'profile' ? 500 : 400,
          }}
        >
          个人资料
        </div>
        <div
          onClick={() => setActiveTab('password')}
          style={{
            padding: '12px 20px',
            cursor: 'pointer',
            borderBottom: activeTab === 'password' ? '2px solid #07c160' : 'none',
            color: activeTab === 'password' ? '#07c160' : '#666',
            fontWeight: activeTab === 'password' ? 500 : 400,
          }}
        >
          修改密码
        </div>
        <div
          onClick={() => setActiveTab('devices')}
          style={{
            padding: '12px 20px',
            cursor: 'pointer',
            borderBottom: activeTab === 'devices' ? '2px solid #07c160' : 'none',
            color: activeTab === 'devices' ? '#07c160' : '#666',
            fontWeight: activeTab === 'devices' ? 500 : 400,
          }}
        >
          登录设备
        </div>
      </div>

      {/* 个人资料 */}
      {activeTab === 'profile' && (
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            nickname: user?.nickname,
            signature: user?.signature,
          }}
          onFinish={handleUpdateProfile}
        >
          <Form.Item label="头像">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Avatar size={64} src={user?.avatar} icon={<UserOutlined />} />
              <Upload
                beforeUpload={handleUploadAvatar}
                showUploadList={false}
                accept="image/*"
              >
                <Button icon={<UploadOutlined />}>更换头像</Button>
              </Upload>
            </div>
          </Form.Item>

          <Form.Item
            name="nickname"
            label="昵称"
            rules={[{ required: true, message: '请输入昵称' }]}
          >
            <Input maxLength={50} />
          </Form.Item>

          <Form.Item name="signature" label="个性签名">
            <Input.TextArea maxLength={100} rows={2} />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit">
              保存
            </Button>
          </Form.Item>
        </Form>
      )}

      {/* 修改密码 */}
      {activeTab === 'password' && (
        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={handleChangePassword}
        >
          <Form.Item
            name="oldPassword"
            label="原密码"
            rules={[{ required: true, message: '请输入原密码' }]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码至少6位' },
            ]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="确认新密码"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: '请确认新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item>
            <Button type="primary" danger htmlType="submit">
              修改密码
            </Button>
          </Form.Item>
        </Form>
      )}

      {/* 登录设备 */}
      {activeTab === 'devices' && (
        <div>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#666' }}>
              已登录 {sessions.length} 个设备（最多5个，仅限同一网络）
            </span>
            {sessions.length > 1 && (
              <Popconfirm
                title="确定要踢出所有其他设备吗？"
                onConfirm={handleKickOthers}
                okText="确定"
                cancelText="取消"
              >
                <Button danger size="small">踢出其他设备</Button>
              </Popconfirm>
            )}
          </div>
          
          <div style={{ marginBottom: 16, padding: 12, background: '#fff7e6', borderRadius: 4, border: '1px solid #ffd591' }}>
            <span style={{ color: '#ad6800', fontSize: 13 }}>
              ⚠️ 安全提示：同一账号只能在同一网络（IP）下登录多个设备，从其他网络登录会自动踢出之前的设备。
            </span>
          </div>

          {sessionsLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Spin />
            </div>
          ) : sessions.length === 0 ? (
            <Empty description="暂无登录设备" />
          ) : (
            <List
              dataSource={sessions}
              renderItem={(session, index) => (
                <List.Item
                  actions={[
                    index === 0 ? (
                      <Tag color="green">当前设备</Tag>
                    ) : (
                      <Popconfirm
                        title="确定要踢出该设备吗？"
                        onConfirm={() => handleKickSession(session.sessionId)}
                        okText="确定"
                        cancelText="取消"
                      >
                        <Button type="link" danger size="small" icon={<DeleteOutlined />}>
                          踢出
                        </Button>
                      </Popconfirm>
                    ),
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <Avatar 
                        style={{ backgroundColor: index === 0 ? '#07c160' : '#999' }}
                        icon={getDeviceIcon(session.deviceInfo)}
                      />
                    }
                    title={
                      <span>
                        {session.deviceInfo}
                        {index === 0 && <Tag color="green" style={{ marginLeft: 8 }}>在线</Tag>}
                      </span>
                    }
                    description={
                      <div style={{ fontSize: 12, color: '#999' }}>
                        IP: {session.ipAddress} · 登录时间: {formatTime(session.createdAt)} · 
                        最后活动: {formatTime(session.lastActivityAt)}
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </div>
      )}
    </Modal>
  );
};

export default Settings;