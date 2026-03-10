import React from 'react';
import { Modal, Form, Input, Avatar, Button, Upload, message } from 'antd';
import { UserOutlined, UploadOutlined } from '@ant-design/icons';
import { useAuthStore } from '@stores/authStore';
import { authApi, userApi } from '@services/api';
import type { UploadFile } from 'antd/es/upload/interface';

interface SettingsProps {
  visible: boolean;
  onClose: () => void;
}

const Settings: React.FC<SettingsProps> = ({ visible, onClose }) => {
  const { user, updateUser, logout } = useAuthStore();
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();

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
      width={500}
    >
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

      <h4 style={{ marginTop: 24, marginBottom: 16 }}>修改密码</h4>
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
    </Modal>
  );
};

export default Settings;