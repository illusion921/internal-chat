import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, message } from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import { config, saveUserConfig } from '@src/config';

interface SettingsProps {
  visible: boolean;
  onClose: () => void;
}

const Settings: React.FC<SettingsProps> = ({ visible, onClose }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      form.setFieldsValue({
        apiBaseUrl: config.apiBaseUrl,
        wsUrl: config.wsUrl,
      });
    }
  }, [visible, form]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      
      saveUserConfig({
        apiBaseUrl: values.apiBaseUrl,
        wsUrl: values.wsUrl,
      });
      
      message.success('设置已保存，重启应用后生效');
      onClose();
    } catch (error) {
      console.error('Validation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <span>
          <SettingOutlined style={{ marginRight: 8 }} />
          服务器设置
        </span>
      }
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button key="save" type="primary" loading={loading} onClick={handleSave}>
          保存
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="apiBaseUrl"
          label="API 服务器地址"
          rules={[{ required: true, message: '请输入 API 服务器地址' }]}
        >
          <Input placeholder="http://localhost:3001/api" />
        </Form.Item>
        
        <Form.Item
          name="wsUrl"
          label="WebSocket 服务器地址"
          rules={[{ required: true, message: '请输入 WebSocket 服务器地址' }]}
        >
          <Input placeholder="ws://localhost:3001" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default Settings;