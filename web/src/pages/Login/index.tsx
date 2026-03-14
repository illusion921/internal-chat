import React, { useState } from 'react';
import { Form, Input, Button, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuthStore } from '@stores/authStore';
import { authApi } from '@services/api';
import { connectSocket } from '@services/socket';
import type { User } from '../../types/index';
import './Login.css';

interface LoginForm {
  username: string;
  password: string;
}

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();

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
      message.error(error?.message || '登录失败，请检查网络');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
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
    </div>
  );
};

export default Login;