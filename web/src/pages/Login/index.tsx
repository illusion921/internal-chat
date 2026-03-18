import React, { useState, useEffect } from 'react';
import { Form, Input, Button, message, Modal, Tooltip } from 'antd';
import { UserOutlined, LockOutlined, SettingOutlined } from '@ant-design/icons';
import { useAuthStore } from '@stores/authStore';
import { authApi } from '@services/api';
import { connectSocket } from '@services/socket';
import { config, loadUserConfig, saveUserConfig } from '@/config';
import type { User } from '../../types/index';
import './Login.css';

interface LoginForm {
  username: string;
  password: string;
}

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [configVisible, setConfigVisible] = useState(false);
  const [serverUrl, setServerUrl] = useState('');
  const { setAuth } = useAuthStore();

  useEffect(() => {
    loadUserConfig();
    // 显示当前配置的服务器地址（去掉 /api 后缀）
    const baseUrl = config.apiBaseUrl || '';
    setServerUrl(baseUrl.replace(/\/api$/, ''));
  }, []);

  const handleSaveConfig = () => {
    let url = serverUrl.trim().replace(/\/$/, '');
    // 移除末尾的 /api 如果用户误输入了
    if (url.endsWith('/api')) {
      url = url.slice(0, -4);
    }
    
    // 验证 URL 格式
    if (url && !url.match(/^https?:\/\/.+/)) {
      message.error('服务器地址格式不正确，应以 http:// 或 https:// 开头');
      return;
    }
    
    saveUserConfig({
      apiBaseUrl: url ? `${url}/api` : '',
      wsUrl: url || '',
    });
    setConfigVisible(false);
    message.success('服务器地址已保存');
  };

  const onFinish = async (values: LoginForm) => {
    setLoading(true);
    try {
      const response: any = await authApi.login(values.username, values.password);
      
      if (response.code === 0) {
        const { accessToken, refreshToken, user } = response.data;
        setAuth(user as User, accessToken, refreshToken);
        connectSocket();
        message.success('登录成功');
      } else {
        message.error(response.message || '登录失败');
      }
    } catch (error: any) {
      message.error(error?.message || '登录失败，请检查网络或服务器地址');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        {/* 服务器设置按钮 */}
        <div className="login-settings">
          <Tooltip title="服务器设置">
            <Button
              type="text"
              icon={<SettingOutlined />}
              onClick={() => setConfigVisible(true)}
            />
          </Tooltip>
        </div>

        {/* Logo区域 */}
        <div className="login-header">
          <div className="login-logo">
            <span className="logo-icon">💬</span>
          </div>
          <h1 className="login-title">内网聊天系统</h1>
          <p className="login-subtitle">企业级即时通讯平台</p>
        </div>

        {/* 登录表单 */}
        <Form
          name="login"
          onFinish={onFinish}
          autoComplete="off"
          className="login-form"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#999' }} />}
              placeholder="用户名"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#999' }} />}
              placeholder="密码"
              size="large"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
              className="login-btn"
            >
              登录
            </Button>
          </Form.Item>
        </Form>

        {/* 底部信息 */}
        <div className="login-footer">
          <p>企业内部通讯系统 · 安全可靠</p>
        </div>
      </div>

      {/* 服务器设置弹窗 */}
      <Modal
        title="服务器设置"
        open={configVisible}
        onOk={handleSaveConfig}
        onCancel={() => setConfigVisible(false)}
        okText="保存"
        cancelText="取消"
      >
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 8 }}>服务器地址：</label>
          <Input
            placeholder="http://192.168.1.39:3002"
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
          />
          <div style={{ color: '#999', fontSize: 12, marginTop: 8 }}>
            请输入服务器地址，例如：http://192.168.1.39:3002（无需添加 /api）
          </div>
          <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
            留空则使用默认配置（通过代理访问）
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Login;